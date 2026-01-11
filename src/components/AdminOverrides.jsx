import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getPackages,
    grantCoachingSessions,
    grantSimulatorCredits,
    resetOverrideStatus,
    getLockedBookings,
    adminCancelBooking,
} from '../store/slices/adminSlice';
import Button from './ui/Button';
import Badge from './ui/Badge';
import usePopup from '../hooks/usePopup';
import PopupMessage from './PopupMessage';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import moment from 'moment';

function AdminOverrides() {
    const dispatch = useAppDispatch();
    const { packages, overrides } = useAppSelector((state) => state.admin);
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const [coachingForm, setCoachingForm] = useState({
        clientIdentifier: '',
        packageId: '',
        sessionCount: 1,
        simulatorHours: 0,
        note: '',
    });
    const [simForm, setSimForm] = useState({
        clientIdentifier: '',
        hours: 1,
        note: '',
    });
    const [showManualForms, setShowManualForms] = useState(false);
    const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'coaching', 'simulator'
    const [searchQuery, setSearchQuery] = useState(''); // Search by customer name, phone, or email
    const [cancellingBookingId, setCancellingBookingId] = useState(null); // Track which booking is being cancelled

    useEffect(() => {
        if (packages.list.length === 0) {
            dispatch(getPackages());
        }
    }, [dispatch, packages.list.length]);

    useEffect(() => {
        // Fetch locked bookings on mount
        dispatch(getLockedBookings());

        return () => {
            dispatch(resetOverrideStatus('coaching'));
            dispatch(resetOverrideStatus('simulator'));
        };
    }, [dispatch]);

    const handleCancelBooking = async (booking) => {
        openPopup({
            type: 'warning',
            title: 'Cancel Booking?',
            message: `Are you sure you want to cancel this ${booking.booking_type} booking? This will apply the 24-hour override and restore the appropriate credits/sessions.`,
            confirmText: 'Yes, Cancel',
            cancelText: 'Keep Booking',
            showCancel: true,
            onConfirm: async () => {
                closePopup();
                setCancellingBookingId(booking.id); // Set loading state
                try {
                    const result = await dispatch(adminCancelBooking({ bookingId: booking.id, forceOverride: true }));
                    if (adminCancelBooking.fulfilled.match(result)) {
                        // Refresh locked bookings list
                        dispatch(getLockedBookings());
                        showSuccess(result.payload?.message || 'Booking cancelled successfully. Credits/sessions have been restored.');
                    } else {
                        showError(result.payload?.error || result.payload?.detail || 'Unable to cancel booking.');
                    }
                } finally {
                    setCancellingBookingId(null); // Clear loading state
                }
            },
        });
    };

    const formatDateTime = (dateTimeStr) => {
        return moment(dateTimeStr).format('MMM Do YYYY, h:mm A');
    };

    const getTimeUntilBooking = (startTime) => {
        const now = moment();
        const start = moment(startTime);
        const diff = start.diff(now);
        const duration = moment.duration(diff);

        if (duration.asHours() < 1) {
            return `${Math.floor(duration.asMinutes())} minutes`;
        }
        return `${Math.floor(duration.asHours())} hours ${duration.minutes()} minutes`;
    };

    const handleCoachingSubmit = async (e) => {
        e.preventDefault();

        if (!coachingForm.packageId) {
            showError('Please select a package.');
            return;
        }

        dispatch(resetOverrideStatus('coaching'));
        const payload = {
            client_identifier: coachingForm.clientIdentifier,
            package_id: coachingForm.packageId || undefined,
            session_count: Number(coachingForm.sessionCount) || 1,
            note: coachingForm.note,
        };
        // Add simulator hours if provided
        if (coachingForm.simulatorHours > 0) {
            payload.simulator_hours = Number(coachingForm.simulatorHours);
        }

        try {
            const result = await dispatch(grantCoachingSessions(payload));

            if (grantCoachingSessions.fulfilled.match(result)) {
                showSuccess(result.payload?.message || 'Coaching sessions added successfully.');
                setCoachingForm({ clientIdentifier: '', packageId: '', sessionCount: 1, simulatorHours: 0, note: '' });
            } else if (grantCoachingSessions.rejected.match(result)) {
                const errorData = result.payload;
                const nonFieldErrors = errorData?.non_field_errors;
                const errorMessage = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : (errorData?.detail || errorData?.error || 'Unknown error');

                // Check if this is the "no active purchase" error
                if (errorMessage === "The client does not have an active purchase for the selected package.") {
                    openPopup({
                        type: 'warning',
                        title: 'No Active Package',
                        message: "The client does not have an active purchase for this package.\n\nDo you want to create a package for them and add the session(s)?",
                        confirmText: 'Yes, Create & Add',
                        cancelText: 'Cancel',
                        showCancel: true,
                        onConfirm: async () => {
                            const retryPayload = { ...payload, create_if_missing: true };
                            const retryResult = await dispatch(grantCoachingSessions(retryPayload));

                            if (grantCoachingSessions.fulfilled.match(retryResult)) {
                                showSuccess(retryResult.payload?.message || 'Package created and sessions added successfully.');
                                setCoachingForm({ clientIdentifier: '', packageId: '', sessionCount: 1, simulatorHours: 0, note: '' });
                            } else {
                                const retryError = retryResult.payload?.error || retryResult.payload?.detail || 'Failed to create package.';
                                showError(typeof retryError === 'string' ? retryError : JSON.stringify(retryError));
                            }
                        }
                    });
                } else {
                    showError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
                }
            }
        } catch (err) {
            console.error(err);
            showError('An unexpected error occurred.');
        }
    };

    const handleSimulatorSubmit = async (e) => {
        e.preventDefault();
        dispatch(resetOverrideStatus('simulator'));

        try {
            const result = await dispatch(
                grantSimulatorCredits({
                    client_identifier: simForm.clientIdentifier,
                    hours: Number(simForm.hours) || 1,
                    note: simForm.note,
                })
            );

            if (grantSimulatorCredits.fulfilled.match(result)) {
                showSuccess(result.payload?.message || 'Simulator credits granted successfully.');
                setSimForm({ clientIdentifier: '', hours: 1, note: '' });
            } else {
                const error = result.payload?.error || result.payload?.detail || 'Failed to grant credits.';
                showError(typeof error === 'string' ? error : JSON.stringify(error));
            }
        } catch (err) {
            console.error(err);
            showError('An unexpected error occurred.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Manual Add Credits Button */}
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => setShowManualForms(!showManualForms)}
                    variant={showManualForms ? 'secondary' : 'primary'}
                >
                    {showManualForms ? 'Hide Forms' : 'Manually Add Credits'}
                </Button>
            </div>

            {/* Manual Forms Section - Conditionally shown above bookings */}
            {showManualForms && (
                <div className="space-y-6">
                    <div className="bg-status-pending-bg border border-status-pending-text/20 rounded-card p-4 text-status-pending-text text-sm">
                        <p className="font-semibold">Override capabilities</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Use this panel to restore coaching sessions or grant simulator credits inside the 24-hour lock window.</li>
                            <li>Search by email or phone; we'll match the client automatically.</li>
                            <li>Admin overrides automatically log the actor performing the change.</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-surface shadow-card rounded-card p-6 border border-border">
                            <h2 className="text-xl font-semibold text-text-primary mb-1">Restore Coaching Sessions</h2>
                            <p className="text-sm text-text-secondary mb-4">
                                Add sessions back to a client's package when you approve a late cancellation or goodwill credit.
                            </p>
                            <form className="space-y-4" onSubmit={handleCoachingSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Client email or phone</label>
                                    <input
                                        type="text"
                                        required
                                        value={coachingForm.clientIdentifier}
                                        onChange={(e) => setCoachingForm({ ...coachingForm, clientIdentifier: e.target.value })}
                                        placeholder="e.g. golfer@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Package</label>
                                    <select
                                        required
                                        value={coachingForm.packageId}
                                        onChange={(e) => setCoachingForm({ ...coachingForm, packageId: e.target.value, simulatorHours: 0 })}
                                    >
                                        <option value="" disabled>Select a Package</option>
                                        {packages.list.map((pkg) => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">Sessions to add</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={coachingForm.sessionCount}
                                            onChange={(e) => setCoachingForm({ ...coachingForm, sessionCount: e.target.value })}
                                        />
                                    </div>
                                    {(() => {
                                        if (!coachingForm.packageId) {
                                            return null;
                                        }

                                        const selectedPackage = packages.list.find(pkg => pkg.id === Number(coachingForm.packageId));
                                        if (!selectedPackage) {
                                            return null;
                                        }

                                        // Check if package has simulator hours (combo package)
                                        // Only show field if simulator_hours exists and is greater than 0
                                        const simulatorHours = selectedPackage.simulator_hours;
                                        const hoursValue = simulatorHours !== null && simulatorHours !== undefined
                                            ? parseFloat(simulatorHours)
                                            : 0;
                                        const hasSimulatorHours = hoursValue > 0;

                                        // Only show simulator hours field if combo package is selected
                                        if (hasSimulatorHours) {
                                            return (
                                                <div>
                                                    <label className="block text-sm font-medium text-text-primary mb-1">Simulator Hours to add</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        value={coachingForm.simulatorHours}
                                                        onChange={(e) => setCoachingForm({ ...coachingForm, simulatorHours: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                    <p className="text-xs text-text-secondary mt-1">
                                                        Hours will be added back to the same package
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Note</label>
                                    <input
                                        type="text"
                                        value={coachingForm.note}
                                        onChange={(e) => setCoachingForm({ ...coachingForm, note: e.target.value })}
                                        placeholder="Optional admin note"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={overrides.coaching.loading}
                                    variant="primary"
                                    className="w-full"
                                >
                                    {overrides.coaching.loading ? 'Adding Sessions...' : 'Add Sessions'}
                                </Button>
                            </form>
                        </div>

                        <div className="bg-surface shadow-card rounded-card p-6 border border-border">
                            <h2 className="text-xl font-semibold text-text-primary mb-1">Grant Simulator Credits</h2>
                            <p className="text-sm text-text-secondary mb-4">
                                Give clients a free simulator session credit for approved cancellations or goodwill gestures.
                            </p>
                            <form className="space-y-4" onSubmit={handleSimulatorSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Client email or phone</label>
                                    <input
                                        type="text"
                                        required
                                        value={simForm.clientIdentifier}
                                        onChange={(e) => setSimForm({ ...simForm, clientIdentifier: e.target.value })}
                                        placeholder="e.g. golfer@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Hours to grant</label>
                                    <input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        required
                                        value={simForm.hours}
                                        onChange={(e) => setSimForm({ ...simForm, hours: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-1">Note</label>
                                    <input
                                        type="text"
                                        value={simForm.note}
                                        onChange={(e) => setSimForm({ ...simForm, note: e.target.value })}
                                        placeholder="Optional admin note"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={overrides.simulator.loading}
                                    variant="primary"
                                    className="w-full"
                                >
                                    {overrides.simulator.loading ? 'Granting Credits...' : 'Grant Credits'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Locked Bookings Section - Always visible below forms */}
            <div className="bg-surface shadow-card rounded-card p-6 border border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-text-primary mb-1">Locked Bookings (&lt; 24 Hours)</h2>
                        <p className="text-sm text-text-secondary">
                            Bookings that are less than 24 hours away. Only admins can cancel these bookings.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filter Buttons */}
                        <div className="inline-flex rounded-full border border-border bg-surface shadow-sm text-xs font-medium">
                            {['all', 'coaching', 'simulator'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setBookingFilter(filter)}
                                    className={`px-3 py-1 rounded-full transition ${bookingFilter === filter
                                        ? 'bg-primary text-white border border-primary'
                                        : 'text-text-secondary hover:bg-background'
                                        }`}
                                >
                                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
                        </div>
                        <Button
                            onClick={() => dispatch(getLockedBookings())}
                            variant="secondary"
                            disabled={overrides.lockedBookings.loading}
                        >
                            {overrides.lockedBookings.loading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by customer name, phone, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>

                {overrides.lockedBookings.loading && overrides.lockedBookings.list.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">Loading locked bookings...</div>
                ) : overrides.lockedBookings.error ? (
                    <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg p-3">
                        {typeof overrides.lockedBookings.error === 'string'
                            ? overrides.lockedBookings.error
                            : JSON.stringify(overrides.lockedBookings.error)}
                    </div>
                ) : (() => {
                    // Filter bookings based on type and search query
                    const filteredBookings = overrides.lockedBookings.list.filter((booking) => {
                        // Filter by booking type
                        if (bookingFilter !== 'all' && booking.booking_type !== bookingFilter) {
                            return false;
                        }

                        // Filter by search query
                        if (searchQuery.trim()) {
                            const query = searchQuery.toLowerCase().trim();
                            const client = booking.client_details || {};
                            const firstName = (client.first_name || '').toLowerCase();
                            const lastName = (client.last_name || '').toLowerCase();
                            const fullName = `${firstName} ${lastName}`.trim();
                            const phone = (client.phone || '').toLowerCase();
                            const email = (client.email || '').toLowerCase();

                            return (
                                fullName.includes(query) ||
                                firstName.includes(query) ||
                                lastName.includes(query) ||
                                phone.includes(query) ||
                                email.includes(query)
                            );
                        }

                        return true;
                    });

                    if (overrides.lockedBookings.list.length === 0) {
                        return (
                            <div className="text-center py-8 text-text-secondary">
                                No bookings are currently locked (less than 24 hours away).
                            </div>
                        );
                    }

                    if (filteredBookings.length === 0) {
                        return (
                            <div className="text-center py-8 text-text-secondary">
                                No bookings match your search criteria.
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-4">
                            {filteredBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge status={booking.booking_type === 'coaching' ? 'pending' : 'personal'}>
                                                    {booking.booking_type === 'coaching' ? 'Coaching' : 'Simulator'}
                                                </Badge>
                                                <span className="text-xs text-text-secondary">
                                                    Starts in: {getTimeUntilBooking(booking.start_time)}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-text-primary">
                                                    <span className="text-text-secondary">Client:</span>{' '}
                                                    {booking.client_details?.first_name || 'N/A'}{' '}
                                                    {booking.client_details?.last_name || ''}
                                                    {booking.client_details?.phone && (
                                                        <span className="text-text-secondary ml-2">
                                                            ({booking.client_details.phone})
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Time:</span>{' '}
                                                    {formatDateTime(booking.start_time)} - {moment(booking.end_time).format('h:mm A')}
                                                </p>
                                                {booking.booking_type === 'coaching' && booking.coach_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Coach:</span>{' '}
                                                        {booking.coach_details.first_name} {booking.coach_details.last_name}
                                                    </p>
                                                )}
                                                {booking.booking_type === 'simulator' && booking.simulator_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Simulator:</span>{' '}
                                                        Bay {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                    </p>
                                                )}
                                                {booking.package_purchase_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Package:</span>{' '}
                                                        {booking.package_purchase_details.package_details?.title || 'N/A'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleCancelBooking(booking)}
                                                variant="danger"
                                                className="whitespace-nowrap"
                                                disabled={cancellingBookingId === booking.id}
                                            >
                                                {cancellingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()}
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
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={toast.duration} />}
        </div>
    );
}

export default AdminOverrides;
