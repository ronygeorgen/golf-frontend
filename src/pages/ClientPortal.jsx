import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getUpcomingBookings, cancelBooking, getSimulatorCredits, rescheduleBooking, checkCoachingAvailability, checkSimulatorAvailability, clearAvailability, checkClosedDate } from '../store/slices/bookingSlice';
import { useNavigate } from 'react-router-dom';
import { BookingCardSkeleton, PackagesSkeleton } from '../components/skeletons/SkeletonLoader';
import PopupMessage from '../components/PopupMessage';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import SessionTransfer from '../components/SessionTransfer';
import { getGiftsPending, getTransfersPending, getMyPackagePurchases, getMySimulatorPurchases, getOrganizationPackages, getActiveCoachingPackages } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function ClientPortal() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { upcomingBookings, loading, simulatorCredits, upcomingPagination, availability, loading: bookingLoading } = useAppSelector((state) => state.booking);
    const { giftsPending, transfersPending, purchases, simulatorPurchases, organizationPackages, packages, purchasesLoading, simulatorPurchasesLoading, organizationPackagesLoading } = useAppSelector((state) => state.coaching);
    const { popup, openPopup, closePopup } = usePopup();
    const [cancellingId, setCancellingId] = useState(null);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [rescheduleError, setRescheduleError] = useState(null);
    const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState(null);
    const [rescheduleCheckingAvailability, setRescheduleCheckingAvailability] = useState(false);
    const [bookingType, setBookingType] = useState('all');
    const [page, setPage] = useState(1);
    const [activeTab, setActiveTab] = useState('bookings');
    // Calculate total hours from all available simulator credits
    const availableSimCredits = simulatorCredits?.reduce((total, credit) => {
        const hours = parseFloat(credit.hours_remaining) || 0;
        return total + hours;
    }, 0) || 0;
    const totalPages = upcomingPagination?.totalPages || 1;
    const pageSize = upcomingPagination?.pageSize || 5; // 5 items per page for upcoming bookings
    const totalCount = upcomingPagination?.count ?? upcomingBookings.length;

    // Group personal/transferred/gifted purchases by package
    const personalSessionsByPackage = purchases
        .filter((purchase) => purchase.purchase_type !== 'organization')
        .reduce((acc, purchase) => {
            const packageId = purchase.package;
            if (!acc[packageId]) {
                acc[packageId] = {
                    packageId,
                    packageTitle: purchase.package_details?.title || 'Unknown Package',
                    sessionsRemaining: 0,
                    simulatorHoursRemaining: 0
                };
            }
            acc[packageId].sessionsRemaining += purchase.sessions_remaining || 0;
            acc[packageId].simulatorHoursRemaining += parseFloat(purchase.simulator_hours_remaining) || 0;
            return acc;
        }, {});

    // Group organization packages by package (where user is a member)
    const groupSessionsByPackage = organizationPackages
        .reduce((acc, purchase) => {
            const packageId = purchase.package;
            if (!acc[packageId]) {
                acc[packageId] = {
                    packageId,
                    packageTitle: purchase.package_details?.title || 'Unknown Package',
                    sessionsRemaining: 0
                };
            }
            acc[packageId].sessionsRemaining += purchase.sessions_remaining || 0;
            return acc;
        }, {});

    // Convert to arrays and sort by package title
    const personalPackagesList = Object.values(personalSessionsByPackage)
        .filter(pkg => pkg.sessionsRemaining > 0)
        .sort((a, b) => a.packageTitle.localeCompare(b.packageTitle));

    const groupPackagesList = Object.values(groupSessionsByPackage)
        .filter(pkg => pkg.sessionsRemaining > 0)
        .sort((a, b) => a.packageTitle.localeCompare(b.packageTitle));

    // Group simulator-only packages by package
    const simulatorPackagesByPackage = (simulatorPurchases || [])
        .filter((purchase) => purchase.package_status === 'active' && purchase.hours_remaining > 0)
        .reduce((acc, purchase) => {
            const packageId = purchase.package;
            if (!acc[packageId]) {
                acc[packageId] = {
                    packageId,
                    packageTitle: purchase.package_details?.title || 'Unknown Package',
                    hoursRemaining: 0
                };
            }
            acc[packageId].hoursRemaining += parseFloat(purchase.hours_remaining) || 0;
            return acc;
        }, {});

    // Convert to array and sort by package title
    const simulatorPackagesList = Object.values(simulatorPackagesByPackage)
        .filter(pkg => pkg.hoursRemaining > 0)
        .sort((a, b) => a.packageTitle.localeCompare(b.packageTitle));

    useEffect(() => {
        dispatch(getUpcomingBookings({ page, bookingType }));
    }, [dispatch, page, bookingType]);

    // Filter bookings client-side as a safety measure (backend should already filter, but this ensures consistency)
    // This prevents showing wrong booking types if there's a race condition or caching issue
    const filteredBookings = useMemo(() => {
        if (!upcomingBookings || upcomingBookings.length === 0) {
            return [];
        }
        if (bookingType === 'all') {
            return upcomingBookings;
        }
        // Filter by booking type and ensure we only show bookings that match
        return upcomingBookings.filter(booking => {
            return booking && booking.booking_type === bookingType;
        });
    }, [upcomingBookings, bookingType]);

    useEffect(() => {
        dispatch(getSimulatorCredits());
    }, [dispatch]);

    useEffect(() => {
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
        dispatch(getMyPackagePurchases({ page: 1 }));
        dispatch(getMySimulatorPurchases({ page: 1 }));
        dispatch(getOrganizationPackages());
        dispatch(getActiveCoachingPackages());
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

            // Refresh package data to update session counts
            dispatch(getMyPackagePurchases({ page: 1 }));
            dispatch(getOrganizationPackages());
            dispatch(getMySimulatorPurchases({ page: 1 }));

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
        setRescheduleSelectedSlot(null);
        dispatch(clearAvailability());
    };

    const closeRescheduleModal = () => {
        setRescheduleTarget(null);
        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleError(null);
        setRescheduleSelectedSlot(null);
        dispatch(clearAvailability());
    };

    const checkRescheduleAvailability = useCallback(async () => {
        if (!rescheduleTarget || !rescheduleDate) {
            setRescheduleError('Please select a date first.');
            return;
        }

        setRescheduleCheckingAvailability(true);
        setRescheduleError(null);
        setRescheduleSelectedSlot(null);
        dispatch(clearAvailability());

        try {
            // First check if the date is closed
            const closedDateResult = await dispatch(checkClosedDate(rescheduleDate)).unwrap();
            if (closedDateResult.is_closed) {
                setRescheduleError(`This date is closed: ${closedDateResult.closure_title || 'Closed for maintenance/holiday'}`);
                setRescheduleCheckingAvailability(false);
                return;
            }

            if (rescheduleTarget.booking_type === 'coaching') {
                const result = await dispatch(checkCoachingAvailability({
                    date: rescheduleDate,
                    packageId: rescheduleTarget.coaching_package,
                    coachId: rescheduleTarget.coach,
                    duration: rescheduleTarget.duration_minutes || 60
                }));

                if (checkCoachingAvailability.fulfilled.match(result)) {
                    const payload = result.payload || {};
                    const slots = payload.slots || [];
                    // Show API message if available
                    if (payload.message) {
                        setRescheduleError(payload.message);
                    } else if (payload.error) {
                        setRescheduleError(payload.error);
                    } else if (slots.length === 0) {
                        setRescheduleError(payload.specialEventMessage || 'No available time slots found for the selected date. Please try a different date.');
                    } else if (payload.specialEventMessage) {
                        setRescheduleError(payload.specialEventMessage);
                    }
                } else {
                    // Handle rejected case
                    const errorMessage = result.payload?.error ||
                        result.payload?.message ||
                        result.payload?.detail ||
                        result.payload ||
                        'Failed to check availability';
                    setRescheduleError(typeof errorMessage === 'string' ? errorMessage : 'Failed to check availability');
                }
            } else if (rescheduleTarget.booking_type === 'simulator') {
                const result = await dispatch(checkSimulatorAvailability({
                    date: rescheduleDate,
                    duration: rescheduleTarget.duration_minutes || 60
                }));

                if (checkSimulatorAvailability.fulfilled.match(result)) {
                    const payload = result.payload || {};
                    const slots = payload.slots || [];
                    // Show API message if available
                    if (payload.message) {
                        setRescheduleError(payload.message);
                    } else if (payload.error) {
                        setRescheduleError(payload.error);
                    } else if (slots.length === 0) {
                        setRescheduleError(payload.specialEventMessage || 'No available time slots found for the selected date. Please try a different date.');
                    } else if (payload.specialEventMessage) {
                        setRescheduleError(payload.specialEventMessage);
                    }
                } else {
                    // Handle rejected case
                    const errorMessage = result.payload?.error ||
                        result.payload?.message ||
                        result.payload?.detail ||
                        result.payload ||
                        'Failed to check availability';
                    setRescheduleError(typeof errorMessage === 'string' ? errorMessage : 'Failed to check availability');
                }
            }
        } catch (error) {
            setRescheduleError('Failed to check availability. Please try again.');
        } finally {
            setRescheduleCheckingAvailability(false);
        }
    }, [rescheduleTarget, rescheduleDate, dispatch]);

    const handleRescheduleSlotSelect = (slot) => {
        if (rescheduleTarget.booking_type === 'coaching') {
            // For coaching, check if slot is disabled
            const startTime = new Date(slot.start_time);
            const requestedEndTime = new Date(startTime.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);
            const maxAvailableEndTime = slot.availability_end_time
                ? new Date(slot.availability_end_time)
                : new Date(slot.end_time);

            if (requestedEndTime > maxAvailableEndTime) {
                return; // Don't allow selection of disabled slots
            }
        } else if (rescheduleTarget.booking_type === 'simulator') {
            // For simulator, check if slot is disabled
            const startTime = new Date(slot.start_time);
            const requestedEndTime = new Date(startTime.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);
            const maxAvailableEndTime = slot.availability_end_time
                ? new Date(slot.availability_end_time)
                : new Date(slot.end_time);

            if (requestedEndTime > maxAvailableEndTime) {
                return; // Don't allow selection of disabled slots
            }
        }

        // Check if this slot is already selected - if so, unselect it
        const isCurrentlySelected = rescheduleSelectedSlot && new Date(rescheduleSelectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
        if (isCurrentlySelected) {
            setRescheduleSelectedSlot(null);
            setRescheduleTime('');
            return;
        }

        // When user clicks a slot, calculate end_time based on booking duration
        const startTime = new Date(slot.start_time);
        const endTime = new Date(startTime.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);

        setRescheduleSelectedSlot({
            ...slot,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: rescheduleTarget.duration_minutes || 60
        });

        // Update the time input to match selected slot
        setRescheduleTime(formatTimeForInput(startTime));
    };

    const isRescheduleSlotDisabled = (slot) => {
        const startTime = new Date(slot.start_time);
        const requestedEndTime = new Date(startTime.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);
        const maxAvailableEndTime = slot.availability_end_time
            ? new Date(slot.availability_end_time)
            : new Date(slot.end_time);
        return requestedEndTime > maxAvailableEndTime;
    };

    // Auto-check availability when date changes
    useEffect(() => {
        if (rescheduleTarget && rescheduleDate) {
            // Debounce the availability check
            const timeoutId = setTimeout(() => {
                checkRescheduleAvailability();
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [rescheduleDate, rescheduleTarget, checkRescheduleAvailability]);

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!rescheduleTarget || !rescheduleDate) {
            setRescheduleError('Please select a new date.');
            return;
        }

        // Use selected slot if available, otherwise use manual time input
        let newStart, newEnd;
        if (rescheduleSelectedSlot) {
            newStart = new Date(rescheduleSelectedSlot.start_time);
            newEnd = new Date(rescheduleSelectedSlot.end_time);
        } else if (rescheduleTime) {
            newStart = new Date(`${rescheduleDate}T${rescheduleTime}`);
            if (Number.isNaN(newStart.getTime())) {
                setRescheduleError('Invalid date or time selected.');
                return;
            }
            newEnd = new Date(newStart.getTime() + (rescheduleTarget.duration_minutes || 60) * 60000);
        } else {
            setRescheduleError('Please select a time slot or enter a time.');
            return;
        }

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

    // Check if user is staff or admin
    const isStaffOrAdmin = user?.role === 'staff' || user?.role === 'admin' || user?.is_superuser;

    // Calculate min date
    // specific rule: clients/guests cannot book today (must book 24h ahead -> tomorrow)
    // Staff/Admins can book today
    const minDate = new Date();
    if (!isStaffOrAdmin) {
        minDate.setDate(minDate.getDate() + 1);
    }
    const minDateString = minDate.toISOString().split('T')[0];

    // Calculate max date (30 days from today)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateString = maxDate.toISOString().split('T')[0];

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
                                <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
                                    <div className="flex min-w-full md:min-w-0">
                                        {[
                                            { id: 'bookings', label: 'Bookings' },
                                            { id: 'gifts', label: 'Gifts', pending: giftsPending?.length || 0 },
                                            { id: 'transfers', label: 'Transfers', pending: transfersPending?.length || 0 },
                                            { id: 'send-transfer', label: 'Send Transfer' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`px-3 sm:px-4 md:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                                                    ? 'border-primary text-primary bg-primary/5'
                                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border hover:bg-background'
                                                    }`}
                                            >
                                                <span className="flex items-center gap-1 sm:gap-2">
                                                    {tab.label}
                                                    {tab.pending > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-pending-text bg-status-pending-bg border border-status-pending-text/20 rounded-full px-1.5 sm:px-2 py-0.5">
                                                            <svg
                                                                className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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
                                    </div>
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
                                                className={`px-3 py-1 rounded-full transition ${bookingType === type
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
                                ) : filteredBookings.length > 0 ? (
                                    <div className="space-y-4">
                                        {filteredBookings.map(booking => {
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
                                                                {booking.booking_type === 'coaching' && booking.simulator_details && (
                                                                    <p className="text-sm text-text-secondary">
                                                                        <span className="font-medium">Bay:</span> {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                                    </p>
                                                                )}
                                                                {booking.booking_type === 'coaching' && booking.package_purchase_details && booking.purchase_type_label && (
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
                                            {filteredBookings.length === 0
                                                ? '0'
                                                : `${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, filteredBookings.length)}`} of {filteredBookings.length} {bookingType === 'all' ? 'bookings' : bookingType + ' booking' + (filteredBookings.length !== 1 ? 's' : '')}
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
                                {(user?.role === 'staff' || user?.role === 'admin' || user?.is_superuser) && (
                                    <Button
                                        onClick={() => navigate('/coaching-sessions')}
                                        variant="primary"
                                        className="w-full"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            <span>My Coaching Sessions</span>
                                        </div>
                                    </Button>
                                )}
                            </div>
                            <div className="bg-background border border-border rounded-card p-4 text-sm text-text-primary">
                                <p className="font-semibold text-text-primary mb-1">Simulator credits</p>
                                <p>
                                    You currently have <span className="font-bold">{availableSimCredits.toFixed(2)}</span> hour{availableSimCredits === 1 ? '' : 's'} available.
                                </p>
                                <p className="mt-1 text-text-secondary">
                                    Hours are issued when you cancel simulator bookings at least 24 hours ahead.
                                </p>
                            </div>
                            {(simulatorPurchasesLoading) ? (
                                <PackagesSkeleton />
                            ) : simulatorPackagesList.length > 0 ? (
                                <div className="bg-background border border-border rounded-card p-4 text-sm text-text-primary">
                                    <p className="font-semibold text-text-primary mb-2">Simulator Hours</p>
                                    <div className="space-y-2">
                                        {simulatorPackagesList.map((pkg) => (
                                            <div key={pkg.packageId} className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
                                                <span className="text-text-secondary">{pkg.packageTitle}</span>
                                                <span className="font-bold text-text-primary">{pkg.hoursRemaining.toFixed(2)} hour{pkg.hoursRemaining === 1 ? '' : 's'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {(purchasesLoading || organizationPackagesLoading) ? (
                                <PackagesSkeleton />
                            ) : (personalPackagesList.length > 0 || groupPackagesList.length > 0) ? (
                                <div className="bg-background border border-border rounded-card p-4 text-sm text-text-primary space-y-4">
                                    {personalPackagesList.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-text-primary mb-2">Coaching Sessions</p>
                                            <div className="space-y-2">
                                                {personalPackagesList.map((pkg) => (
                                                    <div key={pkg.packageId} className="flex flex-col py-2 border-b border-border/50 last:border-b-0 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-secondary">{pkg.packageTitle}</span>
                                                            <span className="font-bold text-text-primary">{pkg.sessionsRemaining} session{pkg.sessionsRemaining === 1 ? '' : 's'}</span>
                                                        </div>
                                                        {pkg.simulatorHoursRemaining > 0 && (
                                                            <div className="flex items-center justify-end">
                                                                <span className="text-xs text-text-secondary bg-surface-hover px-2 py-0.5 rounded-full">
                                                                    + {pkg.simulatorHoursRemaining.toFixed(2)} sim hour{pkg.simulatorHoursRemaining === 1 ? '' : 's'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {groupPackagesList.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-text-primary mb-2">Group Purchase Packages</p>
                                            <div className="space-y-2">
                                                {groupPackagesList.map((pkg) => (
                                                    <div key={pkg.packageId} className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
                                                        <span className="text-text-secondary">{pkg.packageTitle}</span>
                                                        <span className="font-bold text-text-primary">{pkg.sessionsRemaining} session{pkg.sessionsRemaining === 1 ? '' : 's'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-4 overflow-y-auto">
                    <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl p-6 my-auto">
                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                            Change {rescheduleTarget.booking_type === 'simulator' ? 'Simulator' : 'Coaching'} Booking Time
                        </h3>
                        <p className="text-sm text-text-secondary mb-4">
                            Select a new date and time slot. Existing session duration ({rescheduleTarget.duration_minutes || 60} minutes) will remain the same.
                        </p>
                        <form className="space-y-4" onSubmit={handleRescheduleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">New Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    min={minDateString}
                                    max={maxDateString}
                                    required
                                    className="w-full"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Availability will be checked automatically when you select a date.
                                </p>
                            </div>

                            {/* Availability checking indicator */}
                            {rescheduleCheckingAvailability && (
                                <div className="flex items-center gap-2 text-sm text-text-secondary">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Checking availability...</span>
                                </div>
                            )}

                            {/* Available Time Slots */}
                            {!rescheduleCheckingAvailability && rescheduleDate && (
                                <>
                                    {rescheduleTarget.booking_type === 'coaching' && availability.coaching && availability.coaching.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-semibold text-text-primary mb-3">Available Time Slots</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 max-h-64 overflow-y-auto p-2">
                                                {availability.coaching.map((slot, index) => {
                                                    const isDisabled = isRescheduleSlotDisabled(slot);
                                                    const isSelected = rescheduleSelectedSlot && new Date(rescheduleSelectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`p-3 border-2 rounded-card transition duration-200 cursor-pointer ${isDisabled
                                                                ? 'border-border bg-background cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                    ? 'border-primary bg-primary-light/20 shadow-card-hover'
                                                                    : 'border-border hover:border-primary hover:bg-background'
                                                                }`}
                                                            onClick={() => !isDisabled && handleRescheduleSlotSelect(slot)}
                                                            title={isDisabled ? 'This slot cannot accommodate the session duration' : ''}
                                                        >
                                                            <div className={`text-base font-semibold ${isDisabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                                                {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-text-secondary">
                                                                {slot.available_coaches?.length || 0} coach{slot.available_coaches?.length !== 1 ? 'es' : ''} available
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {rescheduleTarget.booking_type === 'simulator' && availability.simulator && availability.simulator.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-semibold text-text-primary mb-3">Available Time Slots</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4 max-h-64 overflow-y-auto p-2">
                                                {availability.simulator.map((slot, index) => {
                                                    const isDisabled = isRescheduleSlotDisabled(slot);
                                                    const isSelected = rescheduleSelectedSlot && new Date(rescheduleSelectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`p-3 border-2 rounded-card transition duration-200 cursor-pointer ${isDisabled
                                                                ? 'border-border bg-background cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                    ? 'border-primary bg-primary-light/20 shadow-card-hover'
                                                                    : 'border-border hover:border-primary hover:bg-background'
                                                                }`}
                                                            onClick={() => !isDisabled && handleRescheduleSlotSelect(slot)}
                                                            title={isDisabled ? 'This slot cannot accommodate the session duration' : ''}
                                                        >
                                                            <div className={`text-base font-semibold ${isDisabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                                                {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-text-secondary">
                                                                Bay assigned automatically
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual time input fallback */}
                                    {((rescheduleTarget.booking_type === 'coaching' && (!availability.coaching || availability.coaching.length === 0)) ||
                                        (rescheduleTarget.booking_type === 'simulator' && (!availability.simulator || availability.simulator.length === 0))) && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-primary mb-1">New Start Time (Manual Entry)</label>
                                                <input
                                                    type="time"
                                                    value={rescheduleTime}
                                                    onChange={(e) => {
                                                        setRescheduleTime(e.target.value);
                                                        setRescheduleSelectedSlot(null);
                                                    }}
                                                    className="w-full"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    No available slots found. You can manually enter a time, but it may not be available.
                                                </p>
                                            </div>
                                        )}
                                </>
                            )}

                            {/* Selected slot summary */}
                            {rescheduleSelectedSlot && (
                                <div className="bg-background border border-primary/20 rounded-card p-4">
                                    <h5 className="font-semibold text-text-primary mb-2">Selected Time Slot</h5>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-text-primary">
                                            <span className="font-medium">Date:</span> {new Date(rescheduleSelectedSlot.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="text-text-primary">
                                            <span className="font-medium">Time:</span> {new Date(rescheduleSelectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - {new Date(rescheduleSelectedSlot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </p>
                                        <p className="text-text-primary">
                                            <span className="font-medium">Duration:</span> {rescheduleTarget.duration_minutes || 60} minutes
                                        </p>
                                    </div>
                                </div>
                            )}

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
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={rescheduleLoading || rescheduleCheckingAvailability || (!rescheduleSelectedSlot && !rescheduleTime)}
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

