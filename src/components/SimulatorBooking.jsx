import React, { useEffect, useState, useRef } from 'react';
import moment from 'moment-timezone';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkSimulatorAvailability, createBooking, clearAvailability, getSimulatorCredits, getAvailableSimulatorHours, checkSpecialEventsOnDate, checkClosedDate } from '../store/slices/bookingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import { formatLocalTime, formatLocalDate, getTodayInTimezone } from '../utils/timezoneUtils';
import { SPECIAL_EVENT_AVAILABILITY_MESSAGE } from '../constants/bookingCopy';
import SquarePaymentModal from './SquarePaymentModal';

function SimulatorBooking({ client, onBookingSuccess }) {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, showWarning, hideToast } = useToast();
    const { user, locationTimezone } = useAppSelector((state) => state.auth);
    const tz = locationTimezone || 'America/Halifax'; // DST-aware IANA timezone
    const {
        availability,
        loading: bookingLoading,
        simulatorCredits,
        creditsLoading,
        totalAvailableHours,
        availableHoursLoading
    } = useAppSelector((state) => state.booking);

    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(60);
    const [simulatorCount, setSimulatorCount] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetchingMaxSimulators, setFetchingMaxSimulators] = useState(false); // Loading state for fetching max simulators
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [usePrepaidHours, setUsePrepaidHours] = useState(null); // null = not selected, true = use prepaid, false = pay

    // Square payment modal state
    const [squarePayment, setSquarePayment] = useState({
        isOpen: false,
        tempId: null,
        amount: null,
    });

    // Step management: 'form' -> 'slots' -> 'payment'
    const [currentStep, setCurrentStep] = useState('form');

    // Store previous data for back navigation
    const [previousDate, setPreviousDate] = useState('');
    const [previousDuration, setPreviousDuration] = useState(60);
    const [maxAvailableSimulators, setMaxAvailableSimulators] = useState(null); // Will be updated from API after availability check

    // Calculate price based on duration, hourly_price, and simulator_count
    const calculatePrice = () => {
        if (!availability.hourly_price) return null;
        const hours = duration / 60;
        return (availability.hourly_price * hours * simulatorCount).toFixed(2);
    };

    const calculatedPrice = calculatePrice();

    // Check if user is staff or admin
    const isStaffOrAdmin = user?.role === 'staff' || user?.role === 'admin' || user?.is_superuser;

    // Calculate center's "today"
    const todayStr = getTodayInTimezone(tz);
    const minDateString = todayStr;

    // Calculate max date (30 days from today in center timezone)
    const maxDateString = moment.tz(todayStr, tz).add(30, 'days').format('YYYY-MM-DD');

    useEffect(() => {
        const params = { use_organization: true };
        if (client) {
            params.user_id = client.id;
        }
        dispatch(getSimulatorCredits(client ? { user_id: client.id } : {}));
        dispatch(getAvailableSimulatorHours(params));
    }, [dispatch, client]);

    // Debug: Log totalAvailableHours when it changes
    useEffect(() => {
        console.log('📊 Total Available Hours State:', {
            totalAvailableHours,
            availableHoursLoading,
            hasHours: totalAvailableHours > 0
        });
    }, [totalAvailableHours, availableHoursLoading]);

    // Fetch max available simulators when date is selected
    const prevDateForMaxSimRef = useRef('');
    useEffect(() => {
        if (date && currentStep === 'form') {
            // Reset maxAvailableSimulators when date changes to fetch fresh data
            if (prevDateForMaxSimRef.current !== date && prevDateForMaxSimRef.current !== '') {
                setMaxAvailableSimulators(null);
            }

            // Fetch max available simulators with default values (duration=60, simulator_count=1)
            // Only fetch if we don't already have the value for this date
            if (maxAvailableSimulators === null) {
                const fetchMaxSimulators = async () => {
                    setFetchingMaxSimulators(true);
                    try {
                        const result = await dispatch(checkSimulatorAvailability({
                            date,
                            duration: 60,
                            simulator_count: 1
                        }));

                        if (checkSimulatorAvailability.fulfilled.match(result)) {
                            const payload = result.payload || {};
                            if (payload.max_available_simulators !== undefined) {
                                setMaxAvailableSimulators(payload.max_available_simulators);
                                // Adjust simulator_count if it exceeds max
                                if (simulatorCount > payload.max_available_simulators) {
                                    setSimulatorCount(payload.max_available_simulators);
                                }
                            }
                        }
                    } catch (error) {
                        // Silently fail - we'll get the value when user clicks "Check Availability"
                        console.log('Failed to fetch max simulators on date select:', error);
                    } finally {
                        setFetchingMaxSimulators(false);
                    }
                };

                // Add a small delay to avoid calling on every keystroke if user is typing
                const timeoutId = setTimeout(() => {
                    fetchMaxSimulators();
                }, 300);

                prevDateForMaxSimRef.current = date;

                return () => {
                    clearTimeout(timeoutId);
                    setFetchingMaxSimulators(false);
                };
            }
        }
    }, [date, currentStep, dispatch, simulatorCount, maxAvailableSimulators]);

    // Clear slots when date or duration changes (only if we're on form step)
    const prevDateRef = useRef(date);
    const prevDurationRef = useRef(duration);

    // Track closed day status
    const [isClosedDay, setIsClosedDay] = useState(false);
    const [checkingClosedDay, setCheckingClosedDay] = useState(false);
    const [partialClosures, setPartialClosures] = useState([]);

    useEffect(() => {
        const checkClosedStatus = async () => {
            if (!date) {
                setIsClosedDay(false);
                setPartialClosures([]);
                return;
            }

            setCheckingClosedDay(true);
            try {
                const result = await dispatch(checkClosedDate(date)).unwrap();
                if (result.is_closed) {
                    setIsClosedDay(true);
                    setPartialClosures([]);
                    showError(`This date is closed: ${result.closure_title || 'Closed for maintenance/holiday'}`);
                } else {
                    setIsClosedDay(false);
                    // Check for partial closures
                    if (result.has_partial_closure && result.partial_closures) {
                        setPartialClosures(result.partial_closures);
                        // Show informational message about partial closures
                        const closureMessages = result.partial_closures.map(closure => {
                            const startTime = formatLocalTime(closure.start_time, tz);
                            const endTime = formatLocalTime(closure.end_time, tz);
                            return `${startTime} - ${endTime}`;
                        }).join(', ');
                        showWarning(`Note: Facility will be closed ${closureMessages} on this date. These time slots will not be available.`);
                    } else {
                        setPartialClosures([]);
                    }
                }
            } catch (error) {
                // Determine if we should treat error as closed or not, usually not closed if check fails unless 400 bad request
                console.error('Failed to check closed date:', error);
                setIsClosedDay(false);
                setPartialClosures([]);
            } finally {
                setCheckingClosedDay(false);
            }
        };

        checkClosedStatus();
    }, [date, dispatch, showError]);

    useEffect(() => {
        // Only clear if date or duration actually changed (not on initial mount)
        const dateChanged = prevDateRef.current !== date;
        const durationChanged = prevDurationRef.current !== duration;

        if ((dateChanged || durationChanged) && currentStep === 'form') {
            // Only clear if we had previous values (not initial mount)
            if (prevDateRef.current || prevDurationRef.current !== 60) {
                dispatch(clearAvailability());
                setSelectedSlot(null);
                setUsePrepaidHours(null);
                setCurrentStep('form');
            }
        }

        prevDateRef.current = date;
        prevDurationRef.current = duration;
    }, [date, duration, dispatch, currentStep]);

    // Track if availability check was explicitly triggered by user (not auto-fetch for max simulators)
    const explicitAvailabilityCheckRef = useRef(false);

    // Move to slots step when slots are fetched (only if explicitly checked by user)
    useEffect(() => {
        if (availability.simulator && availability.simulator.length > 0 && currentStep === 'form' && explicitAvailabilityCheckRef.current) {
            // Ensure we don't move to slots if there's a special event message
            if (!availability.specialEventMessage) {
                setCurrentStep('slots');
            }
            explicitAvailabilityCheckRef.current = false; // Reset flag
        }

        // Debug: Log availability state to check hourly_price
        if (availability.simulator && availability.simulator.length > 0) {
            console.log('📊 Availability State:', {
                slots_count: availability.simulator.length,
                hourly_price: availability.hourly_price,
                has_hourly_price: !!availability.hourly_price,
                hourly_price_type: typeof availability.hourly_price
            });
        }
    }, [availability.simulator, availability.hourly_price, availability.specialEventMessage, currentStep]);

    // Refetch available hours when moving to payment step to ensure we have latest data
    useEffect(() => {
        if (currentStep === 'payment' && selectedSlot) {
            console.log('🔄 Refetching available hours for payment step...');
            const params = { use_organization: true };
            if (client) {
                params.user_id = client.id;
            }
            dispatch(getAvailableSimulatorHours(params));
        }
    }, [currentStep, selectedSlot, dispatch, client]);

    const checkAvailability = async () => {
        if (!date) {
            openPopup({
                type: 'warning',
                title: 'Select a date',
                message: 'Please choose a date before checking availability.',
            });
            return;
        }

        // Store current values for back navigation
        setPreviousDate(date);
        setPreviousDuration(duration);

        // Clear selected slot and reset availability before checking
        setSelectedSlot(null);
        dispatch(clearAvailability()); // Clear previous availability slots

        // Mark that this is an explicit availability check by user
        explicitAvailabilityCheckRef.current = true;

        setLoading(true);
        // Fetch special events first
        await dispatch(checkSpecialEventsOnDate(date));

        const count = simulatorCount && simulatorCount >= 1 ? simulatorCount : 1;
        const result = await dispatch(checkSimulatorAvailability({ date, duration, simulator_count: count }));
        setLoading(false);

        // Check if the API returned a message or error
        if (checkSimulatorAvailability.fulfilled.match(result)) {
            const payload = result.payload || {};
            const slots = payload.slots || [];

            // Update max available simulators from API response
            if (payload.max_available_simulators !== undefined) {
                setMaxAvailableSimulators(payload.max_available_simulators);
                // Adjust simulator_count if it exceeds max
                if (simulatorCount > payload.max_available_simulators) {
                    setSimulatorCount(payload.max_available_simulators);
                }
            }

            // Debug: Log the API response to check hourly_price
            console.log('📊 Availability API Response:', {
                slots_count: slots.length,
                hourly_price: payload.hourly_price,
                has_hourly_price: !!payload.hourly_price,
                max_available_simulators: payload.max_available_simulators,
                simulator_count: payload.simulator_count,
                payload_keys: Object.keys(payload)
            });

            // Show message from API if available (e.g., "No simulators available for this day")
            // Priority: message > error > specialEventMessage > default message
            if (payload.message) {
                // Always show API message if present
                showError(payload.message);
            } else if (payload.error) {
                showError(payload.error);
            } else if (slots.length === 0) {
                // If there are no slots, we can show the special event message if it exists
                if (payload.specialEventMessage) {
                    showError(payload.specialEventMessage);
                } else {
                    showError('No available time slots found for the selected date. Please try a different date.');
                }
            }
            // Step will be updated by useEffect when slots are available
        } else if (checkSimulatorAvailability.rejected.match(result)) {
            // Handle rejected case (API error)
            const errorMessage = result.payload?.error ||
                result.payload?.message ||
                result.payload?.detail ||
                result.payload ||
                'Failed to check availability';
            showError(typeof errorMessage === 'string' ? errorMessage : 'Failed to check availability');
        }
    };

    const getSpecialEventConflict = (slot) => {
        if (!availability.specialEventsOnDate || availability.specialEventsOnDate.length === 0) return null;

        // Slot duration in ms
        const durationMs = duration * 60000;
        // slot.start_time is a UTC ISO string from the backend
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slotStart.getTime() + durationMs);

        for (const event of availability.specialEventsOnDate) {
            if (!event.start_time || !event.end_time) continue;

            // Use event.date if available, otherwise fallback to the current booking date
            const dateToUse = event.date || date;
            if (!dateToUse) continue;

            // The event's start_time/end_time are wall-clock local times stored without
            // timezone info (e.g. "20:00:00" means 8 PM at the golf center's location).
            // We must interpret them in the center's IANA timezone (tz) — NOT the browser's
            // local timezone — before comparing against the UTC-based slot timestamps.
            const eventStart = moment.tz(`${dateToUse} ${event.start_time}`, 'YYYY-MM-DD HH:mm:ss', tz).toDate();
            let eventEnd = moment.tz(`${dateToUse} ${event.end_time}`, 'YYYY-MM-DD HH:mm:ss', tz).toDate();

            // Handle event crossing midnight: if end is not after start, it's next-day
            if (eventEnd <= eventStart) {
                eventEnd = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);
            }

            // Check for overlap:
            // Block if the requested slot's interval [slotStart, slotEnd) 
            // overlaps with the event's interval [eventStart, eventEnd).
            // A slot ending exactly at the event start time (slotEnd === eventStart) is NOT a conflict.
            if (slotStart < eventEnd && slotEnd > eventStart) {
                const isDurationConflict = slotStart < eventStart;
                const maxDuration = isDurationConflict ? Math.floor((eventStart - slotStart) / 60000) : 0;

                return {
                    event,
                    isDurationConflict,
                    eventStartTime: eventStart,
                    maxDuration
                };
            }
        }
        return null;
    };

    const isSlotDisabled = (slot) => {
        // Check special event conflict first
        if (getSpecialEventConflict(slot)) return true;

        // Check if the selected duration would exceed the slot's availability window
        // The backend returns availability_end_time which is when the simulator's availability actually ends
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
        const availableDurations = [30, 60, 120, 180];
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

    const handleSlotSelect = (slot) => {
        // Prevent selection if slot is disabled
        if (isSlotDisabled(slot)) {
            return;
        }

        // Check if this slot is already selected - if so, unselect it
        const isCurrentlySelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
        if (isCurrentlySelected) {
            setSelectedSlot(null);
            setCurrentStep('slots');
            return;
        }

        // When user clicks a slot, calculate end_time based on selected duration
        const startTime = new Date(slot.start_time);
        const endTime = new Date(startTime.getTime() + duration * 60000); // Add duration in milliseconds

        // Calculate total payable amount
        let totalPayableAmount = null;
        if (availability.hourly_price) {
            const hours = duration / 60;
            totalPayableAmount = (availability.hourly_price * hours).toFixed(2);
            console.log('💰 Total Payable Amount:', {
                hourly_price: availability.hourly_price,
                duration_minutes: duration,
                duration_hours: hours.toFixed(2),
                total_amount: `$${totalPayableAmount}`
            });
        } else {
            console.log('💰 Total Payable Amount: Hourly price not available');
        }

        setSelectedSlot({
            ...slot,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: duration
        });

        // Move to payment step
        setCurrentStep('payment');
    };

    const handleBack = () => {
        if (currentStep === 'payment') {
            // Go back to slots
            setSelectedSlot(null);
            setUsePrepaidHours(null);
            setCurrentStep('slots');
        } else if (currentStep === 'slots') {
            // Go back to form, restore previous values if available
            if (previousDate) setDate(previousDate);
            if (previousDuration) setDuration(previousDuration);
            dispatch(clearAvailability());
            setSelectedSlot(null);
            setUsePrepaidHours(null);
            setCurrentStep('form');
        }
    };

    const handleBooking = async () => {
        if (!selectedSlot) {
            openPopup({
                type: 'warning',
                title: 'Select a slot',
                message: 'Please choose a time slot before confirming your booking.',
            });
            return;
        }

        // Double-check that the selected slot can accommodate the duration
        if (isSlotDisabled(selectedSlot)) {
            openPopup({
                type: 'warning',
                title: 'Slot too short',
                message: `This time slot cannot accommodate ${duration} minutes. Maximum available: ${getSuggestedDuration(selectedSlot)}.`,
            });
            return;
        }

        // Validate payment method selection
        if (usePrepaidHours === null) {
            openPopup({
                type: 'warning',
                title: 'Select Payment Method',
                message: 'Please choose whether to use pre-paid hours or pay for this session.',
            });
            return;
        }

        const submitBooking = async () => {
            const bookingData = {
                booking_type: 'simulator',
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                duration_minutes: duration,
                simulator_count: simulatorCount && simulatorCount >= 1 ? simulatorCount : 1,
                // total_price will be calculated on backend based on duration
            };

            // Add client_id if booking for a client
            if (client) {
                bookingData.client_id = client.id;
            }

            // Set use_prepaid_hours based on user's choice
            bookingData.use_prepaid_hours = usePrepaidHours;

            const result = await dispatch(createBooking(bookingData));

            // Debug logging
            console.log('Booking result:', result);
            console.log('Result type:', result.type);
            console.log('Is fulfilled?', createBooking.fulfilled.match(result));
            console.log('Is rejected?', createBooking.rejected.match(result));

            if (createBooking.fulfilled.match(result)) {
                const response = result.payload;

                // Check if this is a redirect response (temp booking created for payment)
                if (response && response.temp_id) {
                    console.log('✅ Temp booking created, opening Square payment modal:', response);

                    /* ------- GHL Redirect (COMMENTED OUT for Square migration) -------
                    const buyerPhone = user?.phone;
                    if (!buyerPhone) {
                        showError('Phone number not found. Please ensure you are logged in.');
                        return;
                    }
                    const url = new URL(response.redirect_url);
                    url.searchParams.set('phone', buyerPhone);
                    url.searchParams.set('recipient_phone', response.temp_id);
                    const validSimulatorCount = simulatorCount && simulatorCount >= 1 ? simulatorCount : 1;
                    const count = (duration / 60) * validSimulatorCount;
                    url.searchParams.set('count', count.toString());
                    openPopup({
                        type: 'success',
                        title: 'Redirecting to Payment...',
                        message: 'You will be redirected to complete your booking payment.',
                    });
                    if (onBookingSuccess) { onBookingSuccess(); }
                    setTimeout(() => { window.location.href = url.toString(); }, 1000);
                    return;
                    ------- END GHL Redirect ------- */

                    // Square: open the payment modal
                    setSquarePayment({
                        isOpen: true,
                        tempId: response.temp_id,
                        amount: response.total_price,
                    });
                    return;
                }

                // Normal booking creation (using prepaid hours)

                // Clear availability slots and selected slot after successful booking
                dispatch(clearAvailability());
                setSelectedSlot(null);
                setBookingSuccess(true);
                setUsePrepaidHours(null); // Reset selection
                setCurrentStep('form'); // Reset to form step
                setDate(''); // Clear date
                setDuration(60); // Reset duration
                const params = { use_organization: true };
                if (client) {
                    params.user_id = client.id;
                }
                dispatch(getSimulatorCredits(client ? { user_id: client.id } : {}));
                dispatch(getAvailableSimulatorHours(params));
                showSuccess('Booking confirmed successfully!');
                if (onBookingSuccess) {
                    // Delay closing modal to show success message
                    setTimeout(() => {
                        onBookingSuccess();
                    }, 2000);
                }
            } else if (createBooking.rejected.match(result)) {
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
                                    .join(', ') :
                                String(result.payload)));
                }

                showError(errorMessage);
            } else {
                // Handle case where result is neither fulfilled nor rejected
                console.error('Unexpected booking result state:', result);
                showError('Unexpected response from server. Please try again.');
            }
        };

        if (client) {
            openPopup({
                type: 'warning',
                title: 'Confirm Booking On Behalf',
                message: `Are you sure you want to book a simulator session for ${client.first_name || 'Client'} ${client.last_name || ''}?`,
                confirmText: 'Yes, Book It',
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: submitBooking
            });
        } else {
            await submitBooking();
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
                <p className="text-text-secondary mb-6">Your simulator session has been booked successfully.</p>
                <Button
                    onClick={() => {
                        setBookingSuccess(false);
                        setCurrentStep('form');
                        setDate('');
                        setDuration(60);
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
            {/* Form Step */}
            {currentStep === 'form' && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <h2 className="text-xl font-bold text-text-primary mb-2">Book Simulator Session</h2>
                    <p className="text-sm text-text-secondary mb-4">
                        We'll automatically assign the optimal bay at confirmation. Simulator bookings can be cancelled up to 24 hours out without penalty—inside that window you'll need an admin override.
                    </p>
                    <div className="mb-4 p-4 bg-primary-light/10 border border-primary/20 rounded-card text-sm text-primary">
                        <p className="font-semibold">Refund policy</p>
                        <p>
                            Cancelling at least 24 hours in advance converts your payment into a simulator credit so you can rebook later at no charge.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Date
                            </label>
                            <DateInput
                                value={date}
                                onChange={setDate}
                                min={minDateString}
                                max={maxDateString}
                                placeholder="Select date"
                                className="cursor-pointer"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Duration
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => {
                                    setDuration(parseInt(e.target.value));
                                    setSelectedSlot(null); // Reset selected slot when duration changes
                                }}
                            >
                                <option value={60}>1 hour</option>
                                <option value={120}>2 hours</option>
                                <option value={180}>3 hours</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Number of Simulators
                            </label>
                            <input
                                type="text"
                                value={simulatorCount}
                                onChange={(e) => {
                                    const inputValue = e.target.value;
                                    // Allow empty input while typing
                                    if (inputValue === '') {
                                        setSimulatorCount('');
                                        return;
                                    }
                                    // Only allow numeric input
                                    const numericValue = inputValue.replace(/[^0-9]/g, '');
                                    if (numericValue === '') {
                                        setSimulatorCount('');
                                        return;
                                    }
                                    const value = parseInt(numericValue);
                                    if (!isNaN(value)) {
                                        // Only clamp if maxAvailableSimulators has been set from backend
                                        const clampedValue = maxAvailableSimulators !== null
                                            ? Math.max(1, Math.min(value, maxAvailableSimulators))
                                            : Math.max(1, value);
                                        setSimulatorCount(clampedValue);
                                        setSelectedSlot(null); // Reset selected slot when simulator count changes
                                    }
                                }}
                                onBlur={(e) => {
                                    // Ensure a valid value on blur
                                    if (simulatorCount === '' || simulatorCount < 1) {
                                        setSimulatorCount(1);
                                    }
                                }}
                                disabled={fetchingMaxSimulators}
                                className="w-full"
                            />
                            {fetchingMaxSimulators && (
                                <div className="flex items-center gap-2 mt-2">
                                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-xs text-text-secondary flex items-center">
                                        Checking available simulators
                                        <span className="inline-flex ml-1" style={{ width: '20px' }}>
                                            <span
                                                className="inline-block"
                                                style={{
                                                    animation: 'dotPulse 1.4s ease-in-out infinite',
                                                    animationDelay: '0ms'
                                                }}
                                            >.</span>
                                            <span
                                                className="inline-block"
                                                style={{
                                                    animation: 'dotPulse 1.4s ease-in-out infinite',
                                                    animationDelay: '200ms'
                                                }}
                                            >.</span>
                                            <span
                                                className="inline-block"
                                                style={{
                                                    animation: 'dotPulse 1.4s ease-in-out infinite',
                                                    animationDelay: '400ms'
                                                }}
                                            >.</span>
                                        </span>
                                    </p>
                                    <style>{`
                                        @keyframes dotPulse {
                                            0%, 100% { opacity: 0.3; }
                                            50% { opacity: 1; }
                                        }
                                    `}</style>
                                </div>
                            )}
                            {!fetchingMaxSimulators && maxAvailableSimulators !== null && (
                                <p className="text-xs text-text-secondary mt-1">
                                    Maximum {maxAvailableSimulators} simulator{maxAvailableSimulators !== 1 ? 's' : ''} available
                                </p>
                            )}
                        </div>

                        <Button
                            onClick={checkAvailability}
                            disabled={loading || fetchingMaxSimulators || !!availability.specialEventMessage || isClosedDay || checkingClosedDay}
                            variant="primary"
                            className="w-full py-3"
                        >
                            {loading ? 'Checking Availability...' : 'Check Availability'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Slots Step */}
            {currentStep === 'slots' && availability.simulator && availability.simulator.length > 0 && (
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
                    <div className="mb-4 text-sm text-text-secondary flex flex-wrap items-center gap-2">
                        <span className="font-medium">Book simulator sessions for</span>
                        <span className="px-2 py-1 bg-primary-light/20 text-primary rounded-badge font-semibold">
                            {date ? moment(date, 'YYYY-MM-DD').format('MMMM D, YYYY') : 'Select date'}
                        </span>
                        <span className="text-text-secondary/50">|</span>
                        <span className="px-2 py-1 bg-status-confirmed-bg text-status-confirmed-text rounded-badge font-semibold">
                            {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                        </span>
                        {simulatorCount > 1 && (
                            <>
                                <span className="text-text-secondary/50">|</span>
                                <span className="px-2 py-1 bg-primary-light/20 text-primary rounded-badge font-semibold">
                                    {simulatorCount} simulator{simulatorCount !== 1 ? 's' : ''}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {availability.simulator.map((slot, index) => {
                            // Check if this slot is selected (compare by start_time since that's unique)
                            const isSelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
                            const isDisabled = isSlotDisabled(slot);
                            const conflict = getSpecialEventConflict(slot);
                            const specialEvent = conflict?.event;
                            const isDurationConflict = conflict?.isDurationConflict;
                            const eventStartTime = conflict?.eventStartTime;

                            return (
                                <div
                                    key={index}
                                    className={`p-4 border-2 rounded-card transition duration-200 relative group ${isDisabled
                                        ? 'border-danger/30 bg-red-50 cursor-not-allowed opacity-60'
                                        : isSelected
                                            ? 'border-primary bg-primary-light/20 shadow-card-hover cursor-pointer'
                                            : 'border-border hover:border-primary hover:bg-background cursor-pointer'
                                        }`}
                                    onClick={() => handleSlotSelect(slot)}
                                >
                                    <div className={`text-lg font-semibold ${isDisabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                        {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            timeZone: tz
                                        })}
                                    </div>
                                    <div className={`text-sm ${isDisabled ? 'text-text-secondary/40' : 'text-text-secondary'}`}>
                                        {slot.duration_minutes || duration} minutes
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Bay assigned automatically at confirmation
                                    </div>
                                    {isDisabled && (
                                        <div className="mt-2 pt-2 border-t border-danger/30">
                                            {specialEvent ? (
                                                <div className="text-xs text-danger font-medium">
                                                    {isDurationConflict ? (
                                                        <>
                                                            Exceeds availability
                                                            <div className="text-danger/80 mt-1">
                                                                Max: {conflict.maxDuration} mins
                                                            </div>
                                                        </>
                                                    ) : (
                                                        SPECIAL_EVENT_AVAILABILITY_MESSAGE
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-xs text-danger font-medium">
                                                        Exceeds availability
                                                    </div>
                                                    <div className="text-xs text-danger/80 mt-1">
                                                        Max: {getSuggestedDuration(slot)}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Tooltip on hover */}
                                    {isDisabled && (
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 shadow-lg w-max max-w-xs sm:max-w-md text-center">
                                                {specialEvent ? (
                                                    isDurationConflict ? (
                                                        <>
                                                            <div className="font-semibold mb-1">⚠️ Duration Conflict</div>
                                                            <div className="mb-1">
                                                                Session overlaps with unavailable time (starts {eventStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz })})
                                                            </div>
                                                            <div className="text-yellow-300 font-medium">💡 Try {conflict.maxDuration} mins or less</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="font-semibold mb-1">Unavailable</div>
                                                            <div className="mb-1">{SPECIAL_EVENT_AVAILABILITY_MESSAGE}</div>
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <div className="font-semibold mb-1">⚠️ Duration too long</div>
                                                        <div className="mb-1">
                                                            Simulator available until {new Date(slot.availability_end_time || slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: tz })}
                                                        </div>
                                                        <div className="text-yellow-300 font-medium">💡 Try {getSuggestedDuration(slot)} or less</div>
                                                    </>
                                                )}
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
                </div>
            )}

            {/* Payment Step */}
            {currentStep === 'payment' && selectedSlot && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Payment Method</h2>
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

                    <div className="bg-status-personal-bg border border-status-personal-text/20 rounded-card p-4 mb-4">
                        <div className="space-y-3">
                            <div>
                                <p className="text-status-personal-text font-semibold mb-2">
                                    Payment Method
                                </p>
                                {availableHoursLoading ? (
                                    <p className="text-sm text-text-secondary mb-3">
                                        Loading available hours...
                                    </p>
                                ) : totalAvailableHours > 0 ? (
                                    <p className="text-sm text-status-personal-text/80 mb-3">
                                        You have {totalAvailableHours.toFixed(2)} pre-paid simulator hour{totalAvailableHours !== 1 ? 's' : ''} available
                                    </p>
                                ) : (
                                    <p className="text-sm text-text-secondary mb-3">
                                        No pre-paid hours available. You can pay for this session.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                {totalAvailableHours > 0 && (
                                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="h-4 w-4 text-status-personal-text"
                                            checked={usePrepaidHours === true}
                                            onChange={() => setUsePrepaidHours(true)}
                                            disabled={availableHoursLoading}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-text-primary">Use Pre-paid Hours</div>
                                            <div className="text-xs text-text-secondary">Use {totalAvailableHours.toFixed(2)} available hours</div>
                                        </div>
                                    </label>
                                )}
                                <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        className="h-4 w-4 text-primary"
                                        checked={usePrepaidHours === false}
                                        onChange={() => setUsePrepaidHours(false)}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-text-primary">Pay for Session</div>
                                        <div className="text-xs text-text-secondary">Pay at standard simulator rate</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="bg-background rounded-card p-6">
                        <h4 className="text-lg font-bold text-text-primary mb-4">Booking Summary</h4>
                        <div className="space-y-2 mb-4">
                            <p className="text-text-primary">
                                <span className="font-medium">Date:</span> {formatLocalDate(selectedSlot.start_time, tz)}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Start Time:</span> {formatLocalTime(selectedSlot.start_time, tz)}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">End Time:</span> {formatLocalTime(selectedSlot.end_time, tz)}
                            </p>
                            <p className="text-text-primary">
                                <span className="font-medium">Duration:</span> {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                            </p>
                            {simulatorCount > 1 && (
                                <p className="text-text-primary">
                                    <span className="font-medium">Number of Simulators:</span> {simulatorCount}
                                </p>
                            )}
                        </div>
                        {usePrepaidHours === true && totalAvailableHours > 0 && (
                            <div className="text-sm text-status-confirmed-text bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card p-3 mb-4">
                                This booking will use {((duration / 60) * simulatorCount).toFixed(2)} hour{((duration / 60) * simulatorCount) !== 1 ? 's' : ''} from your pre-paid hours ({simulatorCount} simulator{simulatorCount !== 1 ? 's' : ''} × {(duration / 60).toFixed(2)} hour{(duration / 60) !== 1 ? 's' : ''} each). No additional payment is required.
                            </div>
                        )}
                        {usePrepaidHours === false && (
                            <div className="text-sm text-text-secondary bg-background border border-border rounded-card p-3 mb-4">
                                <p className="font-semibold text-text-primary">We will redirect you to payment gateway.</p>
                            </div>
                        )}
                        {usePrepaidHours === null && (
                            <div className="text-sm text-warning bg-warning-bg border border-warning-text/20 rounded-card p-3 mb-4">
                                Please select a payment method above.
                            </div>
                        )}
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

            {/* Special Event Message */}
            {availability.specialEventMessage && currentStep !== 'payment' && (
                <div className="bg-danger/10 border border-danger/30 rounded-card p-4">
                    <p className="text-danger font-semibold">{availability.specialEventMessage}</p>
                </div>
            )}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
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

            {/* Square Payment Modal */}
            <SquarePaymentModal
                isOpen={squarePayment.isOpen}
                onClose={() => setSquarePayment({ isOpen: false, tempId: null, amount: null })}
                onSuccess={(data) => {
                    setSquarePayment({ isOpen: false, tempId: null, amount: null });
                    dispatch(clearAvailability());
                    setSelectedSlot(null);
                    setBookingSuccess(true);
                    setUsePrepaidHours(null);
                    setCurrentStep('form');
                    setDate('');
                    setDuration(60);
                    const params = { use_organization: true };
                    if (client) params.user_id = client.id;
                    dispatch(getSimulatorCredits(client ? { user_id: client.id } : {}));
                    dispatch(getAvailableSimulatorHours(params));
                    showSuccess('Booking confirmed and payment successful!');
                    if (onBookingSuccess) {
                        setTimeout(() => onBookingSuccess(), 1500);
                    }
                }}
                tempId={squarePayment.tempId}
                amount={squarePayment.amount}
                currency="CAD"
                paymentType="simulator"
                disableCoupons={!user}
                description={`Simulator Booking — ${duration / 60} hr${duration > 60 ? 's' : ''} × ${simulatorCount} bay${simulatorCount > 1 ? 's' : ''}`}
            />
        </div>
    );
}

export default SimulatorBooking;