import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkSimulatorAvailability, createBooking, clearAvailability, getSimulatorCredits } from '../store/slices/bookingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

function SimulatorBooking() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { availability, loading: bookingLoading, simulatorCredits, creditsLoading } = useAppSelector((state) => state.booking);
    
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(60);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [useCredit, setUseCredit] = useState(false);
    
    const availableCredits = simulatorCredits?.length || 0;
    
    useEffect(() => {
        dispatch(getSimulatorCredits());
    }, [dispatch]);
    
    useEffect(() => {
        if (availableCredits === 0 && useCredit) {
            setUseCredit(false);
        }
    }, [availableCredits, useCredit]);

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
        await dispatch(checkSimulatorAvailability({ date, duration }));
        setLoading(false);
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

        const bookingData = {
            booking_type: 'simulator',
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            duration_minutes: duration,
            // total_price will be calculated on backend based on duration
        };
        
        if (useCredit) {
            bookingData.use_simulator_credit = true;
        }

        const result = await dispatch(createBooking(bookingData));
        if (createBooking.fulfilled.match(result)) {
            // Clear availability slots and selected slot after successful booking
            dispatch(clearAvailability());
            setSelectedSlot(null);
            setBookingSuccess(true);
            setUseCredit(false);
            dispatch(getSimulatorCredits());
        } else {
            const errorMessage = result.payload?.error || result.payload?.detail || result.payload?.message || 'Unknown error';
            if (typeof errorMessage === 'object') {
                // Handle validation errors object
                const errorText = Object.entries(errorMessage)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('\n');
                openPopup({
                    type: 'error',
                    title: 'Booking failed',
                    message: `Error creating booking:\n${errorText}`,
                });
            } else {
                openPopup({
                    type: 'error',
                    title: 'Booking failed',
                    message: `Error creating booking: ${errorMessage}`,
                });
            }
        }
    };

    if (bookingSuccess) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600 mb-6">Your simulator session has been booked successfully.</p>
                <button 
                    onClick={() => setBookingSuccess(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                    Book Another Session
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Book Simulator Session</h2>
                <p className="text-sm text-gray-600 mb-4">
                    We’ll automatically assign the optimal bay at confirmation. Simulator bookings can be cancelled up to 24 hours out without penalty—inside that window you’ll need an admin override.
                </p>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
                    <p className="font-semibold">Refund policy</p>
                    <p>
                        Cancelling at least 24 hours in advance converts your payment into a simulator credit so you can rebook later at no charge.
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration
                        </label>
                        <select 
                            value={duration} 
                            onChange={(e) => {
                                setDuration(parseInt(e.target.value));
                                setSelectedSlot(null); // Reset selected slot when duration changes
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        >
                            <option value={30} className="text-gray-900">30 minutes</option>
                            <option value={60} className="text-gray-900">1 hour</option>
                            <option value={120} className="text-gray-900">2 hours</option>
                            <option value={180} className="text-gray-900">3 hours</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={checkAvailability} 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {loading ? 'Checking Availability...' : 'Check Availability'}
                    </button>
                </div>
            </div>

            {availability.simulator && availability.simulator.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                        <h3 className="text-xl font-bold text-gray-900">Available Time Slots</h3>
                        <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
                            <span className="font-medium">Book simulator sessions for</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">
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
                                    className={`p-4 border-2 rounded-lg transition duration-200 relative ${
                                        isDisabled
                                            ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-100 shadow-md cursor-pointer'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
                                    }`}
                                    onClick={() => handleSlotSelect(slot)}
                                    title={isDisabled ? `This slot cannot accommodate ${duration} minutes. Maximum available: ${getSuggestedDuration(slot)}` : ''}
                                >
                                    <div className={`text-lg font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
                                        })}
                                    </div>
                                    <div className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {slot.duration_minutes || duration} minutes
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Bay assigned automatically at confirmation
                                    </div>
                                    {isDisabled && (
                                        <div className="mt-2 pt-2 border-t border-red-200">
                                            <div className="text-xs text-red-600 font-medium">
                                                Exceeds availability
                                            </div>
                                            <div className="text-xs text-red-500 mt-1">
                                                Max: {getSuggestedDuration(slot)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    {availableCredits > 0 && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-900 font-semibold">You have {availableCredits} simulator credit{availableCredits > 1 ? 's' : ''}</p>
                                    <p className="text-sm text-purple-800">
                                        Use a credit to waive payment for this booking.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 text-purple-900 font-medium">
                                    <input 
                                        type="checkbox" 
                                        className="h-5 w-5 text-purple-600"
                                        checked={useCredit}
                                        onChange={(e) => setUseCredit(e.target.checked)}
                                        disabled={creditsLoading}
                                    />
                                    Apply credit
                                </label>
                            </div>
                        </div>
                    )}
                    {selectedSlot && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h4>
                            <div className="space-y-2 mb-4">
                                <p className="text-gray-700">
                                    <span className="font-medium">Date:</span> {new Date(selectedSlot.start_time).toLocaleDateString()}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Start Time:</span> {new Date(selectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">End Time:</span> {new Date(selectedSlot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Duration:</span> {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                                </p>
                            </div>
                            {useCredit && (
                                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                                    This booking will use one simulator credit. No additional payment is required.
                                </div>
                            )}
                            <button 
                                onClick={handleBooking}
                                disabled={bookingLoading}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
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
                            </button>
                        </div>
                    )}
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

export default SimulatorBooking;
