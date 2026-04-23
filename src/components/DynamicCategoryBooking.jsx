/**
 * Phase E — Generic staff-based booking for non-legacy service categories
 * (legacy_booking_type = null).
 *
 * Flow: select package → pick date → check availability → pick slot → confirm
 *
 * Follows the same layout pattern as CoachingBooking: a plain <select> for
 * owned packages, an empty-state card when the user has none, date picker,
 * then a slot grid.  No role-based UI branching — admin and customer see
 * the same interface.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import { formatLocalTime, formatLocalDate } from '../utils/timezoneUtils';

const STEP_FORM = 'form';
const STEP_SLOTS = 'slots';
const STEP_CONFIRM = 'confirm';

function DynamicCategoryBooking({ category, client }) {
    const { user: reduxUser, locationTimezone } = useAppSelector((s) => s.auth);
    const navigate = useNavigate();
    const tz = locationTimezone || 'America/Halifax';
    const user = reduxUser || JSON.parse(localStorage.getItem('user') || '{}') || {};
    const userRole = (user.role || '').toLowerCase();
    const isAdminOrStaff = userRole !== 'client' || !!user.is_superuser;

    // ------------------------------------------------------------------ //
    // State
    // ------------------------------------------------------------------ //
    const [step, setStep] = useState(STEP_FORM);

    // Catalog packages (all active for this category) + user's purchases
    const [packages, setPackages] = useState([]);
    const [purchasedPackages, setPurchasedPackages] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(false);

    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [date, setDate] = useState('');
    const [selectedCoachId, setSelectedCoachId] = useState('');

    // Slot results
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Booking creation
    const [booking, setBooking] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState('');

    // ------------------------------------------------------------------ //
    // Derived
    // ------------------------------------------------------------------ //

    /**
     * Packages the user (or client) can actually use right now —
     * same approach as CoachingBooking.availablePackages:
     * only packages with an active purchase that has sessions remaining.
     */
    const availablePackages = useMemo(() => {
        if (!purchasedPackages.length) return [];
        const seen = new Map();
        purchasedPackages
            .filter(
                (p) =>
                    p.purchase_type !== 'organization' &&
                    p.sessions_remaining > 0 &&
                    p.package_status === 'active',
            )
            .forEach((p) => {
                const pkgId = p.package;
                // Only include this purchase if its package exists in the current
                // category's catalog (packages[] is already filtered by category_id).
                // Do NOT fall back to p.package_details — that would let packages
                // from other categories appear in this selector.
                const pkgData = packages.find((pkg) => pkg.id === pkgId);
                if (pkgData && !seen.has(pkgId)) seen.set(pkgId, pkgData);
            });
        return Array.from(seen.values());
    }, [packages, purchasedPackages]);

    const selectedPkg = useMemo(
        () => availablePackages.find((p) => p.id === Number(selectedPackageId)) || null,
        [availablePackages, selectedPackageId],
    );

    const allCoaches = useMemo(() => {
        if (!selectedSlot) return [];
        const seen = new Set();
        return (selectedSlot.available_coaches || []).filter((c) => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
        });
    }, [selectedSlot]);

    const resolvedCoach = useMemo(() => {
        if (!selectedSlot) return null;
        if (selectedCoachId) {
            return (
                (selectedSlot.available_coaches || []).find(
                    (c) => c.id === Number(selectedCoachId),
                ) || selectedSlot.available_coaches?.[0] || null
            );
        }
        return selectedSlot.available_coaches?.[0] || null;
    }, [selectedSlot, selectedCoachId]);

    // Sessions remaining for the selected package
    const sessionsRemaining = useMemo(() => {
        if (!selectedPackageId) return null;
        const pkgId = Number(selectedPackageId);
        return purchasedPackages
            .filter(
                (p) =>
                    p.package === pkgId &&
                    p.purchase_type !== 'organization' &&
                    p.sessions_remaining > 0 &&
                    p.package_status === 'active',
            )
            .reduce((sum, p) => sum + (p.sessions_remaining || 0), 0);
    }, [selectedPackageId, purchasedPackages]);

    // ------------------------------------------------------------------ //
    // Load catalog packages + user's purchases
    // ------------------------------------------------------------------ //
    useEffect(() => {
        if (!category?.id) return;
        let cancelled = false;

        async function loadCatalog() {
            setLoadingPackages(true);
            try {
                const res = await apiClient.get(endpoints.coaching.packages, {
                    params: { category_id: category.id, is_active: true },
                });
                if (!cancelled) {
                    const all = Array.isArray(res.data) ? res.data : res.data?.results || [];
                    setPackages(all.filter((p) => p.is_active !== false));
                }
            } catch {
                if (!cancelled) setPackages([]);
            } finally {
                if (!cancelled) setLoadingPackages(false);
            }
        }

        async function loadPurchases() {
            try {
                let res;
                if (client?.id && isAdminOrStaff) {
                    res = await apiClient.get(endpoints.coaching.userPurchases, {
                        params: { user_id: client.id },
                    });
                } else {
                    res = await apiClient.get(endpoints.coaching.myPurchases);
                }
                const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
                if (!cancelled) setPurchasedPackages(data);
            } catch {
                // non-fatal — available packages will just be empty
            }
        }

        loadCatalog();
        loadPurchases();
        return () => { cancelled = true; };
    }, [category?.id, client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select the first available package
    useEffect(() => {
        if (availablePackages.length > 0 && !selectedPackageId) {
            setSelectedPackageId(String(availablePackages[0].id));
        }
    }, [availablePackages, selectedPackageId]);

    // ------------------------------------------------------------------ //
    // Fetch slots
    // ------------------------------------------------------------------ //
    const fetchSlots = useCallback(async () => {
        if (!category?.id || !date) return;
        setSlotsError('');
        setSlots([]);
        setSelectedSlot(null);
        setLoadingSlots(true);
        try {
            const params = { date };
            if (selectedPackageId) params.package_id = selectedPackageId;
            if (selectedCoachId) params.coach_id = selectedCoachId;
            const { data } = await apiClient.get(endpoints.categories.slots(category.id), { params });
            setSlots(data?.available_slots || []);
            if (!(data?.available_slots || []).length) {
                setSlotsError(data?.message || 'No available slots for this date.');
            }
        } catch (err) {
            setSlotsError(
                err?.response?.data?.error || 'Failed to load availability. Please try again.',
            );
        } finally {
            setLoadingSlots(false);
        }
    }, [category?.id, date, selectedPackageId, selectedCoachId]);

    const handleCheckAvailability = async () => {
        if (!date) { setSlotsError('Please select a date first.'); return; }
        await fetchSlots();
        setStep(STEP_SLOTS);
    };

    // ------------------------------------------------------------------ //
    // Create booking
    // ------------------------------------------------------------------ //
    const handleConfirmBooking = async () => {
        if (!selectedSlot || !resolvedCoach) return;
        setBooking(true);
        setBookingError('');
        try {
            const target = client || user;
            const payload = {
                booking_type: 'coaching',
                coaching_package: selectedPkg?.id || null,
                coach: resolvedCoach.id,
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                total_price: selectedPkg?.price || 0,
                service_category: category.id,
            };
            if (target?.id && isAdminOrStaff) {
                payload.client = target.id;
            }
            await apiClient.post(endpoints.bookings.create, payload);
            setBookingSuccess(true);
            setStep(STEP_CONFIRM);
        } catch (err) {
            const detail = err?.response?.data;
            if (typeof detail === 'string') setBookingError(detail);
            else if (Array.isArray(detail)) setBookingError(detail.join(' '));
            else if (detail && typeof detail === 'object')
                setBookingError(Object.values(detail).flat().join(' '));
            else setBookingError('Failed to create booking. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    const formatSlotTime = (isoStr) => {
        if (!isoStr) return '';
        try { return formatLocalTime(isoStr, tz); } catch { return isoStr; }
    };

    // ------------------------------------------------------------------ //
    // Success screen
    // ------------------------------------------------------------------ //
    if (bookingSuccess && step === STEP_CONFIRM) {
        return (
            <div className="text-center py-10 space-y-4">
                <div className="text-5xl">✓</div>
                <h2 className="text-2xl font-bold text-text-primary">Booking confirmed!</h2>
                <p className="text-text-secondary">
                    Your {category.customer_label || category.name} session on{' '}
                    {formatLocalDate(selectedSlot?.start_time, tz)} at{' '}
                    {formatSlotTime(selectedSlot?.start_time)} has been booked.
                </p>
                <Button
                    onClick={() => {
                        setBookingSuccess(false);
                        setStep(STEP_FORM);
                        setDate('');
                        setSlots([]);
                        setSelectedSlot(null);
                        setSelectedCoachId('');
                    }}
                >
                    Book another session
                </Button>
            </div>
        );
    }

    // ------------------------------------------------------------------ //
    // Render
    // ------------------------------------------------------------------ //
    return (
        <div className="space-y-6">
            {/* ---- Package & Date Form ---- */}
            <div className="bg-surface rounded-card shadow-card p-6 space-y-5">
                <h2 className="text-lg font-bold text-text-primary">
                    {category.customer_label || category.name}
                </h2>

                {loadingPackages ? (
                    <p className="text-sm text-text-secondary">Loading packages…</p>
                ) : (
                    <>
                        {/* Package selector — only owned packages with sessions left */}
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Select Package
                            </label>

                            {availablePackages.length === 0 ? (
                                /* Empty state — mirrors CoachingBooking */
                                <div className="border border-border rounded-button p-6 text-center bg-background">
                                    <p className="text-text-secondary mb-4">
                                        {client
                                            ? `${client.first_name} doesn't have any packages with available sessions for ${category.customer_label || category.name}.`
                                            : `You don't have any packages with available sessions for ${category.customer_label || category.name}.`
                                        }
                                    </p>
                                    {!client && (
                                        <Button
                                            onClick={() => navigate('/packages')}
                                            variant="primary"
                                            className="w-full"
                                        >
                                            Browse Packages
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <select
                                    className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    value={selectedPackageId}
                                    onChange={(e) => {
                                        setSelectedPackageId(e.target.value);
                                        setSlots([]);
                                        setSelectedSlot(null);
                                        if (step === STEP_SLOTS) setStep(STEP_FORM);
                                    }}
                                >
                                    <option value="" disabled>Select a package</option>
                                    {availablePackages.map((pkg) => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.title}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Session info (shown once a package is selected) */}
                        {selectedPkg && (
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Your session duration will be
                                </label>
                                <input
                                    type="text"
                                    value={`${selectedPkg.session_duration_minutes} minutes`}
                                    disabled
                                    className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-secondary"
                                />
                                {sessionsRemaining !== null && (
                                    <p className="text-xs text-text-secondary mt-1">
                                        Sessions remaining: <span className="font-semibold">{sessionsRemaining}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Date + Check Availability — only after a package is chosen */}
                        {availablePackages.length > 0 && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Date
                                    </label>
                                    <DateInput
                                        value={date}
                                        onChange={(val) => {
                                            setDate(val);
                                            setSlots([]);
                                            setSelectedSlot(null);
                                            if (step === STEP_SLOTS) setStep(STEP_FORM);
                                        }}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <Button
                                    onClick={handleCheckAvailability}
                                    disabled={!date || !selectedPackageId || loadingSlots}
                                    className="w-full"
                                >
                                    {loadingSlots ? 'Loading availability…' : 'Check availability'}
                                </Button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* ---- Slot Picker ---- */}
            {step === STEP_SLOTS && (
                <div className="bg-surface rounded-card shadow-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-text-primary">
                            Available slots — {date}
                        </h3>
                        <button
                            type="button"
                            className="text-xs text-primary underline"
                            onClick={() => {
                                setStep(STEP_FORM);
                                setSlots([]);
                                setSelectedSlot(null);
                            }}
                        >
                            ← Change date
                        </button>
                    </div>

                    {loadingSlots && (
                        <p className="text-sm text-text-secondary">Loading slots…</p>
                    )}

                    {!loadingSlots && slotsError && (
                        <p className="text-sm text-error bg-error/10 rounded-card p-3">{slotsError}</p>
                    )}

                    {!loadingSlots && !slotsError && slots.length > 0 && (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {slots.map((slot) => {
                                    const isSelected = selectedSlot?.start_time === slot.start_time;
                                    return (
                                        <button
                                            key={slot.start_time}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSlot(slot);
                                                setSelectedCoachId('');
                                            }}
                                            className={`py-2 px-3 rounded-button text-sm font-medium border transition-colors ${
                                                isSelected
                                                    ? 'bg-primary text-white border-primary'
                                                    : 'bg-background text-text-primary border-border hover:border-primary/50 hover:bg-primary/5'
                                            }`}
                                        >
                                            {formatSlotTime(slot.start_time)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Coach selector (optional, only when multiple available) */}
                            {selectedSlot && allCoaches.length > 1 && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Coach (optional)
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        value={selectedCoachId}
                                        onChange={(e) => setSelectedCoachId(e.target.value)}
                                    >
                                        <option value="">— Any available coach —</option>
                                        {allCoaches.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Booking summary + confirm */}
                            {selectedSlot && resolvedCoach && (
                                <div className="border border-border rounded-card p-4 bg-background space-y-2">
                                    <p className="text-sm font-semibold text-text-primary">Booking summary</p>
                                    <ul className="text-sm text-text-secondary space-y-1">
                                        <li>
                                            <span className="font-medium text-text-primary">Category:</span>{' '}
                                            {category.customer_label || category.name}
                                        </li>
                                        <li>
                                            <span className="font-medium text-text-primary">Package:</span>{' '}
                                            {selectedPkg?.title || '—'}
                                        </li>
                                        <li>
                                            <span className="font-medium text-text-primary">Date:</span>{' '}
                                            {formatLocalDate(selectedSlot.start_time, tz)}
                                        </li>
                                        <li>
                                            <span className="font-medium text-text-primary">Time:</span>{' '}
                                            {formatSlotTime(selectedSlot.start_time)} – {formatSlotTime(selectedSlot.end_time)}
                                        </li>
                                        <li>
                                            <span className="font-medium text-text-primary">Coach:</span>{' '}
                                            {resolvedCoach.name}
                                        </li>
                                    </ul>

                                    {bookingError && (
                                        <p className="text-sm text-error bg-error/10 rounded-card p-2 mt-2">
                                            {bookingError}
                                        </p>
                                    )}

                                    <Button
                                        className="w-full mt-3"
                                        onClick={handleConfirmBooking}
                                        disabled={booking}
                                    >
                                        {booking ? 'Confirming…' : 'Confirm booking'}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default DynamicCategoryBooking;
