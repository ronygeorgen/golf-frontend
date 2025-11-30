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
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

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
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                            Welcome, {user?.first_name || user?.email}!
                        </h1>
                        <p className="text-text-secondary mt-2">Manage your bookings and profile</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {/* Tabs */}
                        <div className="bg-surface rounded-card shadow-card mb-6">
                            <div className="border-b border-border">
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
                                                    ? 'border-primary text-primary bg-primary/5'
                                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border hover:bg-background'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {tab.label}
                                                {tab.pending > 0 && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-pending-text bg-status-pending-bg border border-status-pending-text/20 rounded-full px-2 py-0.5">
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
                        <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                                <h2 className="text-xl font-bold text-text-primary">Upcoming Bookings</h2>
                                <div className="inline-flex rounded-full border border-border bg-surface shadow-sm text-xs font-medium">
                                    {['all', 'simulator', 'coaching'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setBookingType(type);
                                                setPage(1);
                                            }}
                                            className={`px-3 py-1 rounded-full transition ${
                                                bookingType === type
                                                    ? 'bg-primary/10 text-primary border border-primary'
                                                    : 'text-text-secondary hover:bg-background'
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
                                        <div key={booking.id} className="border border-border rounded-card p-4 hover:shadow-card-hover transition duration-200 bg-surface">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-text-primary">
                                                        {booking.booking_type === 'simulator' ? 'Simulator Session' : 'Coaching Session'}
                                                    </h3>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-sm text-text-secondary">
                                                            <span className="font-medium">Date:</span> {new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <p className="text-sm text-text-secondary">
                                                            <span className="font-medium">Start:</span> {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-text-secondary">
                                                            <span className="font-medium">End:</span> {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </p>
                                                        <p className="text-sm text-text-secondary">
                                                            <span className="font-medium">Duration:</span> {booking.duration_minutes >= 60 ? `${Math.floor(booking.duration_minutes / 60)}h ${booking.duration_minutes % 60 > 0 ? booking.duration_minutes % 60 + 'min' : ''}`.trim() : `${booking.duration_minutes}min`}
                                                        </p>
                                                        {booking.booking_type === 'simulator' && booking.simulator_details && (
                                                            <p className="text-sm text-text-secondary">
                                                                <span className="font-medium">Bay:</span> {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                            </p>
                                                        )}
                                                        <p className="text-sm text-text-secondary">
                                                            <span className="font-medium">Price:</span>{' '}
                                                            {booking.booking_type === 'simulator' && booking.uses_simulator_credit
                                                                ? 'Covered by simulator credit'
                                                                : formatCurrency(booking.total_price ?? booking.coaching_session_price) || '—'
                                                            }
                                                        </p>
                                                        {booking.booking_type === 'simulator' && booking.uses_simulator_credit && (
                                                            <p className="text-xs text-status-personal-text font-semibold">
                                                                Simulator credit applied
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.coach_details && (
                                                            <p className="text-sm text-text-secondary">
                                                                <span className="font-medium">Coach:</span> {booking.coach_details.first_name} {booking.coach_details.last_name}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.package_details && (
                                                            <p className="text-sm text-text-secondary">
                                                                <span className="font-medium">Package:</span> {booking.package_details.title}
                                                            </p>
                                                        )}
                                                        {booking.booking_type === 'coaching' && booking.package_purchase_details && (
                                                            <div className="space-y-1">
                                                                <p className="text-sm text-text-secondary">
                                                                    <span className="font-medium">Purchase Name:</span> {booking.package_purchase_details.purchase_name || booking.package_details?.title || 'N/A'}
                                                                </p>
                                                                {booking.purchase_type_label && (
                                                                    <p className="text-sm">
                                                                        <Badge status={
                                                                            booking.purchase_type_label === 'Personal' ? 'personal' :
                                                                            booking.purchase_type_label === 'Gifted' ? 'pending' :
                                                                            booking.purchase_type_label === 'Organization' ? 'confirmed' :
                                                                            'pending'
                                                                        }>
                                                                            {booking.purchase_type_label}
                                                                        </Badge>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2 w-40">
                                                    <Badge status={
                                                        booking.status === 'confirmed' ? 'confirmed' :
                                                        booking.status === 'pending' ? 'pending' :
                                                        booking.status === 'completed' ? 'completed' :
                                                        'no_show'
                                                    }>
                                                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                    </Badge>
                                                    {booking.status === 'confirmed' && (
                                                        <div className="flex flex-col gap-2 w-full">
                                                            <Button
                                                                type="button"
                                                                onClick={() => openRescheduleModal(booking)}
                                                                disabled={!rescheduleAllowed}
                                                                variant="secondary"
                                                                className="text-sm px-3 py-1"
                                                            >
                                                                Change Time
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleCancelBooking(booking)}
                                                                disabled={!canCancelBooking(booking) || cancellingId === booking.id}
                                                                variant="danger"
                                                                className="text-sm px-3 py-1"
                                                            >
                                                                {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {!canCancelBooking(booking) && booking.status === 'confirmed' && (
                                                <p className="mt-2 text-xs text-danger">
                                                    Starts in less than 24 hours. Contact an admin to make changes.
                                                </p>
                                            )}
                                            {booking.booking_type === 'coaching' ? (
                                                <p className="mt-2 text-xs text-text-secondary">
                                                    Cancel ≥24 hrs in advance to restore this session to your package.
                                                </p>
                                            ) : (
                                                <p className="mt-2 text-xs text-text-secondary">
                                                    Cancel ≥24 hrs in advance to receive a simulator credit.
                                                </p>
                                            )}
                                        </div>
                                    );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary">No upcoming bookings</p>
                                </div>
                            )}
                            {!loading && (
                                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6">
                                    <p className="text-sm text-text-secondary">
                                        Showing{' '}
                                        {totalCount === 0
                                            ? '0'
                                            : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalCount)}`} of {totalCount} bookings
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                            disabled={page <= 1}
                                            variant="secondary"
                                            className="px-3 py-1"
                                        >
                                            Previous
                                        </Button>
                                    <span className="text-sm font-medium text-text-primary">
                                        Page {page} of {totalPages}
                                    </span>
                                        <Button
                                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={page >= totalPages}
                                            variant="secondary"
                                            className="px-3 py-1"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {activeTab === 'gifts' && (
                            <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                                <GiftClaim />
                            </div>
                        )}

                        {activeTab === 'transfers' && (
                            <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                                <TransferClaim />
                            </div>
                        )}

                        {activeTab === 'send-transfer' && (
                            <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                                <SessionTransfer />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6 space-y-4">
                            <h2 className="text-xl font-bold text-text-primary mb-4">Quick Actions</h2>
                            <div className="space-y-2">
                                <Button
                                    onClick={() => navigate('/booking')}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Book New Session
                                </Button>
                                <Button
                                    onClick={() => navigate('/calendar')}
                                    variant="primary"
                                    className="w-full"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <span>View My Calendar</span>
                                    </div>
                                </Button>
                            </div>
                            <div className="bg-background border border-border rounded-card p-4 text-sm text-text-primary">
                                <p className="font-semibold text-text-primary mb-1">Simulator credits</p>
                                <p>
                                    You currently have <span className="font-bold">{availableSimCredits}</span> credit{availableSimCredits === 1 ? '' : 's'} available.
                                </p>
                                <p className="mt-1 text-text-secondary">
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
                    <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                            Change {rescheduleTarget.booking_type === 'simulator' ? 'Simulator' : 'Coaching'} Booking Time
                        </h3>
                        <p className="text-sm text-text-secondary mb-4">
                            Select a new start time before the 24-hour lock window. Existing session duration will remain the same.
                        </p>
                        <form className="space-y-4" onSubmit={handleRescheduleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">New Date</label>
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">New Start Time</label>
                                    <input
                                        type="time"
                                        value={rescheduleTime}
                                        onChange={(e) => setRescheduleTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            {rescheduleError && (
                                <div className="text-sm text-danger bg-red-50 border border-danger/20 rounded-card p-3">
                                    {rescheduleError}
                                </div>
                            )}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button
                                    type="button"
                                    onClick={closeRescheduleModal}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={rescheduleLoading}
                                    variant="primary"
                                >
                                    {rescheduleLoading ? 'Updating...' : 'Confirm New Time'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClientPortal;

