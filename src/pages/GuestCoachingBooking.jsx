import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { checkCoachingAvailability, clearAvailability } from '../store/slices/bookingSlice';
import PopupMessage from '../components/PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import Button from '../components/ui/Button';
import DateInput from '../components/ui/DateInput';
import { BookingSlotsSkeleton, FormSkeleton } from '../components/skeletons/SkeletonLoader';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import logo from '../assets/hole9golf-logo.png';
import { formatLocalTime, formatLocalDate, getTodayInTimezone } from '../utils/timezoneUtils';
import { useAppSelector } from '../store/hooks';
import { SPECIAL_EVENT_AVAILABILITY_MESSAGE } from '../constants/bookingCopy';

function GuestCoachingBooking() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const phone = searchParams.get('phone');
    const [packages, setPackages] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [locationId, setLocationId] = useState(null);
    const tz = 'America/Halifax'; // Can be made dynamic if guest APIs return location tz

    const DEFAULT_DURATION = 60;

    // Calculate min date (Tomorrow -> 24h ahead restriction)
    const todayStr = getTodayInTimezone(tz);
    const minDate = new Date(todayStr);
    minDate.setDate(minDate.getDate() + 1);
    const minDateString = minDate.toISOString().split('T')[0];

    // Calculate max date (30 days from today)
    const maxDate = new Date(todayStr);
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateString = maxDate.toISOString().split('T')[0];
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(DEFAULT_DURATION);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [coaches, setCoaches] = useState([]);
    const [availability, setAvailability] = useState({ slots: [], loading: false });

    // Step management: 'form' -> 'slots' -> 'summary'
    const [currentStep, setCurrentStep] = useState('form');

    // Store previous data for back navigation
    const [previousDate, setPreviousDate] = useState('');
    const [previousPackage, setPreviousPackage] = useState(null);
    const [previousCoach, setPreviousCoach] = useState(null);

    const selectedPackageData = useMemo(() => {
        if (!selectedPackage) return null;
        return (
            packages.find((pkg) => pkg.id === selectedPackage) ||
            purchases.find((p) => p.package === selectedPackage)?.package_details ||
            null
        );
    }, [selectedPackage, packages, purchases]);

    // TPI packages with sessions: catalog row if active, else nested package_details on purchase (retired packages)
    const availablePackages = useMemo(() => {
        if (!purchases || purchases.length === 0) {
            return [];
        }

        const eligiblePurchases = purchases.filter(
            (purchase) =>
                purchase.sessions_remaining > 0 &&
                purchase.package_status === 'active'
        );
        const byId = new Map();
        eligiblePurchases.forEach((purchase) => {
            const id = purchase.package;
            if (byId.has(id)) return;
            const fromCatalog = packages.find((p) => p.id === id);
            const detail = fromCatalog || purchase.package_details;
            if (detail) {
                byId.set(id, detail);
            }
        });
        return Array.from(byId.values());
    }, [packages, purchases]);

    const sessionsRemaining = selectedPackage
        ? purchases
            .filter((purchase) => purchase.package === selectedPackage)
            .reduce((total, purchase) => total + (purchase.sessions_remaining || 0), 0)
        : 0;

    const hasSessions = selectedPackage ? sessionsRemaining > 0 : false;
    const packageSessionDuration = selectedPackageData?.session_duration_minutes || DEFAULT_DURATION;

    // Fetch guest packages and location
    useEffect(() => {
        const fetchGuestData = async () => {
            if (!phone) {
                showError('Phone number is required');
                navigate('/guest');
                return;
            }

            try {
                setLoadingPackages(true);

                // Fetch guest packages by phone
                const packagesResponse = await apiClient.get(endpoints.coaching.guestPackages, {
                    params: { phone }
                });

                if (packagesResponse.data) {
                    setPackages(packagesResponse.data.packages || []);
                    setPurchases(packagesResponse.data.purchases || []);
                    setLocationId(packagesResponse.data.location_id);
                }
            } catch (error) {
                console.error('Failed to fetch guest packages:', error);
                showError('Failed to load packages. Please try again.');
            } finally {
                setLoadingPackages(false);
            }
        };

        fetchGuestData();
    }, [phone, navigate, showError]);

    // Show success message from URL params
    useEffect(() => {
        const message = searchParams.get('message');
        if (message) {
            showSuccess(decodeURIComponent(message));
            // Clean up URL
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('message');
            const newUrl = newSearchParams.toString()
                ? `${window.location.pathname}?${newSearchParams.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [searchParams, showSuccess]);

    // Load coaches from catalog or from purchase.package_details (inactive / retired TPI packages)
    useEffect(() => {
        if (selectedPackage && selectedPackageData) {
            setCoaches(selectedPackageData.staff_members_details || []);
        } else {
            setCoaches([]);
        }
    }, [selectedPackage, selectedPackageData]);

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
                message: 'You are out of sessions for this package.',
            });
            return;
        }

        setPreviousDate(date);
        setPreviousPackage(selectedPackage);
        setPreviousCoach(selectedCoach);

        setSelectedSlot(null);
        setAvailability({ slots: [], loading: true });
        setCheckingAvailability(true);

        try {
            const params = {
                date,
                package_id: selectedPackage,
                duration: duration,
                phone: phone,
                location_id: locationId
            };
            if (selectedCoach) {
                params.coach_id = selectedCoach;
            }

            const response = await apiClient.get(endpoints.bookings.checkCoachingAvailability, {
                params: params
            });

            if (response.data) {
                setAvailability({
                    slots: response.data.available_slots || [],
                    loading: false
                });

                if (!response.data.available_slots || response.data.available_slots.length === 0) {
                    openPopup({
                        type: 'info',
                        title: 'No slots available',
                        message: response.data.special_event_message
                            ? SPECIAL_EVENT_AVAILABILITY_MESSAGE
                            : (response.data.message || 'No available time slots for this date.'),
                    });
                } else {
                    setCurrentStep('slots');
                }
            }
        } catch (error) {
            console.error('Failed to check availability:', error);
            setAvailability({ slots: [], loading: false });
            showError(error.response?.data?.error || 'Failed to check availability. Please try again.');
        } finally {
            setCheckingAvailability(false);
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
        const endTime = new Date(startTime.getTime() + packageSessionDuration * 60000); // Add duration in milliseconds

        setSelectedSlot({
            ...slot,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: packageSessionDuration
        });

        // Move to summary step
        setCurrentStep('summary');
    };

    const isSlotDisabled = (slot) => {
        // Check if the selected duration would exceed the slot's availability window
        // The backend returns availability_end_time which is when the coach's availability actually ends
        const startTime = new Date(slot.start_time);
        const requestedEndTime = new Date(startTime.getTime() + packageSessionDuration * 60000);

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

    const handleBackToForm = () => {
        setCurrentStep('form');
        setSelectedSlot(null);
        setAvailability({ slots: [], loading: false });
    };

    const handleBackToSlots = () => {
        setCurrentStep('slots');
        setSelectedSlot(null);
    };

    const handleBookingSubmit = async () => {
        if (!selectedSlot || !selectedPackage) {
            showError('Please select a time slot and package');
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

        // Automatically assign the first available coach from the slot
        const selectedCoachData = selectedSlot.available_coaches[0];

        setLoading(true);
        try {
            const bookingData = {
                booking_type: 'coaching',
                coaching_package: selectedPackage,
                coach: selectedCoachData.id, // Use coach from slot, not from dropdown
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                duration_minutes: packageSessionDuration,
                phone: phone,
                location_id: locationId
            };

            const response = await apiClient.post(endpoints.bookings.guestCreate, bookingData);

            if (response.data) {
                showSuccess('Booking created successfully! Please login to view your bookings.');
                setTimeout(() => {
                    navigate('/signin', {
                        state: {
                            message: 'Booking created successfully! Please login to view your bookings.'
                        }
                    });
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to create booking:', error);
            showError(error.response?.data?.error || error.response?.data?.message || 'Failed to create booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingPackages) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <img src={logo} alt="Hole 9 Golf Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
                    <p className="text-text-secondary">Loading packages...</p>
                </div>
            </div>
        );
    }

    if (availablePackages.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-surface rounded-card shadow-card p-8 text-center max-w-md w-full">
                    <img src={logo} alt="Hole 9 Golf Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text-primary mb-4">No Packages Available</h2>
                    <p className="text-text-secondary mb-6">
                        You don't have any active TPI Assessment packages with remaining sessions.
                    </p>
                    <Button onClick={() => navigate('/guest')} variant="primary">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header with Login button */}
            <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50 w-full">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto">
                    <div className="flex items-center justify-between h-14 w-full">
                        <img src={logo} alt="Hole 9 Golf Logo" className="h-10 w-auto object-contain" />
                        <button
                            onClick={() => navigate('/signin')}
                            className="px-4 py-2 rounded-button text-sm font-medium transition-colors bg-primary text-white hover:bg-primary-light"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </header>

            <div className="p-4 md:p-6 lg:p-8 w-full">
                <div className="w-full max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 md:mb-8 text-center">
                        Book Your Coaching Session
                    </h1>

                    {currentStep === 'form' && (
                        <div className="bg-surface rounded-card shadow-card p-6">
                            {loadingPackages ? (
                                <FormSkeleton />
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Select Package <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            value={selectedPackage || ''}
                                            onChange={(e) => {
                                                setSelectedPackage(Number(e.target.value));
                                                setSelectedCoach(null);
                                                setDate('');
                                                dispatch(clearAvailability());
                                            }}
                                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary text-black"
                                            style={{ color: '#000' }}
                                        >
                                            <option value="" style={{ color: '#000' }}>Choose a package</option>
                                            {availablePackages.map((pkg) => {
                                                const pkgSessions = purchases
                                                    .filter((p) => p.package === pkg.id)
                                                    .reduce((total, p) => total + (p.sessions_remaining || 0), 0);
                                                return (
                                                    <option key={pkg.id} value={pkg.id} style={{ color: '#000' }}>
                                                        {pkg.title} ({pkgSessions} sessions remaining)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {selectedPackage && (
                                        <>
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-text-primary mb-2">
                                                    Select Coach (Optional)
                                                </label>
                                                <select
                                                    value={selectedCoach || ''}
                                                    onChange={(e) => setSelectedCoach(e.target.value ? Number(e.target.value) : null)}
                                                    className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary text-black"
                                                    style={{ color: '#000' }}
                                                >
                                                    <option value="" style={{ color: '#000' }}>Any available coach</option>
                                                    {coaches.map((coach) => (
                                                        <option key={coach.id} value={coach.id} style={{ color: '#000' }}>
                                                            {coach.first_name} {coach.last_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-text-primary mb-2">
                                                    Select Date <span className="text-danger">*</span>
                                                </label>
                                                <DateInput
                                                    value={date}
                                                    onChange={setDate}
                                                    min={minDateString}
                                                    max={maxDateString}
                                                    placeholder="Select date"
                                                    className="px-4 py-3 border border-border rounded-button"
                                                    required
                                                />
                                            </div>

                                            <div className="mb-6">
                                                <p className="text-sm text-text-secondary mb-2">
                                                    Sessions Remaining: <span className="font-semibold text-text-primary">{sessionsRemaining}</span>
                                                </p>
                                                <p className="text-sm text-text-secondary">
                                                    Duration: <span className="font-semibold text-text-primary">{packageSessionDuration} minutes</span>
                                                </p>
                                            </div>

                                            <Button
                                                onClick={checkAvailability}
                                                disabled={!date || !hasSessions || checkingAvailability}
                                                variant="primary"
                                                className="w-full"
                                            >
                                                {checkingAvailability ? 'Checking...' : 'Check Availability'}
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {currentStep === 'slots' && (
                        <div className="bg-surface rounded-card shadow-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-text-primary">Available Time Slots</h2>
                                <Button onClick={handleBackToForm} variant="secondary">
                                    Back
                                </Button>
                            </div>

                            {availability.loading ? (
                                <BookingSlotsSkeleton />
                            ) : availability.slots.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary">No available slots for this date.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {availability.slots.map((slot, index) => {
                                        const disabled = isSlotDisabled(slot);
                                        const suggestedDuration = disabled ? getSuggestedDuration(slot) : null;
                                        // Check if this slot is selected (compare by start_time since that's unique)
                                        const isSelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();

                                        return (
                                            <div
                                                key={index}
                                                className={`p-4 border-2 rounded-card transition duration-200 relative group ${disabled
                                                    ? 'border-border bg-background cursor-not-allowed opacity-60'
                                                    : isSelected
                                                        ? 'border-primary bg-primary-light/20 shadow-card-hover cursor-pointer'
                                                        : 'border-border hover:border-primary hover:bg-background cursor-pointer'
                                                    }`}
                                                onClick={() => !disabled && handleSlotSelect(slot)}
                                                title={disabled ? `This slot would exceed availability with ${packageSessionDuration} minutes. Try ${suggestedDuration} or less.` : ''}
                                            >
                                                {disabled && (
                                                    <div className="absolute top-1 right-1">
                                                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className={`text-lg font-semibold ${disabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                                    {formatLocalTime(slot.start_time, tz)}
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
                                                                Coach available until {formatLocalTime(slot.availability_end_time || slot.end_time, tz)}
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
                            )}
                        </div>
                    )}

                    {currentStep === 'summary' && selectedSlot && (
                        <div className="bg-surface rounded-card shadow-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-text-primary">Booking Summary</h2>
                                <Button onClick={handleBackToSlots} variant="secondary">
                                    Back
                                </Button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-sm text-text-secondary">Package</p>
                                    <p className="font-semibold text-text-primary">{selectedPackageData?.title}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">Date</p>
                                    <p className="font-semibold text-text-primary">
                                        {formatLocalDate(selectedSlot.start_time, tz)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">Time</p>
                                    <p className="font-semibold text-text-primary">
                                        {formatLocalTime(selectedSlot.start_time, tz)} - {formatLocalTime(selectedSlot.end_time, tz)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary">Duration</p>
                                    <p className="font-semibold text-text-primary">{packageSessionDuration} minutes</p>
                                </div>
                                {selectedSlot.available_coaches && selectedSlot.available_coaches.length > 0 && (
                                    <div>
                                        <p className="text-sm text-text-secondary">Assigned Coach</p>
                                        <p className="font-semibold text-text-primary">
                                            {selectedSlot.available_coaches[0].name} {selectedSlot.available_coaches[0].assigned_bay ? `(Bay ${selectedSlot.available_coaches[0].assigned_bay})` : ''}
                                        </p>
                                        {selectedSlot.available_coaches.length > 1 && (
                                            <p className="text-xs text-text-secondary mt-1">
                                                {selectedSlot.available_coaches.length - 1} other coach{selectedSlot.available_coaches.length - 1 !== 1 ? 'es' : ''} also available for this slot
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-text-secondary">Sessions Remaining After Booking</p>
                                    <p className="font-semibold text-text-primary">{sessionsRemaining - 1}</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleBookingSubmit}
                                disabled={loading}
                                variant="primary"
                                className="w-full"
                            >
                                {loading ? 'Creating Booking...' : 'Confirm Booking'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {popup && (
                <PopupMessage
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    onClose={closePopup}
                />
            )}

            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={hideToast}
                    />
                </div>
            )}
        </div>
    );
}

export default GuestCoachingBooking;

