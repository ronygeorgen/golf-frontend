import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkCoachingAvailability, createBooking, clearAvailability } from '../store/slices/bookingSlice';
import { getActiveCoachingPackages, getMyPackagePurchases, getOrganizationPackages } from '../store/slices/coachingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import { BookingSlotsSkeleton, FormSkeleton } from './skeletons/SkeletonLoader';

function CoachingBooking() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { availability, loading: bookingLoading } = useAppSelector((state) => state.booking);
    const { packages, purchases, organizationPackages, purchaseSubmitting, purchasesLoading, organizationPackagesLoading } = useAppSelector((state) => state.coaching);
    
    const DEFAULT_DURATION = 60;
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(DEFAULT_DURATION); // Duration in minutes
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [packageType, setPackageType] = useState('personal'); // 'personal' or 'organization'
    
    // Step management: 'form' -> 'slots' -> 'summary'
    const [currentStep, setCurrentStep] = useState('form');
    
    // Store previous data for back navigation
    const [previousDate, setPreviousDate] = useState('');
    const [previousPackage, setPreviousPackage] = useState(null);
    const [previousCoach, setPreviousCoach] = useState(null);
    
    // Track if this is the first mount to avoid clearing availability on remount
    const isFirstMount = useRef(true);
    const previousPackageRef = useRef(null);
    
    const selectedPackageData = selectedPackage
        ? packages.find((pkg) => pkg.id === selectedPackage)
        : null;
    
    // Filter packages to only show those the user has purchases for (with sessions remaining)
    // This prevents staff from seeing packages they referred to clients
    const availablePackages = useMemo(() => {
        if (!purchases || purchases.length === 0) {
            return [];
        }
        
        // Get unique package IDs from purchases where user has sessions remaining
        const packageIdsWithSessions = new Set();
        
        // Personal/gifted purchases
        purchases
            .filter((purchase) => 
                purchase.purchase_type !== 'organization' &&
                purchase.sessions_remaining > 0 &&
                purchase.package_status === 'active'
            )
            .forEach((purchase) => {
                packageIdsWithSessions.add(purchase.package);
            });
        
        // Organization packages
        if (organizationPackages && organizationPackages.length > 0) {
            organizationPackages
                .filter((orgPkg) => 
                    orgPkg.sessions_remaining > 0 &&
                    orgPkg.package_status === 'active'
                )
                .forEach((orgPkg) => {
                    packageIdsWithSessions.add(orgPkg.package);
                });
        }
        
        // Filter packages to only include those the user has purchases for
        return packages.filter((pkg) => packageIdsWithSessions.has(pkg.id));
    }, [packages, purchases, organizationPackages]);
    
    // Calculate sessions remaining for personal/gifted packages (exclude organization)
    const personalSessionsRemaining = selectedPackage
        ? purchases
            .filter((purchase) => 
                purchase.package === selectedPackage && 
                purchase.purchase_type !== 'organization'
            )
            .reduce((total, purchase) => total + (purchase.sessions_remaining || 0), 0)
        : 0;
    
    // Calculate total available sessions from all organization packages for selected package
    // All members see the same total - it's first-come-first-served
    const organizationSessionsRemaining = selectedPackage && packageType === 'organization'
        ? organizationPackages
            .filter((orgPkg) => 
                orgPkg.package === selectedPackage && 
                orgPkg.sessions_remaining > 0
            )
            .reduce((total, orgPkg) => total + (orgPkg.sessions_remaining || 0), 0)
        : 0;
    
    const sessionsRemaining = packageType === 'organization' ? organizationSessionsRemaining : personalSessionsRemaining;
    const hasSessions = selectedPackage ? (packageType === 'organization' ? organizationSessionsRemaining > 0 : personalSessionsRemaining > 0) : false;
    const packageSessionDuration = selectedPackageData?.session_duration_minutes || DEFAULT_DURATION;

    useEffect(() => {
        // Load active coaching packages and current purchases
        dispatch(getActiveCoachingPackages());
        dispatch(getMyPackagePurchases());
        dispatch(getOrganizationPackages());
    }, [dispatch]);

    // Reset selected package if it's no longer in available packages
    useEffect(() => {
        if (selectedPackage && !availablePackages.find(p => p.id === selectedPackage)) {
            setSelectedPackage(null);
            setSelectedCoach(null);
            dispatch(clearAvailability());
            setCurrentStep('form');
        }
    }, [availablePackages, selectedPackage, dispatch]);

    useEffect(() => {
        // Load coaches assigned to the selected package
        if (selectedPackage) {
            const packageData = packages.find(p => p.id === selectedPackage);
            setCoaches(packageData?.staff_members_details || []);
        } else {
            setCoaches([]);
        }
        
        // Only clear availability if package actually changed (not on first mount or remount)
        if (isFirstMount.current) {
            isFirstMount.current = false;
            previousPackageRef.current = selectedPackage;
            // On first mount, restore step if availability exists
            if (availability.coaching && availability.coaching.length > 0) {
                setCurrentStep('slots');
            }
        } else if (previousPackageRef.current !== selectedPackage) {
            // Package actually changed, clear availability
            setSelectedSlot(null);
            dispatch(clearAvailability());
            setCurrentStep('form');
            previousPackageRef.current = selectedPackage;
        }
    }, [selectedPackage, packages, dispatch, availability.coaching]);

    useEffect(() => {
        setDuration(packageSessionDuration);
    }, [packageSessionDuration]);

    useEffect(() => {
        // Reset slot and availability when package type changes
        setSelectedSlot(null);
        dispatch(clearAvailability());
        setCurrentStep('form');
    }, [packageType, dispatch]);
    
    // Move to slots step when slots are fetched
    useEffect(() => {
        if (availability.coaching && availability.coaching.length > 0) {
            if (currentStep === 'form') {
                setCurrentStep('slots');
            }
        } else if (availability.coaching && availability.coaching.length === 0 && currentStep === 'slots') {
            // If slots were cleared, go back to form
            setCurrentStep('form');
        }
    }, [availability.coaching, currentStep]);

    const handlePurchasePackage = async () => {
        navigate('/packages');
    };

    const checkAvailability = async () => {
        if (!date) {
            openPopup({
                type: 'warning',
                title: 'Select a date',
                message: 'Please choose a date before checking availability.',
            });
            return;
        }

        if (!selectedPackage) {
            openPopup({
                type: 'warning',
                title: 'Select a package',
                message: 'Please choose a coaching package before checking availability.',
            });
            return;
        }
        
        if (!hasSessions) {
            openPopup({
                type: 'warning',
                title: 'No sessions remaining',
                message: 'You are out of sessions for this package. Please purchase another package to continue.',
            });
            return;
        }

        // Store current values for back navigation
        setPreviousDate(date);
        setPreviousPackage(selectedPackage);
        setPreviousCoach(selectedCoach);
        
        // Clear selected slot and reset availability before checking
        setSelectedSlot(null);
        dispatch(clearAvailability()); // Clear previous availability slots
        setToast({ show: false, message: '' }); // Clear any existing toast
        
        setLoading(true);
        const result = await dispatch(checkCoachingAvailability({
            date,
            packageId: selectedPackage,
            coachId: selectedCoach,
            duration: duration
        }));
        setLoading(false);
        
        // Check if no slots are available
        if (checkCoachingAvailability.fulfilled.match(result)) {
            const payload = result.payload || {};
            const slots = payload.slots || [];
            if (slots.length === 0) {
                setToast({
                    show: true,
                    message: payload.specialEventMessage || 'No available time slots found for the selected date and package. Please try a different date or package.'
                });
                // Auto-hide toast after 5 seconds
                setTimeout(() => {
                    setToast({ show: false, message: '' });
                }, 5000);
                setCurrentStep('form'); // Stay on form step if no slots
            }
            // Step will be updated by useEffect when slots are available
        }
    };

    const handleSlotSelect = (slot) => {
        // Check if slot is disabled (would exceed availability)
        if (isSlotDisabled(slot)) {
            return; // Don't allow selection of disabled slots
        }
        
        // Check if this slot is already selected - if so, unselect it
        const isCurrentlySelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
        if (isCurrentlySelected) {
            setSelectedSlot(null);
            return;
        }
        
        // When user clicks a slot, calculate end_time based on selected duration
        // The slot.start_time is already in UTC from backend
        const startTime = new Date(slot.start_time);
        const endTime = new Date(startTime.getTime() + duration * 60000); // Add duration in milliseconds
        
        setSelectedSlot({
            ...slot,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: duration
        });
        
        // Move to summary step
        setCurrentStep('summary');
    };

    const isSlotDisabled = (slot) => {
        // Check if the selected duration would exceed the slot's availability window
        // The backend returns availability_end_time which is when the coach's availability actually ends
        const startTime = new Date(slot.start_time);
        const requestedEndTime = new Date(startTime.getTime() + duration * 60000);
        
        // Use availability_end_time if available, otherwise fall back to slot.end_time
        const maxAvailableEndTime = slot.availability_end_time 
            ? new Date(slot.availability_end_time)
            : new Date(slot.end_time);
        
        // Check if requested end time exceeds the availability window
        // Add a small buffer (1 minute) to account for rounding
        return requestedEndTime > maxAvailableEndTime;
    };

    const getSuggestedDuration = (slot) => {
        // Calculate the maximum duration that would fit in this slot
        const startTime = new Date(slot.start_time);
        // Use availability_end_time if available, otherwise fall back to slot.end_time
        const maxAvailableEndTime = slot.availability_end_time 
            ? new Date(slot.availability_end_time)
            : new Date(slot.end_time);
        const maxDurationMinutes = Math.floor((maxAvailableEndTime - startTime) / 60000);
        
        // Suggest durations that would fit (from available options)
        const availableDurations = [30, 60, 90, 120, 180];
        const suggestedDurations = availableDurations.filter(d => d <= maxDurationMinutes);
        
        if (suggestedDurations.length === 0) {
            return 'No duration available';
        }
        
        const maxSuggested = Math.max(...suggestedDurations);
        if (maxSuggested >= 60) {
            const hours = Math.floor(maxSuggested / 60);
            const minutes = maxSuggested % 60;
            if (minutes > 0) {
                return `${hours}h ${minutes}min`;
            }
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
        return `${maxSuggested} minutes`;
    };

    const handleBack = () => {
        if (currentStep === 'summary') {
            // Go back to slots
            setSelectedSlot(null);
            setCurrentStep('slots');
        } else if (currentStep === 'slots') {
            // Go back to form, restore previous values if available
            if (previousDate) setDate(previousDate);
            if (previousPackage) setSelectedPackage(previousPackage);
            if (previousCoach) setSelectedCoach(previousCoach);
            dispatch(clearAvailability());
            setSelectedSlot(null);
            setCurrentStep('form');
        }
    };
    
    const handleBooking = async () => {
        if (!selectedSlot) {
            openPopup({
                type: 'warning',
                title: 'Select a slot',
                message: 'Please choose a time slot before confirming your coaching session.',
            });
            return;
        }

        if (!selectedSlot.available_coaches || selectedSlot.available_coaches.length === 0) {
            openPopup({
                type: 'warning',
                title: 'No coach available',
                message: 'No coach is available for this slot. Please select another time.',
            });
            return;
        }
        
        if (!hasSessions) {
            openPopup({
                type: 'warning',
                title: 'No sessions remaining',
                message: 'You are out of sessions for this package. Please purchase additional sessions.',
            });
            return;
        }

        const selectedCoachData = selectedSlot.available_coaches[0];

        const bookingData = {
            booking_type: 'coaching',
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            duration_minutes: duration,
            coaching_package: selectedPackage,
            coach: selectedCoachData.id,
            use_organization_package: packageType === 'organization',
        };

        const result = await dispatch(createBooking(bookingData));
        if (createBooking.fulfilled.match(result)) {
            await dispatch(getMyPackagePurchases());
            if (packageType === 'organization') {
                await dispatch(getOrganizationPackages());
            }
            // Clear availability slots and selected slot after successful booking
            dispatch(clearAvailability());
            setSelectedSlot(null);
            setCurrentStep('form'); // Reset to form step
            setDate(''); // Clear date
            setSelectedPackage(null); // Clear package
            setSelectedCoach(null); // Clear coach
            setBookingSuccess(true);
        } else {
            // Handle different error response formats
            let errorMessage = 'Unknown error';
            
            // Check if payload is an array (DRF ValidationError format)
            if (Array.isArray(result.payload)) {
                errorMessage = result.payload.join(' ');
            }
            // Check if payload has nested error structure
            else if (result.payload) {
                errorMessage = result.payload.error || result.payload.detail || result.payload.message || 
                             (Array.isArray(result.payload) ? result.payload.join(' ') : 
                             (typeof result.payload === 'object' ? 
                                Object.entries(result.payload)
                                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                                    .join('\n') : 
                                String(result.payload)));
            }
            
            openPopup({
                type: 'error',
                title: 'Booking failed',
                message: `Error creating booking: ${errorMessage}`,
            });
        }
    };

    if (bookingSuccess) {
        return (
            <div className="bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card p-8 text-center">
                <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-status-confirmed-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-status-confirmed-text mb-2">Booking Confirmed!</h3>
                <p className="text-text-secondary mb-6">Your coaching session has been booked successfully.</p>
                <Button 
                    onClick={() => {
                        setBookingSuccess(false);
                        setSelectedSlot(null);
                        setDate('');
                        setSelectedPackage(null);
                        setSelectedCoach(null);
                    }}
                    variant="primary"
                >
                    Book Another Session
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
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
                                <button
                                    onClick={() => setToast({ show: false, message: '' })}
                                    className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none"
                                >
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Step 1: Form Step */}
            {currentStep === 'form' && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <h2 className="text-xl font-bold text-text-primary mb-4">Book Coaching Session</h2>
                    {purchasesLoading || organizationPackagesLoading ? (
                        <FormSkeleton fields={5} />
                    ) : (
                    <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Select Package
                        </label>
                        {availablePackages.length === 0 ? (
                            <div className="border border-border rounded-button p-6 text-center bg-background">
                                <p className="text-text-secondary mb-4">
                                    You don't have any packages with available sessions.
                                </p>
                                <Button
                                    onClick={() => navigate('/packages')}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Add Package
                                </Button>
                            </div>
                        ) : (
                            <select 
                                value={selectedPackage || ''} 
                                onChange={(e) => {
                                    setSelectedPackage(e.target.value ? parseInt(e.target.value) : null);
                                    setSelectedCoach(null);
                                }}
                            >
                                <option value="" disabled>
                                    Select a package
                                </option>
                                {availablePackages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.title}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {availablePackages.length > 0 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Your session duration will be
                                </label>
                                <input
                                    type="text"
                                    value={
                                        selectedPackageData
                                            ? `${packageSessionDuration} minutes`
                                            : 'Select a package to see session length'
                                    }
                                    disabled
                                    className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-secondary"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Duration is locked to your package and consumes one session.
                                </p>
                            </div>

                            {selectedPackage && (
                                <div className="space-y-4">
                                    {/* Package Type Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Package Type
                                        </label>
                                        <div className="space-y-2">
                                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="packageType"
                                                    value="personal"
                                                    checked={packageType === 'personal'}
                                                    onChange={(e) => setPackageType(e.target.value)}
                                                    className="mr-3"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">Personal / Gifted / Transferred Packages</div>
                                                    <div className="text-sm text-gray-500">
                                                        Use your personal packages, received gifts, or transferred sessions
                                                    </div>
                                                </div>
                                            </label>
                                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="radio"
                                                    name="packageType"
                                                    value="organization"
                                                    checked={packageType === 'organization'}
                                                    onChange={(e) => setPackageType(e.target.value)}
                                                    className="mr-3"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">Group Packages</div>
                                                    <div className="text-sm text-gray-500">
                                                        Use packages purchased for your group (first-come-first-served)
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Sessions/Packages Remaining Display */}
                                    <div className="border border-border rounded-card bg-background p-4 space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-text-secondary">
                                                    {packageType === 'organization' ? 'Available sessions (group)' : 'Sessions remaining'}
                                                </p>
                                                <p className={`text-2xl font-bold ${hasSessions ? 'text-status-confirmed-text' : 'text-danger'}`}>
                                                    {packageType === 'organization' 
                                                        ? (organizationPackagesLoading ? 'Checking…' : organizationSessionsRemaining)
                                                        : (purchasesLoading ? 'Checking…' : personalSessionsRemaining)
                                                    }
                                                </p>
                                                {packageType === 'organization' && organizationSessionsRemaining > 0 && (
                                                    <p className="text-xs text-text-secondary mt-1">
                                                        First-come-first-served. All members can use these sessions.
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handlePurchasePackage}
                                                disabled={purchaseSubmitting}
                                                variant="accent"
                                            >
                                                {purchaseSubmitting ? 'Adding…' : hasSessions ? 'Add More Sessions' : 'Add Package Sessions'}
                                            </Button>
                                        </div>
                                        {!hasSessions && (
                                            <p className="text-sm text-danger">
                                                {packageType === 'organization' 
                                                    ? 'No group packages available. Add another package bundle before booking.'
                                                    : 'You are out of sessions. Add another package bundle before booking.'
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedPackage && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Select Coach
                                    </label>
                                    {coaches.length > 0 ? (
                                        <select 
                                            value={selectedCoach || ''} 
                                            onChange={(e) => setSelectedCoach(e.target.value ? parseInt(e.target.value, 10) : null)}
                                        >
                                            <option value="">All Coaches in Package</option>
                                            {coaches.map((coach) => (
                                                <option key={coach.id} value={coach.id}>
                                                    {coach.first_name} {coach.last_name} ({coach.email})
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
                                disabled={loading || bookingLoading || (selectedPackage && !hasSessions)}
                                variant="primary"
                                className="w-full py-3"
                            >
                                {loading || bookingLoading ? 'Checking Availability...' : 'Check Availability'}
                            </Button>
                        </>
                    )}
                    </div>
                    )}
                </div>
            )}

            {/* Step 2: Slots Step */}
            {currentStep === 'slots' && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Available Time Slots</h2>
                        <Button 
                            onClick={handleBack}
                            variant="secondary"
                            className="flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </Button>
                    </div>
                    {loading || bookingLoading ? (
                        <BookingSlotsSkeleton count={8} />
                    ) : availability.coaching && availability.coaching.length > 0 ? (
                        <>
                            {availability.specialEventMessage && (
                                <div className="bg-danger/10 border border-danger/30 rounded-card p-4 mb-4">
                                    <p className="text-danger font-semibold">{availability.specialEventMessage}</p>
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                                <h3 className="text-lg font-bold text-text-primary">Select a Time Slot</h3>
                                <div className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
                                    <span className="font-medium">Book coaching sessions for</span>
                                    <span className="px-2 py-1 bg-primary-light/20 text-primary rounded-badge font-semibold">
                                        {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
                                    </span>
                                    <span className="text-text-secondary/50">|</span>
                                    <span className="px-2 py-1 bg-status-confirmed-bg text-status-confirmed-text rounded-badge font-semibold">
                                        {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                                    </span>
                                    {selectedCoach && (
                                        <>
                                            <span className="text-text-secondary/50">|</span>
                                            <span className="px-2 py-1 bg-status-personal-bg text-status-personal-text rounded-badge font-semibold">
                                                {coaches.find(c => c.id === selectedCoach)?.first_name} {coaches.find(c => c.id === selectedCoach)?.last_name}
                                            </span>
                                        </>
                                    )}
                                    {selectedPackage && (
                                        <>
                                            <span className="text-text-secondary/50">|</span>
                                            <span className="px-2 py-1 bg-status-pending-bg text-status-pending-text rounded-badge font-semibold">
                                                {packages.find(p => p.id === selectedPackage)?.title}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                                {availability.coaching.map((slot, index) => {
                            const disabled = isSlotDisabled(slot);
                            const suggestedDuration = disabled ? getSuggestedDuration(slot) : null;
                            // Check if this slot is selected (compare by start_time since that's unique)
                            const isSelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
                            
                            return (
                                <div
                                    key={index}
                                    className={`p-4 border-2 rounded-card transition duration-200 relative group ${
                                        disabled
                                            ? 'border-border bg-background cursor-not-allowed opacity-60'
                                            : isSelected
                                                ? 'border-primary bg-primary-light/20 shadow-card-hover cursor-pointer'
                                                : 'border-border hover:border-primary hover:bg-background cursor-pointer'
                                    }`}
                                    onClick={() => !disabled && handleSlotSelect(slot)}
                                    title={disabled ? `This slot would exceed availability with ${duration} minutes. Try ${suggestedDuration} or less.` : ''}
                                >
                                    {disabled && (
                                        <div className="absolute top-1 right-1">
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className={`text-lg font-semibold ${disabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                        {new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
                                        })}
                                    </div>
                                    <div className="text-sm text-text-secondary">
                                        {slot.available_coaches?.length || 0} coach{slot.available_coaches?.length !== 1 ? 'es' : ''} available
                                    </div>
                                    {disabled && (
                                        <div className="mt-2 text-xs text-danger font-medium">
                                            Max: {suggestedDuration}
                                        </div>
                                    )}
                                    {/* Tooltip on hover */}
                                    {disabled && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg max-w-xs">
                                                <div className="font-semibold mb-1">⚠️ Duration too long</div>
                                                <div className="mb-1">
                                                    Coach available until {new Date(slot.availability_end_time || slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-yellow-300 font-medium">💡 Try {suggestedDuration} or less</div>
                                                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                                                    <div className="border-4 border-transparent border-t-gray-900"></div>
                                                </div>
                                            </div>
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

            {/* Step 3: Summary Step */}
            {currentStep === 'summary' && selectedSlot && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Booking Summary</h2>
                        <Button 
                            onClick={handleBack}
                            variant="secondary"
                            className="flex items-center gap-2"
                        >
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
                                    <span className="font-medium">Date:</span> {new Date(selectedSlot.start_time).toLocaleDateString()}
                                </p>
                                <p className="text-text-primary">
                                    <span className="font-medium">Time:</span> {new Date(selectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSlot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-text-primary">
                                    <span className="font-medium">Duration:</span> {duration} minutes
                                </p>
                                {selectedSlot.available_coaches && selectedSlot.available_coaches.length > 0 && (
                                    <div className="mt-4">
                                        <p className="font-medium text-text-primary mb-2">Available Coaches:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {selectedSlot.available_coaches.map((coach, idx) => (
                                                <li key={idx} className="text-text-secondary">
                                                    {coach.name} (Bay {coach.assigned_bay})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedPackage && (
                                    <p className="text-text-primary">
                                        <span className="font-medium">
                                            {packageType === 'organization' ? 'Group sessions left after booking:' : 'Sessions left after booking:'}
                                        </span> {Math.max(sessionsRemaining - 1, 0)}
                                    </p>
                                )}
                            </div>
                            <Button 
                                onClick={handleBooking}
                                disabled={bookingLoading}
                                loading={bookingLoading}
                                variant="primary"
                                className="w-full py-3 flex items-center justify-center gap-2"
                            >
                                {bookingLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Processing...</span>
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
                onConfirm={popup.onConfirm ? async () => {
                    const action = popup.onConfirm;
                    closePopup();
                    if (action) {
                        await action();
                    }
                } : closePopup}
                onClose={closePopup}
            />
        </div>
    );
}

export default CoachingBooking;

