import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkSimulatorAvailability, createBooking, clearAvailability, getSimulatorCredits, getAvailableSimulatorHours } from '../store/slices/bookingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';

function SimulatorBooking() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { user } = useAppSelector((state) => state.auth);
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
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [usePrepaidHours, setUsePrepaidHours] = useState(null); // null = not selected, true = use prepaid, false = pay
    
    useEffect(() => {
        dispatch(getSimulatorCredits());
        dispatch(getAvailableSimulatorHours({ use_organization: true }));
    }, [dispatch]);

    const checkAvailability = async () => {
        if (!date) {
            openPopup({
                type: 'warning',
                title: 'Select a date',
                message: 'Please choose a date before checking availability.',
            });
            return;
        }

        // Clear selected slot and reset availability before checking
        setSelectedSlot(null);
        dispatch(clearAvailability()); // Clear previous availability slots

        setLoading(true);
        const result = await dispatch(checkSimulatorAvailability({ date, duration }));
        setLoading(false);
        
        // Check if the API returned a message or error
        if (checkSimulatorAvailability.fulfilled.match(result)) {
            const payload = result.payload || {};
            const slots = payload.slots || [];
            // Show message from API if available (e.g., "No simulators available for this day")
            // Priority: message > error > specialEventMessage > default message
            if (payload.message) {
                // Always show API message if present
                showError(payload.message);
            } else if (payload.error) {
                showError(payload.error);
            } else if (payload.specialEventMessage) {
                // Show special event message if no regular message
                showError(payload.specialEventMessage);
            } else if (slots.length === 0) {
                // If no slots and no messages, show a default message
                showError('No available time slots found for the selected date. Please try a different date.');
            }
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

    const isSlotDisabled = (slot) => {
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
            return;
        }
        
        // When user clicks a slot, calculate end_time based on selected duration
        const startTime = new Date(slot.start_time);
        const endTime = new Date(startTime.getTime() + duration * 60000); // Add duration in milliseconds
        
        setSelectedSlot({
            ...slot,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: duration
        });
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

        const bookingData = {
            booking_type: 'simulator',
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            duration_minutes: duration,
            // total_price will be calculated on backend based on duration
        };
        
        // Set use_prepaid_hours based on user's choice
        bookingData.use_prepaid_hours = usePrepaidHours;

        const result = await dispatch(createBooking(bookingData));
        
        // Debug logging
        console.log('Booking result:', result);
        console.log('Result type:', result.type);
        console.log('Is fulfilled?', createBooking.fulfilled.match(result));
        console.log('Is rejected?', createBooking.rejected.match(result));
        if (result.payload) {
            console.log('Response payload:', result.payload);
            console.log('Payload type:', typeof result.payload);
            console.log('Has temp_id?', !!result.payload.temp_id);
            console.log('Has redirect_url?', !!result.payload.redirect_url);
            console.log('temp_id value:', result.payload.temp_id);
            console.log('redirect_url value:', result.payload.redirect_url);
        }
        
        if (createBooking.fulfilled.match(result)) {
            const response = result.payload;
            
            // Check if this is a redirect response (temp booking created for payment)
            if (response && response.temp_id && response.redirect_url) {
                console.log('✅ Redirect response detected:', response);
                // Build redirect URL with query params (similar to package purchases)
                const buyerPhone = user?.phone;
                if (!buyerPhone) {
                    showError('Phone number not found. Please ensure you are logged in.');
                    return;
                }
                
                const url = new URL(response.redirect_url);
                url.searchParams.set('phone', buyerPhone); // Current user's phone
                url.searchParams.set('recipient_phone', response.temp_id); // recipient_phone contains temp_id
                
                openPopup({
                    type: 'success',
                    title: 'Redirecting to Payment...',
                    message: 'You will be redirected to complete your booking payment.',
                });
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = url.toString();
                }, 1000);
                return;
            }
            
            // Normal booking creation (using prepaid hours)
            const booking = response;
            
            // Console log to check if package hours were used or price was charged
            if (booking.package_purchase_details) {
                console.log('✅ Simulator Booking: Using package hours from purchase:', {
                    purchaseId: booking.package_purchase_details.id,
                    purchaseName: booking.package_purchase_details.purchase_name,
                    hoursUsed: (booking.duration_minutes / 60).toFixed(2),
                    hoursRemaining: booking.package_purchase_details.simulator_hours_remaining,
                    totalPrice: booking.total_price
                });
            } else if (booking.simulator_credit_details) {
                console.log('✅ Simulator Booking: Using simulator credit:', {
                    creditId: booking.simulator_credit_details.id,
                    reason: booking.simulator_credit_details.reason,
                    totalPrice: booking.total_price
                });
            } else {
                console.log('✅ Simulator Booking: Charging normal price:', {
                    duration: booking.duration_minutes,
                    hours: (booking.duration_minutes / 60).toFixed(2),
                    totalPrice: booking.total_price,
                    simulator: booking.simulator_details?.name
                });
            }
            
            // Clear availability slots and selected slot after successful booking
            dispatch(clearAvailability());
            setSelectedSlot(null);
            setBookingSuccess(true);
            setUsePrepaidHours(null); // Reset selection
            dispatch(getSimulatorCredits());
            dispatch(getAvailableSimulatorHours({ use_organization: true }));
            showSuccess('Booking confirmed successfully!');
        } else if (createBooking.rejected.match(result)) {
            const errorMessage = result.payload?.error || result.payload?.detail || result.payload?.message || 'Unknown error';
            if (typeof errorMessage === 'object') {
                // Handle validation errors object
                const errorText = Object.entries(errorMessage)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(', ');
                showError(`Booking failed: ${errorText}`);
            } else {
                showError(`Booking failed: ${errorMessage}`);
            }
        } else {
            // Handle case where result is neither fulfilled nor rejected
            console.error('Unexpected booking result state:', result);
            showError('Unexpected response from server. Please try again.');
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
                    onClick={() => setBookingSuccess(false)}
                    variant="primary"
                >
                    Book Another Session
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
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
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={180}>3 hours</option>
                        </select>
                    </div>
                    
                    <Button 
                        onClick={checkAvailability} 
                        disabled={loading}
                        variant="primary"
                        className="w-full py-3"
                    >
                        {loading ? 'Checking Availability...' : 'Check Availability'}
                    </Button>
                </div>
            </div>

            {availability.specialEventMessage && (
                <div className="bg-danger/10 border border-danger/30 rounded-card p-4 mb-6">
                    <p className="text-danger font-semibold">{availability.specialEventMessage}</p>
                </div>
            )}
            {availability.simulator && availability.simulator.length > 0 && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                        <h3 className="text-xl font-bold text-text-primary">Available Time Slots</h3>
                        <div className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
                            <span className="font-medium">Book simulator sessions for</span>
                            <span className="px-2 py-1 bg-primary-light/20 text-primary rounded-badge font-semibold">
                                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
                            </span>
                            <span className="text-text-secondary/50">|</span>
                            <span className="px-2 py-1 bg-status-confirmed-bg text-status-confirmed-text rounded-badge font-semibold">
                                {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                        {availability.simulator.map((slot, index) => {
                            // Check if this slot is selected (compare by start_time since that's unique)
                            const isSelected = selectedSlot && new Date(selectedSlot.start_time).getTime() === new Date(slot.start_time).getTime();
                            const isDisabled = isSlotDisabled(slot);
                            
                            return (
                                <div
                                    key={index}
                                    className={`p-4 border-2 rounded-card transition duration-200 relative ${
                                        isDisabled
                                            ? 'border-danger/30 bg-red-50 cursor-not-allowed opacity-60'
                                            : isSelected
                                                ? 'border-primary bg-primary-light/20 shadow-card-hover cursor-pointer'
                                                : 'border-border hover:border-primary hover:bg-background cursor-pointer'
                                    }`}
                                    onClick={() => handleSlotSelect(slot)}
                                    title={isDisabled ? `This slot cannot accommodate ${duration} minutes. Maximum available: ${getSuggestedDuration(slot)}` : ''}
                                >
                                    <div className={`text-lg font-semibold ${isDisabled ? 'text-text-secondary/50' : 'text-text-primary'}`}>
                                        {new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
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
                                            <div className="text-xs text-danger font-medium">
                                                Exceeds availability
                                            </div>
                                            <div className="text-xs text-danger/80 mt-1">
                                                Max: {getSuggestedDuration(slot)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    {selectedSlot && (
                        <>
                            <div className="bg-status-personal-bg border border-status-personal-text/20 rounded-card p-4 mb-4">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-status-personal-text font-semibold mb-2">
                                            Payment Method
                                        </p>
                                        {totalAvailableHours > 0 ? (
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
                                    <span className="font-medium">Date:</span> {new Date(selectedSlot.start_time).toLocaleDateString()}
                                </p>
                                <p className="text-text-primary">
                                    <span className="font-medium">Start Time:</span> {new Date(selectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                                <p className="text-text-primary">
                                    <span className="font-medium">End Time:</span> {new Date(selectedSlot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                                <p className="text-text-primary">
                                    <span className="font-medium">Duration:</span> {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                                </p>
                            </div>
                            {usePrepaidHours === true && totalAvailableHours > 0 && (
                                <div className="text-sm text-status-confirmed-text bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card p-3 mb-4">
                                    This booking will use {(duration / 60).toFixed(2)} hour{(duration / 60) !== 1 ? 's' : ''} from your pre-paid hours. No additional payment is required.
                                </div>
                            )}
                            {usePrepaidHours === false && (
                                <div className="text-sm text-text-secondary bg-background border border-border rounded-card p-3 mb-4">
                                    This booking will be charged at the standard simulator rate.
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
                        </>
                    )}
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
        </div>
    );
}

export default SimulatorBooking;
