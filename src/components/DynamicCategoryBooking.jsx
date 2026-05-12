/**
 * Phase E — Generic staff-based booking for non-legacy service categories
 * (legacy_booking_type = null).
 *
 * UI and flow are intentionally identical to CoachingBooking:
 *   Step 1 (form)    → package + date + coach selector → "Check Availability"
 *   Step 2 (slots)   → time-slot grid → click to select
 *   Step 3 (summary) → confirm details → "Confirm Booking"
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getAvailableSimulatorHours } from '../store/slices/bookingSlice';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import { formatLocalTime, formatLocalDate, getTodayInTimezone } from '../utils/timezoneUtils';
import SquarePaymentModal from './SquarePaymentModal';

function DynamicCategoryBooking({ category, client, onBookingSuccess }) {
    const { user: reduxUser, locationTimezone } = useAppSelector((s) => s.auth);
    const { totalAvailableHours, availableHoursLoading } = useAppSelector((s) => s.booking);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();

    const tz = locationTimezone || 'America/Halifax';
    const user = reduxUser || JSON.parse(localStorage.getItem('user') || '{}') || {};
    const userRole = (user.role || '').toLowerCase();
    const isAdminOrStaff = userRole !== 'client' || !!user.is_superuser;

    // ── Step management (mirrors CoachingBooking) ────────────────────────── //
    const [currentStep, setCurrentStep] = useState('form');

    // ── Category Assets ──────────────────────────────────────────────────── //
    const [assets, setAssets] = useState([]);
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [loadingAssets, setLoadingAssets] = useState(false);

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(selectedAssetId)) || null,
        [assets, selectedAssetId],
    );
    // When an asset-only (needs_staff=False) asset is selected, no package/coach needed
    const isAssetOnly = selectedAsset && !selectedAsset.needs_staff;

    // Square payment modal state
    const [squarePayment, setSquarePayment] = useState({
        isOpen: false,
        tempId: null,
        amount: null,
        paymentType: 'asset',
    });

    // ── Catalog packages + user purchases ───────────────────────────────── //
    const [packages, setPackages] = useState([]);
    const [purchasedPackages, setPurchasedPackages] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(false);

    // ── Form state ───────────────────────────────────────────────────────── //
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [date, setDate] = useState('');
    const [selectedCoachId, setSelectedCoachId] = useState('');
    // Duration for asset-only bookings (mirrors simulator duration selector)
    const [assetDuration, setAssetDuration] = useState(60);

    // ── Slots ────────────────────────────────────────────────────────────── //
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    // ── Selected slot ────────────────────────────────────────────────────── //
    const [selectedSlot, setSelectedSlot] = useState(null);

    // ── Toast (mirrors CoachingBooking) ─────────────────────────────────── //
    const [toast, setToast] = useState({ show: false, message: '' });

    // ── Payment method (asset-only bookings) ─────────────────────────────── //
    const [usePrepaidHours, setUsePrepaidHours] = useState(null); // null=not chosen, true=prepaid, false=pay

    // ── Booking state ────────────────────────────────────────────────────── //
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // ── Back-navigation memory ───────────────────────────────────────────── //
    const [previousDate, setPreviousDate] = useState('');
    const [previousPackageId, setPreviousPackageId] = useState('');
    const [previousCoachId, setPreviousCoachId] = useState('');

    // ── Derived ─────────────────────────────────────────────────────────── //

    /** Packages the user can actually use: active purchases with sessions left,
     *  restricted to this category's catalog. Same logic as CoachingBooking. */
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
                // Only include if the package exists in this category's catalog.
                // Do NOT fall back to p.package_details — prevents cross-category leakage.
                const pkgData = packages.find((pkg) => pkg.id === pkgId);
                if (pkgData && !seen.has(pkgId)) seen.set(pkgId, pkgData);
            });
        return Array.from(seen.values());
    }, [packages, purchasedPackages]);

    const selectedPkg = useMemo(
        () => availablePackages.find((p) => p.id === Number(selectedPackageId)) || null,
        [availablePackages, selectedPackageId],
    );

    const coaches = useMemo(
        () => selectedPkg?.staff_members_details || [],
        [selectedPkg],
    );

    const sessionsRemaining = useMemo(() => {
        if (!selectedPackageId) return 0;
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

    const hasSessions = selectedPackageId ? sessionsRemaining > 0 : false;
    // For package-based bookings use the package's session length; for asset-only use the user-chosen duration
    const duration = isAssetOnly ? assetDuration : (selectedPkg?.session_duration_minutes || 60);

    // Date bounds (mirrors CoachingBooking: clients must book ≥1 day ahead)
    const todayStr = getTodayInTimezone(tz);
    const minDateString = isAdminOrStaff
        ? todayStr
        : moment.tz(todayStr, tz).add(1, 'days').format('YYYY-MM-DD');
    const maxDateString = moment.tz(todayStr, tz).add(30, 'days').format('YYYY-MM-DD');

    // ── Load catalog + purchases + assets ────────────────────────────────── //
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
                // non-fatal
            }
        }

        async function loadAssets() {
            setLoadingAssets(true);
            try {
                const res = await apiClient.get(endpoints.categories.assets.list(category.id));
                if (!cancelled) {
                    const data = (Array.isArray(res.data) ? res.data : res.data?.results || []).filter(a => a.is_active);
                    setAssets(data);
                    // Auto-select first asset if only asset-only assets exist
                    if (data.length > 0 && !selectedAssetId) {
                        setSelectedAssetId(String(data[0].id));
                    }
                }
            } catch {
                if (!cancelled) setAssets([]);
            } finally {
                if (!cancelled) setLoadingAssets(false);
            }
        }

        loadCatalog();
        loadPurchases();
        loadAssets();
        return () => { cancelled = true; };
    }, [category?.id, client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select first available package (mirrors CoachingBooking behaviour)
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current && availablePackages.length > 0 && !selectedPackageId) {
            setSelectedPackageId(String(availablePackages[0].id));
            isFirstMount.current = false;
        }
    }, [availablePackages, selectedPackageId]);

    // Reset slots + step when package changes
    const prevPkgRef = useRef(null);
    useEffect(() => {
        if (prevPkgRef.current !== selectedPackageId) {
            setSlots([]);
            setSlotsError('');
            setSelectedSlot(null);
            setSelectedCoachId('');
            if (currentStep !== 'form') setCurrentStep('form');
            prevPkgRef.current = selectedPackageId;
        }
    }, [selectedPackageId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Slot helpers (mirrors CoachingBooking) ───────────────────────────── //
    const isSlotDisabled = useCallback(
        (slot) => {
            const start = new Date(slot.start_time);
            const requestedEnd = new Date(start.getTime() + duration * 60000);
            const maxEnd = slot.availability_end_time
                ? new Date(slot.availability_end_time)
                : new Date(slot.end_time);
            return requestedEnd > maxEnd;
        },
        [duration],
    );

    // ── Check availability ───────────────────────────────────────────────── //
    const checkAvailability = useCallback(async () => {
        if (!date) {
            openPopup({ type: 'warning', title: 'Select a date', message: 'Please choose a date before checking availability.' });
            return;
        }

        // Asset-only booking: no package needed
        if (!isAssetOnly) {
            if (!selectedPackageId) {
                openPopup({ type: 'warning', title: 'Select a package', message: 'Please choose a package before checking availability.' });
                return;
            }
            if (!hasSessions) {
                openPopup({ type: 'warning', title: 'No sessions remaining', message: 'You are out of sessions for this package. Please purchase another package to continue.' });
                return;
            }
        }

        // Store for back-navigation
        setPreviousDate(date);
        setPreviousPackageId(selectedPackageId);
        setPreviousCoachId(selectedCoachId);

        setSlotsError('');
        setSlots([]);
        setSelectedSlot(null);
        setToast({ show: false, message: '' });
        setLoadingSlots(true);

        try {
            const params = { date };
            if (selectedAssetId) params.asset_id = selectedAssetId;
            if (!isAssetOnly) {
                if (selectedPackageId) params.package_id = selectedPackageId;
                if (selectedCoachId) params.coach_id = selectedCoachId;
            } else {
                // Send chosen duration so backend generates correctly-sized slots
                params.duration = assetDuration;
            }
            const { data } = await apiClient.get(endpoints.categories.slots(category.id), { params });
            const fetched = data?.available_slots || [];
            setSlots(fetched);

            if (fetched.length === 0) {
                const msg = data?.message || 'No available time slots found for the selected date. Please try a different date.';
                setToast({ show: true, message: msg });
                setTimeout(() => setToast({ show: false, message: '' }), 5000);
                setCurrentStep('form');
            } else {
                setCurrentStep('slots');
            }
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to load availability. Please try again.';
            setToast({ show: true, message: msg });
            setTimeout(() => setToast({ show: false, message: '' }), 5000);
        } finally {
            setLoadingSlots(false);
        }
    }, [category?.id, date, selectedPackageId, selectedCoachId, selectedAssetId, assetDuration, isAssetOnly, hasSessions, openPopup]);

    // Refresh available prepaid hours each time the payment step is entered
    useEffect(() => {
        if (currentStep === 'payment' && selectedSlot && isAssetOnly) {
            const params = { use_organization: true };
            if (client?.id) params.user_id = client.id;
            if (category?.id) params.category_id = category.id;
            dispatch(getAvailableSimulatorHours(params));
        }
    }, [currentStep, selectedSlot, isAssetOnly, dispatch, client, category?.id]);

    // ── Back navigation (mirrors CoachingBooking) ────────────────────────── //
    const handleBack = () => {
        if (currentStep === 'payment') {
            // payment step only exists for asset-only priced bookings
            setUsePrepaidHours(null);
            setCurrentStep('slots');
        } else if (currentStep === 'summary') {
            setSelectedSlot(null);
            setCurrentStep('slots');
        } else if (currentStep === 'slots') {
            if (previousDate) setDate(previousDate);
            if (previousPackageId) setSelectedPackageId(previousPackageId);
            if (previousCoachId) setSelectedCoachId(previousCoachId);
            setSlots([]);
            setSelectedSlot(null);
            setCurrentStep('form');
        }
    };

    // ── Slot selection ───────────────────────────────────────────────────── //
    const handleSlotSelect = (slot) => {
        if (isSlotDisabled(slot)) return;
        setSelectedSlot(slot);
        // Asset-only priced bookings get a payment-method step before summary
        const assetPrice = selectedAsset?.price_per_hour ? parseFloat(selectedAsset.price_per_hour) : 0;
        if (isAssetOnly && assetPrice > 0) {
            setUsePrepaidHours(null);
            setCurrentStep('payment');
        } else {
            setCurrentStep('summary');
        }
    };

    // ── Submit booking ───────────────────────────────────────────────────── //
    const submitBooking = async () => {
        if (!selectedSlot) return;
        setBookingLoading(true);
        try {
            const coachData = selectedSlot.available_coaches?.[0];
            const target = client || user;
            // For asset-only bookings recalculate end_time from chosen duration (mirrors simulator pattern)
            const computedEndTime = isAssetOnly
                ? new Date(new Date(selectedSlot.start_time).getTime() + duration * 60000).toISOString()
                : selectedSlot.end_time;
            const assetTotalPrice = selectedAsset?.price_per_hour
                ? (parseFloat(selectedAsset.price_per_hour) * (duration / 60)).toFixed(2)
                : '0.00';
            const payload = {
                booking_type: 'coaching',
                coaching_package: isAssetOnly ? null : (selectedPkg?.id || null),
                coach: isAssetOnly ? null : (coachData?.id || null),
                start_time: selectedSlot.start_time,
                end_time: computedEndTime,
                total_price: isAssetOnly
                    ? (usePrepaidHours ? '0.00' : assetTotalPrice)
                    : (selectedPkg?.price || 0),
                service_category: category.id,
                ...(selectedAssetId && { category_asset: parseInt(selectedAssetId) }),
                ...(isAssetOnly && usePrepaidHours !== null && { use_prepaid_hours: usePrepaidHours }),
            };
            if (target?.id && isAdminOrStaff) {
                payload.client = target.id;
            }
            const response = await apiClient.post(endpoints.bookings.create, payload);

            // Check if this is a redirect response (temp booking created for payment)
            if (response.data && response.data.temp_id) {
                console.log('✅ Temp booking created, opening Square payment modal:', response.data);
                setSquarePayment({
                    isOpen: true,
                    tempId: response.data.temp_id,
                    amount: response.data.total_price,
                    paymentType: isAssetOnly ? `asset:${selectedAsset?.id}` : (response.data.payment_type || 'asset'),
                });
                return;
            }

            setBookingSuccess(true);
            setCurrentStep('form');
            setDate('');
            setSelectedPackageId('');
            setSelectedCoachId('');
            setSlots([]);
            setSelectedSlot(null);
            setUsePrepaidHours(null);
            if (onBookingSuccess) setTimeout(onBookingSuccess, 2000);
        } catch (err) {
            const detail = err?.response?.data;
            let msg = 'Failed to create booking. Please try again.';
            if (typeof detail === 'string') msg = detail;
            else if (Array.isArray(detail)) msg = detail.join(' ');
            else if (detail && typeof detail === 'object')
                msg = Object.values(detail).flat().join(' ');
            openPopup({ type: 'error', title: 'Booking failed', message: msg });
        } finally {
            setBookingLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedSlot) {
            openPopup({ type: 'warning', title: 'Select a slot', message: 'Please choose a time slot before confirming.' });
            return;
        }
        // Only check coach + session requirements for staff-based bookings
        if (!isAssetOnly) {
            if (!selectedSlot.available_coaches?.length) {
                openPopup({ type: 'warning', title: 'No coach available', message: 'No coach is available for this slot. Please select another time.' });
                return;
            }
            if (!hasSessions) {
                openPopup({ type: 'warning', title: 'No sessions remaining', message: 'You are out of sessions for this package. Please purchase another package.' });
                return;
            }
        }
        if (client) {
            openPopup({
                type: 'warning',
                title: 'Confirm Booking On Behalf',
                message: `Are you sure you want to book a ${category.customer_label || category.name} session for ${client.first_name || 'Client'} ${client.last_name || ''}?`,
                confirmText: 'Yes, Book It',
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: submitBooking,
            });
        } else {
            await submitBooking();
        }
    };

    // ── Success screen (mirrors CoachingBooking) ─────────────────────────── //
    if (bookingSuccess) {
        return (
            <div className="bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card p-8 text-center">
                <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-status-confirmed-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-status-confirmed-text mb-2">Booking Confirmed!</h3>
                <p className="text-text-secondary mb-6">
                    Your {category.customer_label || category.name} session has been booked successfully.
                </p>
                <Button
                    onClick={() => {
                        setBookingSuccess(false);
                        setSelectedSlot(null);
                        setDate('');
                        setSelectedPackageId('');
                        setSelectedCoachId('');
                    }}
                    variant="primary"
                >
                    Book Another Session
                </Button>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────── //
    return (
        <div className="space-y-6">

            {/* Toast notification (identical to CoachingBooking) */}
            {toast.show && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg max-w-md">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm text-yellow-700">{toast.message}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                                <button onClick={() => setToast({ show: false, message: '' })} className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none">
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 1: Form ─────────────────────────────────────────────── */}
            {currentStep === 'form' && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <h2 className="text-xl font-bold text-text-primary mb-4">
                        Book {category.customer_label || category.name} Session
                    </h2>

                    {loadingPackages ? (
                        <p className="text-sm text-text-secondary py-4">Loading packages…</p>
                    ) : (
                        <div className="space-y-4">

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
                                <DateInput
                                    value={date}
                                    onChange={setDate}
                                    min={minDateString}
                                    max={maxDateString}
                                    placeholder="Select date"
                                    className="cursor-pointer"
                                />
                            </div>

                            {/* Asset selector — shown when category has assets */}
                            {assets.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">Select Asset</label>
                                    {loadingAssets ? (
                                        <p className="text-sm text-text-secondary">Loading assets…</p>
                                    ) : (
                                        <select
                                            value={selectedAssetId}
                                            onChange={(e) => {
                                                setSelectedAssetId(e.target.value);
                                                setSelectedPackageId('');
                                                setSelectedCoachId('');
                                                setAssetDuration(60);
                                                setSlots([]);
                                                setSelectedSlot(null);
                                            }}
                                            className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        >
                                            <option value="">-- Select an asset --</option>
                                            {assets.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name}{a.price_per_hour ? ` — $${parseFloat(a.price_per_hour).toFixed(2)}/hr` : ''}
                                                    {a.needs_staff ? ' (with staff)' : ' (self-booking)'}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {selectedAsset && !selectedAsset.needs_staff && (
                                        <p className="text-xs text-text-secondary mt-1">
                                            This asset is bookable without a coach. Pick a time slot below to confirm.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Package selector — only shown when no asset selected, or asset needs_staff=True */}
                            {!isAssetOnly && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">Select Package</label>
                                        {availablePackages.length === 0 ? (
                                            <div className="border border-border rounded-button p-6 text-center bg-background">
                                                <p className="text-text-secondary mb-4">
                                                    {client
                                                        ? `${client.first_name} doesn't have any packages with available sessions for ${category.customer_label || category.name}.`
                                                        : `You don't have any packages with available sessions for ${category.customer_label || category.name}.`}
                                                </p>
                                                {!client && (
                                                    <Button onClick={() => navigate('/packages')} variant="primary" className="w-full">
                                                        Add Package
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <select
                                                value={selectedPackageId}
                                                onChange={(e) => {
                                                    setSelectedPackageId(e.target.value);
                                                    setSelectedCoachId('');
                                                }}
                                                className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            >
                                                <option value="" disabled>Select a package</option>
                                                {availablePackages.map((pkg) => (
                                                    <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {availablePackages.length > 0 && (
                                        <>
                                            {/* Session duration (read-only) */}
                                            <div>
                                                <label className="block text-sm font-medium text-text-primary mb-2">
                                                    Your session duration will be
                                                </label>
                                                <input
                                                    type="text"
                                                    value={selectedPkg ? `${duration} minutes` : 'Select a package to see session length'}
                                                    disabled
                                                    className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-secondary"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    Duration is locked to your package and consumes one session.
                                                </p>
                                            </div>

                                            {/* Sessions remaining */}
                                            {selectedPackageId && (
                                                <div className="border border-border rounded-card bg-background p-4 space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm text-text-secondary">Sessions remaining</p>
                                                            <p className={`text-2xl font-bold ${hasSessions ? 'text-status-confirmed-text' : 'text-danger'}`}>
                                                                {sessionsRemaining}
                                                            </p>
                                                        </div>
                                                        {!client && (
                                                            <Button
                                                                type="button"
                                                                onClick={() => navigate('/packages')}
                                                                variant="accent"
                                                            >
                                                                {hasSessions ? 'Add More Sessions' : 'Add Package Sessions'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {!hasSessions && (
                                                        <p className="text-sm text-danger">
                                                            {client
                                                                ? 'Cannot access packages while booking for a client. Please reset booking flow first.'
                                                                : 'You are out of sessions. Add another package bundle before booking.'}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Coach selector */}
                                            {selectedPackageId && (
                                                <div>
                                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                                        Select Coach
                                                    </label>
                                                    {coaches.length > 0 ? (
                                                        <select
                                                            value={selectedCoachId}
                                                            onChange={(e) => setSelectedCoachId(e.target.value)}
                                                            className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                        >
                                                            <option value="">All Coaches in Package</option>
                                                            {coaches.map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.first_name} {c.last_name} ({c.email})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <p className="text-sm text-danger">No coaches are assigned to this package yet.</p>
                                                    )}
                                                </div>
                                            )}

                                            <Button
                                                onClick={checkAvailability}
                                                disabled={loadingSlots || (!!selectedPackageId && !hasSessions)}
                                                variant="primary"
                                                className="w-full py-3"
                                            >
                                                {loadingSlots ? 'Checking Availability…' : 'Check Availability'}
                                            </Button>
                                        </>
                                    )}
                                </>)} {/* end !isAssetOnly */}

                            {/* Duration selector + Check availability for asset-only bookings */}
                            {isAssetOnly && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Session Duration
                                        </label>
                                        <select
                                            value={assetDuration}
                                            onChange={(e) => {
                                                setAssetDuration(parseInt(e.target.value));
                                                setSelectedSlot(null);
                                            }}
                                            className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary"
                                        >
                                            <option value={60}>1 hour</option>
                                            <option value={120}>2 hours</option>
                                            <option value={180}>3 hours</option>
                                        </select>
                                    </div>
                                    <Button
                                        onClick={checkAvailability}
                                        disabled={loadingSlots || !date}
                                        variant="primary"
                                        className="w-full py-3"
                                    >
                                        {loadingSlots ? 'Checking Availability…' : 'Check Availability'}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 2: Slots ─────────────────────────────────────────────── */}
            {currentStep === 'slots' && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Available Time Slots</h2>
                        <Button onClick={handleBack} variant="secondary" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </Button>
                    </div>

                    {loadingSlots ? (
                        <p className="text-sm text-text-secondary py-8 text-center">Loading slots…</p>
                    ) : slots.length > 0 ? (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                                <h3 className="text-lg font-bold text-text-primary">Select a Time Slot</h3>
                                <div className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
                                    <span className="font-medium">Book session for</span>
                                    <span className="px-2 py-1 bg-primary-light/20 text-primary rounded-badge font-semibold">
                                        {date ? moment(date, 'YYYY-MM-DD').format('MMMM D, YYYY') : ''}
                                    </span>
                                    <span className="text-text-secondary/50">|</span>
                                    <span className="px-2 py-1 bg-status-confirmed-bg text-status-confirmed-text rounded-badge font-semibold">
                                        {duration >= 60
                                            ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}`
                                            : `${duration} min`}
                                    </span>
                                    {selectedPkg && (
                                        <>
                                            <span className="text-text-secondary/50">|</span>
                                            <span className="px-2 py-1 bg-status-pending-bg text-status-pending-text rounded-badge font-semibold">
                                                {selectedPkg.title}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                                {slots.map((slot, index) => {
                                    const disabled = isSlotDisabled(slot);
                                    const isSelected =
                                        selectedSlot &&
                                        new Date(selectedSlot.start_time).getTime() ===
                                        new Date(slot.start_time).getTime();

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 border-2 rounded-card transition duration-200 relative group ${disabled
                                                ? 'border-danger/30 bg-red-50 cursor-not-allowed opacity-60'
                                                : isSelected
                                                    ? 'border-primary bg-primary-light/20 shadow-card-hover cursor-pointer'
                                                    : 'border-border hover:border-primary hover:bg-background cursor-pointer'
                                                }`}
                                            onClick={() => !disabled && handleSlotSelect(slot)}
                                        >
                                            <div className={`text-lg font-semibold ${disabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                                {formatLocalTime(slot.start_time, tz)}
                                            </div>
                                            <div className={`text-sm ${disabled ? 'text-text-secondary/40' : 'text-text-secondary'}`}>
                                                {duration} minutes
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Coach assigned at confirmation
                                            </div>
                                            {disabled && (
                                                <div className="mt-2 pt-2 border-t border-danger/30">
                                                    <div className="text-xs text-danger font-medium">Exceeds availability</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-text-secondary">
                            <p>No available time slots found. Please try a different date or package.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Payment Step (asset-only, priced bookings) ────────────────── */}
            {currentStep === 'payment' && selectedSlot && isAssetOnly && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-text-primary">Payment Method</h2>
                        <Button onClick={handleBack} variant="secondary" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </Button>
                    </div>

                    {/* Payment choice */}
                    <div className="bg-status-personal-bg border border-status-personal-text/20 rounded-card p-4 mb-4">
                        <p className="text-status-personal-text font-semibold mb-2">Payment Method</p>
                        {availableHoursLoading ? (
                            <p className="text-sm text-text-secondary mb-3">Loading available hours…</p>
                        ) : totalAvailableHours > 0 ? (
                            <p className="text-sm text-status-personal-text/80 mb-3">
                                You have {totalAvailableHours.toFixed(2)} pre-paid hour{totalAvailableHours !== 1 ? 's' : ''} available
                            </p>
                        ) : (
                            <p className="text-sm text-text-secondary mb-3">
                                No pre-paid hours available. You can pay for this session directly.
                            </p>
                        )}
                        <div className="space-y-2">
                            {totalAvailableHours > 0 && (
                                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                    <input
                                        type="radio"
                                        name="assetPaymentMethod"
                                        className="h-4 w-4 text-status-personal-text"
                                        checked={usePrepaidHours === true}
                                        onChange={() => setUsePrepaidHours(true)}
                                        disabled={availableHoursLoading}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-text-primary">Use Pre-paid Hours</div>
                                        <div className="text-xs text-text-secondary">
                                            Use {(duration / 60).toFixed(2)} hour{duration / 60 !== 1 ? 's' : ''} from your {totalAvailableHours.toFixed(2)} available — no charge
                                        </div>
                                    </div>
                                </label>
                            )}
                            <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                <input
                                    type="radio"
                                    name="assetPaymentMethod"
                                    className="h-4 w-4 text-primary"
                                    checked={usePrepaidHours === false}
                                    onChange={() => setUsePrepaidHours(false)}
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-text-primary">Pay for Session</div>
                                    <div className="text-xs text-text-secondary">
                                        ${selectedAsset?.price_per_hour
                                            ? (parseFloat(selectedAsset.price_per_hour) * (duration / 60)).toFixed(2)
                                            : '0.00'} — redirected to payment gateway
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Booking summary */}
                    <div className="bg-background rounded-card p-6 mb-4">
                        <h4 className="text-lg font-bold text-text-primary mb-4">Booking Summary</h4>
                        <div className="space-y-2">
                            <p className="text-text-primary">
                                <span className="font-medium">Category:</span> {category.customer_label || category.name}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Asset:</span> {selectedAsset?.name}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Date:</span> {formatLocalDate(selectedSlot.start_time, tz)}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Time:</span>{' '}
                                {formatLocalTime(selectedSlot.start_time, tz)} – {formatLocalTime(
                                    new Date(new Date(selectedSlot.start_time).getTime() + duration * 60000).toISOString(), tz
                                )}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Duration:</span> {duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ''}` : `${duration}min`}
                            </p>
                        </div>
                        {usePrepaidHours === true && (
                            <div className="mt-3 text-sm text-status-confirmed-text bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card p-3">
                                This booking will use {(duration / 60).toFixed(2)} hour{duration / 60 !== 1 ? 's' : ''} from your pre-paid hours. No payment required.
                            </div>
                        )}
                        {usePrepaidHours === false && (
                            <div className="mt-3 text-sm text-text-secondary bg-background border border-border rounded-card p-3">
                                <p className="font-semibold text-text-primary">You will be redirected to the payment gateway.</p>
                            </div>
                        )}
                        {usePrepaidHours === null && (
                            <div className="mt-3 text-sm text-warning bg-warning-bg border border-warning-text/20 rounded-card p-3">
                                Please select a payment method above.
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleBooking}
                        disabled={bookingLoading || usePrepaidHours === null}
                        loading={bookingLoading}
                        variant="primary"
                        className="w-full py-3 flex items-center justify-center gap-2"
                    >
                        {bookingLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Processing…</span>
                            </>
                        ) : usePrepaidHours === true ? 'Confirm Booking (Use Pre-paid Hours)' : 'Proceed to Payment'}
                    </Button>
                </div>
            )}

            {/* ── Step 3: Summary ───────────────────────────────────────────── */}
            {currentStep === 'summary' && selectedSlot && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Booking Summary</h2>
                        <Button onClick={handleBack} variant="secondary" className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </Button>
                    </div>
                    <div className="bg-background rounded-card p-6">
                        <h4 className="text-lg font-bold text-text-primary mb-4">Confirm Your Booking</h4>
                        <div className="space-y-2 mb-4">
                            <p className="text-text-primary">
                                <span className="font-medium">Category:</span> {category.customer_label || category.name}
                            </p>
                            {selectedAsset && (
                                <p className="text-text-primary">
                                    <span className="font-medium">Asset:</span> {selectedAsset.name}
                                    {selectedAsset.price_per_hour && ` ($${parseFloat(selectedAsset.price_per_hour).toFixed(2)}/hr)`}
                                </p>
                            )}
                            <p className="text-text-primary">
                                <span className="font-medium">Date:</span> {formatLocalDate(selectedSlot.start_time, tz)}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Time:</span>{' '}
                                {formatLocalTime(selectedSlot.start_time, tz)} – {formatLocalTime(
                                    isAssetOnly
                                        ? new Date(new Date(selectedSlot.start_time).getTime() + duration * 60000).toISOString()
                                        : selectedSlot.end_time,
                                    tz
                                )}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Duration:</span> {duration} minutes
                            </p>
                            {!isAssetOnly && selectedSlot.available_coaches?.length > 0 && (
                                <div className="mt-4">
                                    <p className="font-medium text-text-primary mb-2">Available Coaches:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {selectedSlot.available_coaches.map((c, idx) => (
                                            <li key={idx} className="text-text-secondary">{c.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {!isAssetOnly && selectedPackageId && (
                                <p className="text-text-primary">
                                    <span className="font-medium">Sessions left after booking:</span>{' '}
                                    {Math.max(sessionsRemaining - 1, 0)}
                                </p>
                            )}
                        </div>
                        <Button
                            onClick={handleBooking}
                            disabled={bookingLoading}
                            variant="primary"
                            className="w-full py-3 flex items-center justify-center gap-2"
                        >
                            {bookingLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Processing…</span>
                                </>
                            ) : (
                                'Confirm Booking'
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => { const fn = popup.onConfirm; closePopup(); if (fn) await fn(); } : closePopup}
                onClose={closePopup}
            />

            {/* Square Payment Modal */}
            <SquarePaymentModal
                isOpen={squarePayment.isOpen}
                onClose={() => setSquarePayment({ ...squarePayment, isOpen: false })}
                tempId={squarePayment.tempId}
                amount={squarePayment.amount}
                paymentType={squarePayment.paymentType}
                onSuccess={() => {
                    setSquarePayment({ ...squarePayment, isOpen: false });
                    setBookingSuccess(true);
                    setCurrentStep('form');
                    setDate('');
                    setSelectedPackageId('');
                    setSelectedCoachId('');
                    setSlots([]);
                    setSelectedSlot(null);
                    if (onBookingSuccess) onBookingSuccess();
                }}
            />
        </div>
    );
}

export default DynamicCategoryBooking;
