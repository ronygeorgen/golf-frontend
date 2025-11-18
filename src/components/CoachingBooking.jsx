import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkCoachingAvailability, createBooking, clearAvailability } from '../store/slices/bookingSlice';
import { getActiveCoachingPackages } from '../store/slices/coachingSlice';

function CoachingBooking() {
    const dispatch = useAppDispatch();
    const { availability, loading: bookingLoading } = useAppSelector((state) => state.booking);
    const { packages } = useAppSelector((state) => state.coaching);
    
    const [date, setDate] = useState('');
    const [duration, setDuration] = useState(60); // Duration in minutes
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState([]);

    useEffect(() => {
        // Load active coaching packages
        dispatch(getActiveCoachingPackages());
    }, [dispatch]);

    useEffect(() => {
        // Load coaches assigned to the selected package
        if (selectedPackage) {
            const packageData = packages.find(p => p.id === selectedPackage);
            setCoaches(packageData?.staff_members_details || []);
        } else {
            setCoaches([]);
        }
    }, [selectedPackage, packages]);

    const checkAvailability = async () => {
        if (!date) {
            alert('Please select a date');
            return;
        }

        if (!selectedPackage) {
            alert('Please select a coaching package');
            return;
        }

        // Clear selected slot and reset availability before checking
        setSelectedSlot(null);
        dispatch(clearAvailability()); // Clear previous availability slots
        
        setLoading(true);
        await dispatch(checkCoachingAvailability({
            date,
            packageId: selectedPackage,
            coachId: selectedCoach,
            duration: duration
        }));
        setLoading(false);
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

    const handleBooking = async () => {
        if (!selectedSlot) {
            alert('Please select a time slot');
            return;
        }

        if (!selectedSlot.available_coaches || selectedSlot.available_coaches.length === 0) {
            alert('No coach available for this slot');
            return;
        }

        const selectedCoachData = selectedSlot.available_coaches[0];

        try {
            const bookingData = {
                booking_type: 'coaching',
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                duration_minutes: duration,
                coaching_package: selectedPackage,
                coach: selectedCoachData.id,
                total_price: selectedPackage ? packages.find(p => p.id === selectedPackage)?.price || 0 : 0
            };

            await dispatch(createBooking(bookingData));
            setBookingSuccess(true);
        } catch (error) {
            alert('Error creating booking: ' + (error.message || 'Unknown error'));
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
                <p className="text-gray-600 mb-6">Your coaching session has been booked successfully.</p>
                <button 
                    onClick={() => {
                        setBookingSuccess(false);
                        setSelectedSlot(null);
                        setDate('');
                        setSelectedPackage(null);
                        setSelectedCoach(null);
                    }}
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
                <h2 className="text-xl font-bold text-gray-900 mb-4">Book Coaching Session</h2>
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
                            <option value={90} className="text-gray-900">1.5 hours</option>
                            <option value={120} className="text-gray-900">2 hours</option>
                            <option value={180} className="text-gray-900">3 hours</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Package
                        </label>
                        <select 
                            value={selectedPackage || ''} 
                            onChange={(e) => {
                                setSelectedPackage(e.target.value ? parseInt(e.target.value) : null);
                                setSelectedCoach(null);
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        >
                            <option value="" className="text-gray-900" disabled>
                                Select a package
                            </option>
                            {packages.map((pkg) => (
                                <option key={pkg.id} value={pkg.id} className="text-gray-900">
                                    {pkg.title} - ${pkg.price}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPackage && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Coach
                            </label>
                            {coaches.length > 0 ? (
                                <select 
                                    value={selectedCoach || ''} 
                                    onChange={(e) => setSelectedCoach(e.target.value ? parseInt(e.target.value, 10) : null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                >
                                    <option value="" className="text-gray-900">All Coaches in Package</option>
                                    {coaches.map((coach) => (
                                        <option key={coach.id} value={coach.id} className="text-gray-900">
                                            {coach.first_name} {coach.last_name} ({coach.email})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-red-600">No coaches are assigned to this package yet.</p>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={checkAvailability} 
                        disabled={loading || bookingLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {loading || bookingLoading ? 'Checking Availability...' : 'Check Availability'}
                    </button>
                </div>
            </div>

            {availability.coaching && availability.coaching.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                        <h3 className="text-xl font-bold text-gray-900">Available Time Slots</h3>
                        <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
                            <span className="font-medium">Book coaching sessions for</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Select date'}
                            </span>
                            <span className="text-gray-400">|</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">
                                {duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() : `${duration}min`}
                            </span>
                            {selectedCoach && (
                                <>
                                    <span className="text-gray-400">|</span>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold">
                                        {coaches.find(c => c.id === selectedCoach)?.first_name} {coaches.find(c => c.id === selectedCoach)?.last_name}
                                    </span>
                                </>
                            )}
                            {selectedPackage && (
                                <>
                                    <span className="text-gray-400">|</span>
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
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
                                    className={`p-4 border-2 rounded-lg transition duration-200 relative group ${
                                        disabled
                                            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-100 shadow-md cursor-pointer'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
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
                                    <div className={`text-lg font-semibold ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit'
                                        })}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {slot.available_coaches?.length || 0} coach{slot.available_coaches?.length !== 1 ? 'es' : ''} available
                                    </div>
                                    {disabled && (
                                        <div className="mt-2 text-xs text-red-600 font-medium">
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
                    
                    {selectedSlot && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h4 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h4>
                            <div className="space-y-2 mb-4">
                                <p className="text-gray-700">
                                    <span className="font-medium">Date:</span> {new Date(selectedSlot.start_time).toLocaleDateString()}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Time:</span> {new Date(selectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSlot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium">Duration:</span> {duration} minutes
                                </p>
                                {selectedSlot.available_coaches && selectedSlot.available_coaches.length > 0 && (
                                    <div className="mt-4">
                                        <p className="font-medium text-gray-700 mb-2">Available Coaches:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {selectedSlot.available_coaches.map((coach, idx) => (
                                                <li key={idx} className="text-gray-600">
                                                    {coach.name} (Bay {coach.assigned_bay})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedPackage && (
                                    <p className="text-gray-700 mt-2">
                                        <span className="font-medium">Price:</span> ${packages.find(p => p.id === selectedPackage)?.price || 0}
                                    </p>
                                )}
                            </div>
                            <button 
                                onClick={handleBooking} 
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                            >
                                Confirm Booking
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CoachingBooking;

