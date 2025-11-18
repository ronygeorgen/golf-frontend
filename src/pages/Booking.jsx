import React, { useState } from 'react';
import SimulatorBooking from '../components/SimulatorBooking';
import CoachingBooking from '../components/CoachingBooking';

function Booking() {
    const [activeTab, setActiveTab] = useState('simulator');

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 md:mb-8 text-center">
                    Book Your Session
                </h1>
                
                <div className="bg-white rounded-lg shadow-md p-2 mb-6">
                    <div className="flex gap-2">
                        <button 
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition duration-200 ${
                                activeTab === 'simulator' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setActiveTab('simulator')}
                        >
                            Book Simulator
                        </button>
                        <button 
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition duration-200 ${
                                activeTab === 'coaching' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setActiveTab('coaching')}
                        >
                            Book Coaching
                        </button>
                    </div>
                </div>
                
                <div className="booking-content">
                    {activeTab === 'simulator' && <SimulatorBooking />}
                    {activeTab === 'coaching' && <CoachingBooking />}
                </div>
            </div>
        </div>
    );
}

export default Booking;
