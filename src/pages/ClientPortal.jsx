import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getUpcomingBookings, cancelBooking, getSimulatorCredits, rescheduleBooking } from '../store/slices/bookingSlice';
import { useNavigate } from 'react-router-dom';
import { BookingCardSkeleton } from '../components/skeletons/SkeletonLoader';
import PopupMessage from '../components/PopupMessage';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import SessionTransfer from '../components/SessionTransfer';
import { getGiftsPending, getTransfersPending } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';

function ClientPortal() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { upcomingBookings, loading, simulatorCredits, upcomingPagination } = useAppSelector((state) => state.booking);
    const { giftsPending, transfersPending } = useAppSelector((state) => state.coaching);
    const { popup, openPopup, closePopup } = usePopup();
    const [cancellingId, setCancellingId] = useState(null);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [rescheduleError, setRescheduleError] = useState(null);
    const [bookingType, setBookingType] = useState('all');
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState('bookings');
    const availableSimCredits = simulatorCredits?.length || 0;
    const totalPages = upcomingPagination?.totalPages || 1;
    const pageSize = upcomingPagination?.pageSize || 5; // 5 items per page for upcoming bookings
    const totalCount = upcomingPagination?.count ?? upcomingBookings.length;

    useEffect(() => {
        dispatch(getUpcomingBookings({ page, bookingType }));
    }, [dispatch, page, bookingType]);

    useEffect(() => {
        dispatch(getSimulatorCredits());
    }, [dispatch]);

    useEffect(() => {
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
    }, [dispatch]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages]);

    const canCancelBooking = (booking) => {
        if (booking.status !== 'confirmed') return false;
        const now = new Date();
        const start = new Date(booking.start_time);
        const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil >= 24;
    };

    const handleCancelBooking = async (booking) => {
        const message = booking.booking_type === 'coaching'
            ? 'Cancelling will add this coaching session back to your package.'
            : 'Cancelling will issue a simulator credit so you can rebook later.';

        openPopup({
            type: 'warning',
            title: 'Cancel booking?',
            message: `Cancel this ${booking.booking_type} booking?\n\n${message}`,
            confirmText: 'Yes, cancel it',
            cancelText: 'Keep booking',
            showCancel: true,
            onConfirm: async () => {
                await processCancellation(booking);
            },
        });
    };

    const processCancellation = async (booking) => {
        setCancellingId(booking.id);
        const result = await dispatch(cancelBooking({ bookingId: booking.id }));
        setCancellingId(null);

        if (cancelBooking.fulfilled.match(result)) {
            dispatch(getUpcomingBookings({ page, bookingType }));
            if (booking.booking_type === 'simulator') {
                dispatch(getSimulatorCredits());
            }
            openPopup({
                type: 'success',
                title: 'Booking cancelled',
                message: result.payload?.message || 'Booking cancelled successfully.',
            });
        } else {
            openPopup({
                type: 'error',
                title: 'Cancellation failed',
                message: result.payload?.error || result.payload?.detail || 'Unable to cancel booking.',
            });
        }
    };

    const formatCurrency = (value) => {
        if (value === undefined || value === null) {
            return null;
        }
        const numberValue = Number(value);
        if (Number.isNaN(numberValue)) {
            return null;
        }
        return `$${numberValue.toFixed(2)}`;
    };

    const formatDateForInput = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatTimeForInput = (dateObj) => {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const openRescheduleModal = (booking) => {
        const start = new Date(booking.start_time);
        setRescheduleTarget(booking);
        setRescheduleDate(formatDateForInput(start));
        setRescheduleTime(formatTimeForInput(start));
        setRescheduleError(null);
    };

    const closeRescheduleModal = () => {
        setRescheduleTarget(null);
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleError(null);
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) {
            setRescheduleError('Please select a new date and time.');
            return;
        }

        const newStart = new Date(`${rescheduleDate}T${rescheduleTime}`);
        if (Number.isNaN(newStart.getTime())) {
            setRescheduleError('Invalid date or time selected.');
            return;
        }
        const newEnd = new Date(newStart.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);

        const payload = {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            duration_minutes: rescheduleTarget.duration_minutes,
        };

        if (rescheduleTarget.booking_type === 'coaching') {
            payload.coaching_package = rescheduleTarget.coaching_package;
            if (rescheduleTarget.coach) {
                payload.coach = rescheduleTarget.coach;
            }
        } else if (rescheduleTarget.booking_type === 'simulator' && rescheduleTarget.simulator) {
            payload.simulator = rescheduleTarget.simulator;
        }

        setRescheduleLoading(true);
        const result = await dispatch(rescheduleBooking({ bookingId: rescheduleTarget.id, payload }));
        setRescheduleLoading(false);

        if (rescheduleBooking.fulfilled.match(result)) {
            dispatch(getUpcomingBookings({ page, bookingType }));
            openPopup({
                type: 'success',
                title: 'Booking rescheduled',
                message: result.payload?.message || 'Booking rescheduled successfully.',
            });
            closeRescheduleModal();
        } else {
            const errorMessage = result.payload?.error || result.payload?.detail || 'Unable to reschedule booking.';
            setRescheduleError(errorMessage);
            openPopup({
                type: 'error',
                title: 'Reschedule failed',
                message: errorMessage,
            });
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Welcome, {user?.first_name || user?.email}!
                        </h1>
                        <p className="text-gray-600 mt-2">Manage your bookings and profile</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-md mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="flex -mb-px">
                                    {[
                                        { id: 'bookings', label: 'Bookings' },
                                        { id: 'gifts', label: 'Gifts', pending: giftsPending?.length || 0 },
                                        { id: 'transfers', label: 'Transfers', pending: transfersPending?.length || 0 },
                                        { id: 'send-transfer', label: 'Send Transfer' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                                                activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {tab.label}
                                                {tab.pending > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                                                        <svg
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 8v4l2.5 2.5M12 22a10 10 0 100-20 10 10 0 000 20z"
                                                            />
                                                        </svg>
                                                        {tab.pending}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {activeTab === 'bookings' && (
                        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Upcoming Bookings</h2>
                                <div className="inline-flex rounded-full border border-gray-300 bg-white shadow-sm text-xs font-medium">
                                    {['all', 'simulator', 'coaching'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setBookingType(type);
                                                setPage(1);
                                            }}
                                            className={`px-3 py-1 rounded-full transition ${
                                                bookingType === type
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {loading ? (
                                <BookingCardSkeleton count={3} />
                            ) : upcomingBookings.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingBookings.map(booking => {
                                        const rescheduleAllowed = booking.status === 'confirmed' && canCancelBooking(booking);
                                        return (
                                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {booking.booking_type === 'simulator' ? 'Simulator Session' : 'Coaching Session'}
                                                    </h3>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Date:</span> {new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">Start:</span> {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            <span className="font-medium">End:</span> {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">Duration:</span> {booking.duration_minutes >= 60 ? `${Math.floor(booking.duration_minutes / 60)}h ${booking.duration_minutes % 60 > 0 ? booking.duration_minutes % 60 + 'min' : ''}`.trim() : `${booking.duration_minutes}min`}
                                                        </p>
                                                        {booking.booking_type === 'simulator' && booking.simulator_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Bay:</span> {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-gray-500">
                                                            <span className="font-medium">Price:</span>{' '}
                                                            {booking.booking_type === 'simulator' && booking.uses_simulator_credit
                                                                ? 'Covered by simulator credit'
                                                                : formatCurrency(booking.total_price ?? booking.coaching_session_price) || '—'
                                                            }
                                                        </p>
                                                        {booking.booking_type === 'simulator' && booking.uses_simulator_credit && (
                                                            <p className="text-xs text-purple-700 font-semibold">
                                                                Simulator credit applied
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.coach_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Coach:</span> {booking.coach_details.first_name} {booking.coach_details.last_name}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.package_details && (
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-medium">Package:</span> {booking.package_details.title}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.package_purchase_details && (
                                                            <div className="space-y-1">
                                                                <p className="text-sm text-gray-500">
                                                                    <span className="font-medium">Purchase Name:</span> {booking.package_purchase_details.purchase_name || booking.package_details?.title || 'N/A'}
                                                                </p>
                                                                {booking.purchase_type_label && (
                                                                    <p className="text-sm">
                                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                                                            booking.purchase_type_label === 'Personal' ? 'bg-blue-100 text-blue-800' :
                                                                            booking.purchase_type_label === 'Gifted' ? 'bg-purple-100 text-purple-800' :
                                                                            booking.purchase_type_label === 'Organization' ? 'bg-green-100 text-green-800' :
                                                                            booking.purchase_type_label === 'Transferred' ? 'bg-orange-100 text-orange-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                            {booking.purchase_type_label}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 w-40">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    booking.status === 'confirmed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : booking.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : booking.status === 'completed'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                    </span>
                                                    {booking.status === 'confirmed' && (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <button
                                                                type="button"
                                                                onClick={() => openRescheduleModal(booking)}
                                                                disabled={!rescheduleAllowed}
                                                                className={`text-sm font-semibold px-3 py-1 border rounded-lg transition ${
                                                                    rescheduleAllowed
                                                                        ? 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                                                        : 'text-gray-400 border-gray-200 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                Change Time
                                                            </button>
                                                            <button
                                                                onClick={() => handleCancelBooking(booking)}
                                                                disabled={!canCancelBooking(booking) || cancellingId === booking.id}
                                                                className={`text-sm font-semibold px-3 py-1 border rounded-lg transition ${
                                                                    canCancelBooking(booking)
                                                                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                                                                        : 'text-gray-400 border-gray-200 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {!canCancelBooking(booking) && booking.status === 'confirmed' && (
                                                <p className="mt-2 text-xs text-red-600">
                                                    Starts in less than 24 hours. Contact an admin to make changes.
                                                </p>
                                            )}
                                            {booking.booking_type === 'coaching' ? (
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Cancel ≥24 hrs in advance to restore this session to your package.
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Cancel ≥24 hrs in advance to receive a simulator credit.
                                                </p>
                                            )}
                                        </div>
                                    );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No upcoming bookings</p>
                                </div>
                            )}
                            {!loading && (
                                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6">
                                    <p className="text-sm text-gray-600">
                                        Showing{' '}
                                        {totalCount === 0
                                            ? '0'
                                            : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalCount)}`} of {totalCount} bookings
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                            disabled={page <= 1}
                                            className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Previous
                                        </button>
                                    <span className="text-sm font-medium text-gray-700">
                                        Page {page} of {totalPages}
                                    </span>
                                        <button
                                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={page >= totalPages}
                                            className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {activeTab === 'gifts' && (
                            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                                <GiftClaim />
                            </div>
                        )}

                        {activeTab === 'transfers' && (
                            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                                <TransferClaim />
                            </div>
                        )}

                        {activeTab === 'send-transfer' && (
                            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                                <SessionTransfer />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-2">
                                <button
                                    onClick={() => navigate('/booking')}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                >
                                    Book New Session
                                </button>
                                <button
                                    onClick={() => navigate('/calendar')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>View My Calendar</span>
                                    </div>
                                </button>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                                <p className="font-semibold text-gray-900 mb-1">Simulator credits</p>
                                <p>
                                    You currently have <span className="font-bold">{availableSimCredits}</span> credit{availableSimCredits === 1 ? '' : 's'} available.
                                </p>
                                <p className="mt-1 text-gray-500">
                                    Credits are issued when you cancel simulator bookings at least 24 hours ahead.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => {
                    const action = popup.onConfirm;
                    closePopup();
                    if (action) {
                        await action();
                    }
                } : closePopup}
                onClose={closePopup}
            />
            {rescheduleTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Change {rescheduleTarget.booking_type === 'simulator' ? 'Simulator' : 'Coaching'} Booking Time
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Select a new start time before the 24-hour lock window. Existing session duration will remain the same.
                        </p>
                        <form className="space-y-4" onSubmit={handleRescheduleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Start Time</label>
                                    <input
                                        type="time"
                                        value={rescheduleTime}
                                        onChange={(e) => setRescheduleTime(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                            {rescheduleError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                                    {rescheduleError}
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeRescheduleModal}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={rescheduleLoading}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                                >
                                    {rescheduleLoading ? 'Updating...' : 'Confirm New Time'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientPortal;

