import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import SimulatorBooking from './SimulatorBooking';
import CoachingBooking from './CoachingBooking';
import Button from './ui/Button';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

function BookForClientModal({ isOpen, onClose, onBookingSuccess }) {
    const [step, setStep] = useState('select-client'); // 'select-client' or 'booking'
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [bookingType, setBookingType] = useState('simulator'); // 'simulator' or 'coaching'
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef(null);
    const modalRef = useRef(null);

    // Fetch clients
    const fetchClients = async (search = '') => {
        try {
            setLoading(true);
            const params = {};
            if (search.trim()) {
                params.search = search.trim();
            } else {
                params.page = 1;
            }
            const response = await apiClient.get(endpoints.auth.memberList, { params });
            setClients(response.data.members || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (isOpen && step === 'select-client') {
            fetchClients();
        }
    }, [isOpen, step]);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (isOpen && step === 'select-client') {
            setIsSearching(true);
            searchTimeoutRef.current = setTimeout(() => {
                fetchClients(searchQuery);
                setIsSearching(false);
            }, 300);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, isOpen, step]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('select-client');
            setSelectedClient(null);
            setSearchQuery('');
            setBookingType('simulator');
        }
    }, [isOpen]);

    // Handle client selection
    const handleClientSelect = (client) => {
        setSelectedClient(client);
        setStep('booking');
    };

    // Handle back to client selection
    const handleBack = () => {
        setStep('select-client');
        setSelectedClient(null);
    };

    // Handle booking success
    const handleBookingSuccess = () => {
        if (onBookingSuccess) {
            onBookingSuccess();
        }
        // Reset and close
        setStep('select-client');
        setSelectedClient(null);
        onClose();
    };

    // Close modal when clicking outside
    const handleOverlayClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                className="bg-surface rounded-card shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border flex-shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                        {step === 'select-client' ? 'Book for Client' : `Book ${bookingType === 'simulator' ? 'Simulator' : 'Coaching'} for ${selectedClient?.first_name} ${selectedClient?.last_name}`}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors p-1"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {step === 'select-client' ? (
                        <div className="space-y-4">
                            {/* Booking Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-3">
                                    Select Booking Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setBookingType('simulator')}
                                        className={`p-4 rounded-card border-2 transition-all ${
                                            bookingType === 'simulator'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border hover:border-primary/50 text-text-secondary'
                                        }`}
                                    >
                                        <div className="font-semibold">Simulator</div>
                                        <div className="text-xs mt-1">Book simulator session</div>
                                    </button>
                                    <button
                                        onClick={() => setBookingType('coaching')}
                                        className={`p-4 rounded-card border-2 transition-all ${
                                            bookingType === 'coaching'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border hover:border-primary/50 text-text-secondary'
                                        }`}
                                    >
                                        <div className="font-semibold">Coaching</div>
                                        <div className="text-xs mt-1">Book coaching session</div>
                                    </button>
                                </div>
                            </div>

                            {/* Client Search */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Search Client
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, email, or phone..."
                                    className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary"
                                />
                            </div>

                            {/* Client List */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Select Client
                                </label>
                                {loading || isSearching ? (
                                    <div className="py-8 text-center text-text-secondary">
                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        <p className="mt-2">Loading clients...</p>
                                    </div>
                                ) : clients.length > 0 ? (
                                    <div className="max-h-96 overflow-y-auto border border-border rounded-card">
                                        <div className="divide-y divide-border">
                                            {clients.map((client) => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => handleClientSelect(client)}
                                                    className="w-full p-4 text-left hover:bg-background transition-colors"
                                                >
                                                    <div className="font-semibold text-text-primary">
                                                        {client.first_name} {client.last_name}
                                                    </div>
                                                    <div className="text-sm text-text-secondary mt-1">
                                                        {client.email}
                                                    </div>
                                                    {client.phone && (
                                                        <div className="text-xs text-text-secondary mt-1">
                                                            {client.phone}
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-text-secondary">
                                        <p>No clients found</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-2">Try a different search term</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Back Button */}
                            <Button
                                onClick={handleBack}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Back to Client Selection
                            </Button>

                            {/* Client Info Banner */}
                            <div className="bg-primary/10 border border-primary/20 text-primary rounded-card p-4">
                                <p className="font-semibold">
                                    Booking on behalf of: {selectedClient.first_name} {selectedClient.last_name}
                                </p>
                                <p className="text-sm mt-1">
                                    {selectedClient.email} {selectedClient.phone && `• ${selectedClient.phone}`}
                                </p>
                            </div>

                            {/* Booking Type Tabs */}
                            <div className="bg-surface rounded-card shadow-card p-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBookingType('simulator')}
                                        className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                            bookingType === 'simulator'
                                                ? 'bg-primary/10 text-primary border border-primary'
                                                : 'bg-background text-text-secondary hover:bg-primary/5'
                                        }`}
                                    >
                                        Book Simulator
                                    </button>
                                    <button
                                        onClick={() => setBookingType('coaching')}
                                        className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                            bookingType === 'coaching'
                                                ? 'bg-primary/10 text-primary border border-primary'
                                                : 'bg-background text-text-secondary hover:bg-primary/5'
                                        }`}
                                    >
                                        Book Coaching
                                    </button>
                                </div>
                            </div>

                            {/* Booking Components */}
                            <div className="booking-content">
                                {bookingType === 'simulator' && (
                                    <SimulatorBooking
                                        client={selectedClient}
                                        onBookingSuccess={handleBookingSuccess}
                                    />
                                )}
                                {bookingType === 'coaching' && (
                                    <CoachingBooking
                                        client={selectedClient}
                                        onBookingSuccess={handleBookingSuccess}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BookForClientModal;




