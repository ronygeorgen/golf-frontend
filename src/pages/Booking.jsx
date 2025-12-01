import React, { useState } from 'react';
import SimulatorBooking from '../components/SimulatorBooking';
import CoachingBooking from '../components/CoachingBooking';
import Button from '../components/ui/Button';

function Booking() {
    const [activeTab, setActiveTab] = useState('simulator');

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 md:mb-8 text-center">
                    Book Your Session
                </h1>
                <div className="bg-status-pending-bg border border-status-pending-text/20 text-status-pending-text rounded-card p-4 mb-6 text-sm">
                    <p className="font-semibold">24-hour cancellation policy</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>Cancel coaching sessions ≥24 hours ahead to restore the session to your package.</li>
                        <li>Cancel simulator sessions ≥24 hours ahead to earn a simulator credit you can reuse later.</li>
                        <li>Contact an admin for any changes inside the 24-hour window.</li>
                    </ul>
                </div>
                
                <div className="bg-surface rounded-card shadow-card p-2 mb-6">
                    <div className="flex gap-2">
                        <button 
                            className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                activeTab === 'simulator' 
                                    ? 'bg-primary/10 text-primary border border-primary' 
                                    : 'bg-background text-text-secondary hover:bg-primary/5'
                            }`}
                            onClick={() => setActiveTab('simulator')}
                        >
                            Book Simulator
                        </button>
                        <button 
                            className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                activeTab === 'coaching' 
                                    ? 'bg-primary/10 text-primary border border-primary' 
                                    : 'bg-background text-text-secondary hover:bg-primary/5'
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
