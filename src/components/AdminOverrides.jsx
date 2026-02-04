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
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { FaSearch, FaUser, FaExclamationTriangle, FaPlus, FaMinus } from 'react-icons/fa';

function AdminOverrides() {
    const dispatch = useAppDispatch();
    const { packages, overrides } = useAppSelector((state) => state.admin);
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const [showManualForms, setShowManualForms] = useState(false);
    const [bookingFilter, setBookingFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cancellingBookingId, setCancellingBookingId] = useState(null);

    useEffect(() => {
        if (packages.list.length === 0) {
            dispatch(getPackages());
        }
    }, [dispatch, packages.list.length]);

    useEffect(() => {
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
                setCancellingBookingId(booking.id);
                try {
                    const result = await dispatch(adminCancelBooking({ bookingId: booking.id, forceOverride: true }));
                    if (adminCancelBooking.fulfilled.match(result)) {
                        dispatch(getLockedBookings());
                        showSuccess(result.payload?.message || 'Booking cancelled successfully. Credits/sessions have been restored.');
                    } else {
                        showError(result.payload?.error || result.payload?.detail || 'Unable to cancel booking.');
                    }
                } finally {
                    setCancellingBookingId(null);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => setShowManualForms(!showManualForms)}
                    variant={showManualForms ? 'secondary' : 'primary'}
                >
                    {showManualForms ? 'Hide Forms' : 'Manually Add/Remove Credits'}
                </Button>
            </div>

            {showManualForms && (
                <div className="space-y-6">
                    <div className="bg-status-pending-bg border border-status-pending-text/20 rounded-card p-4 text-status-pending-text text-sm">
                        <p className="font-semibold">Override capabilities</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Use this panel to restore or reduce coaching sessions and simulator credits.</li>
                            <li>Search by email or phone to find the client.</li>
                            <li>Admin overrides automatically log the actor performing the change.</li>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CoachingOverrideForm
                            packages={packages}
                            overrides={overrides}
                            dispatch={dispatch}
                            showSuccess={showSuccess}
                            showError={showError}
                            openPopup={openPopup}
                        />

                        <SimulatorOverrideForm
                            overrides={overrides}
                            dispatch={dispatch}
                            showSuccess={showSuccess}
                            showError={showError}
                        />
                    </div>
                </div>
            )}

            <div className="bg-surface shadow-card rounded-card p-6 border border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-text-primary mb-1">Locked Bookings (&lt; 24 Hours)</h2>
                        <p className="text-sm text-text-secondary">
                            Bookings less than 24 hours away. Only admins can cancel these.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                    const filteredBookings = overrides.lockedBookings.list.filter((booking) => {
                        if (bookingFilter !== 'all' && booking.booking_type !== bookingFilter) return false;
                        if (searchQuery.trim()) {
                            const query = searchQuery.toLowerCase().trim();
                            const client = booking.client_details || {};
                            const firstName = (client.first_name || '').toLowerCase();
                            const lastName = (client.last_name || '').toLowerCase();
                            const fullName = `${firstName} ${lastName}`.trim();
                            const phone = (client.phone || '').toLowerCase();
                            const email = (client.email || '').toLowerCase();
                            return fullName.includes(query) || firstName.includes(query) || lastName.includes(query) || phone.includes(query) || email.includes(query);
                        }
                        return true;
                    });

                    if (overrides.lockedBookings.list.length === 0) return <div className="text-center py-8 text-text-secondary">No bookings are currently locked.</div>;
                    if (filteredBookings.length === 0) return <div className="text-center py-8 text-text-secondary">No bookings match your search.</div>;

                    return (
                        <div className="space-y-4">
                            {filteredBookings.map((booking) => (
                                <div key={booking.id} className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                                                    <span className="text-text-secondary">Client:</span> {booking.client_details?.first_name || 'N/A'} {booking.client_details?.last_name || ''}
                                                    {booking.client_details?.phone && <span className="text-text-secondary ml-2">({booking.client_details.phone})</span>}
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    <span className="font-medium">Time:</span> {formatDateTime(booking.start_time)} - {moment(booking.end_time).format('h:mm A')}
                                                </p>
                                                {booking.booking_type === 'coaching' && booking.coach_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Coach:</span> {booking.coach_details.first_name} {booking.coach_details.last_name}
                                                    </p>
                                                )}
                                                {booking.booking_type === 'simulator' && booking.simulator_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Simulator:</span> Bay {booking.simulator_details.bay_number} - {booking.simulator_details.name}
                                                    </p>
                                                )}
                                                {booking.package_purchase_details && (
                                                    <p className="text-sm text-text-secondary">
                                                        <span className="font-medium">Package:</span> {booking.package_purchase_details.package_details?.title || 'N/A'}
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
                    if (action) await action();
                } : closePopup}
                onClose={closePopup}
            />
            {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={toast.duration} />}
        </div>
    );
}

// --- Sub-Components ---

function CoachingOverrideForm({ packages, overrides, dispatch, showSuccess, showError, openPopup }) {
    const [mode, setMode] = useState('add'); // 'add' | 'reduce'
    const [addForm, setAddForm] = useState({
        clientIdentifier: '',
        packageId: '',
        sessionCount: 1,
        simulatorHours: 0,
        note: '',
    });

    // Reduce Mode State
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [userPackages, setUserPackages] = useState([]);
    const [loadingUser, setLoadingUser] = useState(false);
    const [reduceValues, setReduceValues] = useState({}); // { [purchaseId]: { sessions: 0, hours: 0 } }
    const [processingReduce, setProcessingReduce] = useState(null); // purchaseId currently processing

    const handleSearchUser = async () => {
        if (!searchUserQuery) return;
        setLoadingUser(true);
        setFoundUser(null);
        setUserPackages([]);
        try {
            const response = await apiClient.get(endpoints.admin.users.list, {
                params: { search: searchUserQuery, page_size: 1 }
            });
            const users = response.data?.results || [];
            if (users.length > 0) {
                const user = users[0];
                setFoundUser(user);
                // Fetch packages
                const packagesRes = await apiClient.get(endpoints.coaching.userPurchases, {
                    params: { user_id: user.id, page_size: 100 }
                });
                const packagesData = packagesRes.data;
                const packagesList = Array.isArray(packagesData) ? packagesData : (packagesData?.results || []);
                setUserPackages(packagesList);
            } else {
                showError('User not found.');
            }
        } catch (error) {
            console.error(error);
            showError('Error searching for user.');
        } finally {
            setLoadingUser(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!addForm.packageId) {
            showError('Please select a package.');
            return;
        }

        dispatch(resetOverrideStatus('coaching'));
        const payload = {
            client_identifier: addForm.clientIdentifier,
            package_id: addForm.packageId,
            session_count: Number(addForm.sessionCount),
            note: addForm.note,
        };
        if (addForm.simulatorHours > 0) {
            payload.simulator_hours = Number(addForm.simulatorHours);
        }

        try {
            const result = await dispatch(grantCoachingSessions(payload));
            if (grantCoachingSessions.fulfilled.match(result)) {
                showSuccess('Coaching sessions added successfully.');
                setAddForm({ ...addForm, clientIdentifier: '', sessionCount: 1, simulatorHours: 0, note: '' });
            } else if (grantCoachingSessions.rejected.match(result)) {
                const errorData = result.payload;
                const errorMessage = (errorData?.non_field_errors?.[0]) || errorData?.detail || errorData?.error || 'Unknown error';
                if (errorMessage === "The client does not have an active purchase for the selected package.") {
                    openPopup({
                        type: 'warning',
                        title: 'No Active Package',
                        message: "Client doesn't have an active purchase.\n\nCreate a new package and add sessions?",
                        confirmText: 'Yes, Create & Add',
                        showCancel: true,
                        onConfirm: async () => {
                            const retryPayload = { ...payload, create_if_missing: true };
                            const retryResult = await dispatch(grantCoachingSessions(retryPayload));
                            if (grantCoachingSessions.fulfilled.match(retryResult)) {
                                showSuccess('Package created and sessions added.');
                                setAddForm({ ...addForm, clientIdentifier: '', sessionCount: 1, simulatorHours: 0, note: '' });
                            } else {
                                const retryError = retryResult.payload?.error || 'Failed to create package.';
                                showError(typeof retryError === 'string' ? retryError : JSON.stringify(retryError));
                            }
                        }
                    });
                } else {
                    showError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
                }
            }
        } catch (err) {
            showError('An unexpected error occurred.');
        }
    };

    const handleReduceSubmit = async (purchaseId) => {
        const values = reduceValues[purchaseId] || { sessions: 0, hours: 0 };
        const sessionsToRemove = Number(values.sessions) || 0;
        const hoursToRemove = Number(values.hours) || 0;

        if (sessionsToRemove <= 0 && hoursToRemove <= 0) {
            showError("Enter a value to remove.");
            return;
        }

        openPopup({
            type: 'warning',
            title: 'Confirm Reduction',
            message: `Remove ${sessionsToRemove} sessions and ${hoursToRemove} simulator hours from this package?`,
            confirmText: 'Confirm Reduce',
            showCancel: true,
            onConfirm: async () => {
                setProcessingReduce(purchaseId);
                try {
                    const payload = {
                        client_identifier: foundUser.email || foundUser.phone || foundUser.username,
                        session_count: -sessionsToRemove, // Negative for reduction
                        simulator_hours: -hoursToRemove, // Negative for reduction
                        package_purchase_id: purchaseId,
                        note: "Admin manual reduction",
                    };

                    const result = await dispatch(grantCoachingSessions(payload));
                    if (grantCoachingSessions.fulfilled.match(result)) {
                        showSuccess('Reduction applied successfully.');
                        // Refresh packages
                        const packagesRes = await apiClient.get(endpoints.coaching.userPurchases, {
                            params: { user_id: foundUser.id, page_size: 100 }
                        });
                        const packagesData = packagesRes.data;
                        const packagesList = Array.isArray(packagesData) ? packagesData : (packagesData?.results || []);
                        setUserPackages(packagesList);
                        setReduceValues(prev => ({ ...prev, [purchaseId]: { sessions: 0, hours: 0 } }));
                    } else {
                        showError(result.payload?.error || 'Failed to reduce sessions.');
                    }
                } finally {
                    setProcessingReduce(null);
                }
            }
        });
    };

    return (
        <div className="bg-surface shadow-card rounded-card p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-text-primary">Coaching Sessions</h2>
                <div className="flex bg-background rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setMode('add')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'add' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setMode('reduce')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'reduce' ? 'bg-danger/10 text-danger' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Reduce
                    </button>
                </div>
            </div>

            {mode === 'add' ? (
                <form className="space-y-4" onSubmit={handleAddSubmit}>
                    <p className="text-sm text-text-secondary mb-4">Add sessions or hours to a client's package.</p>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Client Identifier</label>
                        <input
                            type="text"
                            required
                            value={addForm.clientIdentifier}
                            onChange={(e) => setAddForm({ ...addForm, clientIdentifier: e.target.value })}
                            placeholder="Email, Phone, or Name"
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Package</label>
                        <select
                            required
                            value={addForm.packageId}
                            onChange={(e) => setAddForm({ ...addForm, packageId: e.target.value, simulatorHours: 0 })}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        >
                            <option value="" disabled>Select a Package</option>
                            {packages.list.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-1">Sessions to Add</label>
                            <input
                                type="number"
                                min="1"
                                value={addForm.sessionCount}
                                onChange={(e) => setAddForm({ ...addForm, sessionCount: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                            />
                        </div>
                        {addForm.packageId && packages.list.find(p => p.id === Number(addForm.packageId))?.simulator_hours > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-1">Sim Hours to Add</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={addForm.simulatorHours}
                                    onChange={(e) => setAddForm({ ...addForm, simulatorHours: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Note</label>
                        <input
                            type="text"
                            value={addForm.note}
                            onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                    </div>
                    <Button type="submit" disabled={overrides.coaching.loading} variant="primary" className="w-full">
                        {overrides.coaching.loading ? 'Adding...' : 'Add Sessions'}
                    </Button>
                </form>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary mb-2">Search for a client to view and reduce their package balance.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter client phone provided (preferred) or email"
                            value={searchUserQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchUserQuery(val);
                                if (!val) {
                                    setFoundUser(null);
                                    setUserPackages([]);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchUser();
                                }
                            }}
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                        />
                        <Button onClick={handleSearchUser} disabled={loadingUser || !searchUserQuery} variant="secondary">
                            {loadingUser ? '...' : <FaSearch />}
                        </Button>
                    </div>

                    {foundUser && (
                        <div className="mt-4 animate-fadeIn">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-text-primary pb-2 border-b border-border">
                                <FaUser className="text-text-secondary" />
                                {foundUser.first_name} {foundUser.last_name} ({foundUser.phone})
                            </div>

                            {userPackages.length === 0 ? (
                                <p className="text-sm text-text-secondary italic">No active packages found.</p>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                    {userPackages.map(pkg => (
                                        <div key={pkg.id} className="bg-background border border-border rounded-lg p-3 text-sm">
                                            <div className="font-semibold text-text-primary mb-1">{pkg.package_details?.title || pkg.purchase_name}</div>
                                            <div className="flex justify-between text-xs text-text-secondary mb-3">
                                                <span>Remaining: <span className="text-text-primary font-medium">{pkg.sessions_remaining} sessions</span></span>
                                                <span><span className="text-text-primary font-medium">{Number(pkg.simulator_hours_remaining)} hrs</span> sim</span>
                                            </div>

                                            <div className="bg-surface rounded border border-border p-2">
                                                <div className="text-xs font-medium text-danger mb-2">Reduce by:</div>
                                                <div className="grid grid-cols-2 gap-2 mb-2">
                                                    <div className={Number(pkg.simulator_hours_remaining) > 0 ? "" : "col-span-2"}>
                                                        <label className="block text-[10px] text-text-secondary uppercase">Sessions</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={pkg.sessions_remaining}
                                                            className="w-full px-2 py-1 text-sm border border-border rounded"
                                                            value={reduceValues[pkg.id]?.sessions || ''}
                                                            onChange={e => setReduceValues(prev => ({
                                                                ...prev, [pkg.id]: { ...(prev[pkg.id] || {}), sessions: e.target.value }
                                                            }))}
                                                        />
                                                    </div>
                                                    {Number(pkg.simulator_hours_remaining) > 0 && (
                                                        <div>
                                                            <label className="block text-[10px] text-text-secondary uppercase">Sim Hours</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.5"
                                                                max={pkg.simulator_hours_remaining}
                                                                className="w-full px-2 py-1 text-sm border border-border rounded"
                                                                value={reduceValues[pkg.id]?.hours || ''}
                                                                onChange={e => setReduceValues(prev => ({
                                                                    ...prev, [pkg.id]: { ...(prev[pkg.id] || {}), hours: e.target.value }
                                                                }))}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    className="w-full text-xs py-1"
                                                    disabled={processingReduce === pkg.id}
                                                    onClick={() => handleReduceSubmit(pkg.id)}
                                                >
                                                    {processingReduce === pkg.id ? 'Reducing...' : 'Confirm Reduction'}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SimulatorOverrideForm({ overrides, dispatch, showSuccess, showError }) {
    const [mode, setMode] = useState('add');
    const [grantForm, setGrantForm] = useState({ clientIdentifier: '', hours: 1, note: '' });

    // Reduce Mode State
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [userCredits, setUserCredits] = useState([]);
    const [totalCredits, setTotalCredits] = useState(0);
    const [loadingUser, setLoadingUser] = useState(false);
    const [reduceHours, setReduceHours] = useState('');
    const [processingReduce, setProcessingReduce] = useState(false);

    const handleSearchUser = async () => {
        if (!searchUserQuery) return;
        setLoadingUser(true);
        setFoundUser(null);
        setUserCredits([]);
        setTotalCredits(0);
        try {
            const response = await apiClient.get(endpoints.admin.users.list, {
                params: { search: searchUserQuery, page_size: 1 }
            });
            const users = response.data?.results || [];
            if (users.length > 0) {
                const user = users[0];
                setFoundUser(user);

                // Fetch active credits
                const creditsRes = await apiClient.get(endpoints.simulators.credits, {
                    params: { client_id: user.id, status: 'available' }
                });
                const credits = creditsRes.data?.results || creditsRes.data || [];
                setUserCredits(credits);
                const total = credits.reduce((sum, c) => sum + Number(c.hours_remaining), 0);
                setTotalCredits(total);
            } else {
                showError('User not found.');
            }
        } catch (error) {
            console.error(error);
            showError('Error searching for user.');
        } finally {
            setLoadingUser(false);
        }
    };

    const handleGrantSubmit = async (e) => {
        e.preventDefault();
        dispatch(resetOverrideStatus('simulator'));
        try {
            const result = await dispatch(grantSimulatorCredits({
                client_identifier: grantForm.clientIdentifier,
                hours: Number(grantForm.hours),
                note: grantForm.note,
            }));
            if (grantSimulatorCredits.fulfilled.match(result)) {
                showSuccess('Simulator credits granted.');
                setGrantForm({ clientIdentifier: '', hours: 1, note: '' });
            } else {
                showError(result.payload?.error || 'Failed to grant credits.');
            }
        } catch (err) {
            showError('An unexpected error occurred.');
        }
    };

    const handleReduceSubmit = async () => {
        const hours = Number(reduceHours);
        if (!hours || hours <= 0) {
            showError('Please enter valid hours to remove.');
            return;
        }
        if (hours > totalCredits) {
            showError(`Cannot remove ${hours} hours. User only has ${totalCredits} available.`);
            return;
        }

        setProcessingReduce(true);
        try {
            const payload = {
                client_identifier: foundUser.email || foundUser.phone || foundUser.username,
                hours: -hours, // Negative for reduction
                reason: 'manual', // or generic
                note: "Admin manual reduction"
            };
            const result = await dispatch(grantSimulatorCredits(payload));
            if (grantSimulatorCredits.fulfilled.match(result)) {
                showSuccess('Credits removed successfully.');
                setReduceHours('');
                // Refresh
                const creditsRes = await apiClient.get(endpoints.simulators.credits, {
                    params: { client_id: foundUser.id, status: 'available' }
                });
                const credits = creditsRes.data?.results || creditsRes.data || [];
                setUserCredits(credits);
                const total = credits.reduce((sum, c) => sum + Number(c.hours_remaining), 0);
                setTotalCredits(total);
            } else {
                showError(result.payload?.error || 'Failed to reduce credits.');
            }
        } finally {
            setProcessingReduce(false);
        }
    };

    return (
        <div className="bg-surface shadow-card rounded-card p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-text-primary">Simulator Credits</h2>
                <div className="flex bg-background rounded-lg p-1 border border-border">
                    <button
                        onClick={() => setMode('add')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'add' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Grant
                    </button>
                    <button
                        onClick={() => setMode('reduce')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'reduce' ? 'bg-danger/10 text-danger' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                        Reduce
                    </button>
                </div>
            </div>

            {mode === 'add' ? (
                <form className="space-y-4" onSubmit={handleGrantSubmit}>
                    <p className="text-sm text-text-secondary mb-4">Give free simulator session credits.</p>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Client Identifier</label>
                        <input
                            type="text"
                            required
                            value={grantForm.clientIdentifier}
                            onChange={(e) => setGrantForm({ ...grantForm, clientIdentifier: e.target.value })}
                            placeholder="Email, Phone"
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Hours to Grant</label>
                        <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={grantForm.hours}
                            onChange={(e) => setGrantForm({ ...grantForm, hours: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Note</label>
                        <input
                            type="text"
                            value={grantForm.note}
                            onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md bg-background"
                        />
                    </div>
                    <Button type="submit" disabled={overrides.simulator.loading} variant="primary" className="w-full">
                        {overrides.simulator.loading ? 'Granting...' : 'Grant Credits'}
                    </Button>
                </form>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary mb-2">Search for a client to deduct credits.</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Client phone or email"
                            value={searchUserQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchUserQuery(val);
                                if (!val) {
                                    setFoundUser(null);
                                    setUserCredits([]);
                                    setTotalCredits(0);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchUser();
                                }
                            }}
                            className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                        />
                        <Button onClick={handleSearchUser} disabled={loadingUser || !searchUserQuery} variant="secondary">
                            {loadingUser ? '...' : <FaSearch />}
                        </Button>
                    </div>

                    {foundUser && (
                        <div className="mt-4 animate-fadeIn">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-text-primary pb-2 border-b border-border">
                                <FaUser className="text-text-secondary" />
                                {foundUser.first_name} {foundUser.last_name} ({foundUser.phone})
                            </div>

                            <div className="bg-background border border-border rounded-lg p-3 text-sm flex justify-between items-center mb-4">
                                <span className="text-text-secondary">Total Available:</span>
                                <span className="text-lg font-bold text-success">{totalCredits} Hours</span>
                            </div>

                            {totalCredits > 0 ? (
                                <div className="bg-surface rounded border border-border p-3">
                                    <label className="block text-xs font-medium text-danger mb-2 uppercase">Hours to Remove</label>
                                    <input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        max={totalCredits}
                                        value={reduceHours}
                                        onChange={(e) => setReduceHours(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded mb-3"
                                        placeholder="0.0"
                                    />
                                    <Button
                                        onClick={handleReduceSubmit}
                                        disabled={processingReduce || !reduceHours}
                                        variant="danger"
                                        className="w-full"
                                    >
                                        {processingReduce ? 'Removing...' : 'Confirm Reduction'}
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-text-secondary italic text-center">User has no available credits to reduce.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminOverrides;
