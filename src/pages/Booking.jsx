import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SimulatorBooking from '../components/SimulatorBooking';
import CoachingBooking from '../components/CoachingBooking';
import Button from '../components/ui/Button';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

function Booking() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast, showSuccess, hideToast } = useToast();

    // Get tab from URL params or default to 'simulator'
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(
        tabFromUrl === 'coaching' || tabFromUrl === 'simulator' ? tabFromUrl : 'simulator'
    );

    /** Phase A: categories from API (legacy_booking_type maps to existing booking stack) */
    const [serviceCategories, setServiceCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const bookableCategories = useMemo(() => {
        return (serviceCategories || []).filter(
            (c) => c.legacy_booking_type === 'simulator' || c.legacy_booking_type === 'coaching'
        );
    }, [serviceCategories]);

    const useCategoryDropdown = !categoriesLoading && bookableCategories.length > 0;

    // Show toast message if redirected from guest registration
    useEffect(() => {
        if (location.state?.message) {
            showSuccess(location.state.message);
            // Clear the state to prevent showing the message again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, showSuccess]);

    // Update activeTab when URL param changes
    useEffect(() => {
        if (tabFromUrl === 'simulator' || tabFromUrl === 'coaching') {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    // Load service categories (location_id is appended by axios interceptor when set)
    useEffect(() => {
        let cancelled = false;
        async function loadCategories() {
            setCategoriesLoading(true);
            try {
                const { data } = await apiClient.get(endpoints.categories.active);
                if (!cancelled && Array.isArray(data)) {
                    setServiceCategories(data);
                }
            } catch (e) {
                if (!cancelled) {
                    setServiceCategories([]);
                }
            } finally {
                if (!cancelled) {
                    setCategoriesLoading(false);
                }
            }
        }
        loadCategories();
        return () => {
            cancelled = true;
        };
    }, []);

    // When categories arrive, align selection with ?tab= or current active tab
    useEffect(() => {
        if (!bookableCategories.length) {
            setSelectedCategoryId(null);
            return;
        }
        const wantTab =
            tabFromUrl === 'coaching' || tabFromUrl === 'simulator' ? tabFromUrl : activeTab;
        const pick =
            bookableCategories.find((c) => c.legacy_booking_type === wantTab) || bookableCategories[0];
        setSelectedCategoryId(pick.id);
        if (pick.legacy_booking_type && pick.legacy_booking_type !== activeTab) {
            setActiveTab(pick.legacy_booking_type);
        }
    }, [bookableCategories, tabFromUrl, activeTab]);

    const handleCategorySelectChange = (e) => {
        const id = Number(e.target.value);
        const cat = bookableCategories.find((c) => c.id === id);
        if (!cat || !cat.legacy_booking_type) return;
        setSelectedCategoryId(id);
        setActiveTab(cat.legacy_booking_type);
        navigate(`/booking?tab=${cat.legacy_booking_type}`, { replace: true, state: { client } });
    };

    const handleLegacyTabClick = (tab) => {
        setActiveTab(tab);
        navigate(`/booking?tab=${tab}`, { replace: true, state: { client } });
        if (useCategoryDropdown) {
            const cat = bookableCategories.find((c) => c.legacy_booking_type === tab);
            if (cat) setSelectedCategoryId(cat.id);
        }
    };

    // Check for client in location state (passed from MemberList)
    const client = location.state?.client;

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-6 md:mb-8 text-center">
                    {client ? `Book Session for ${client.first_name} ${client.last_name}` : 'Book Your Session'}
                </h1>

                {client && (
                    <div className="bg-primary/10 border border-primary/20 text-primary rounded-card p-4 mb-6 text-center relative">
                        <p className="font-semibold">
                            You are booking on behalf of a client.
                        </p>
                        <p className="text-sm mt-1 mb-2">
                            Purchases and bookings will be assigned to {client.first_name} {client.last_name}.
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                // Clear client from state by navigating to the same URL without state
                                navigate('/booking' + location.search, { replace: true, state: {} });
                            }}
                            className="text-xs py-1 px-3 h-auto"
                        >
                            Reset / Cancel Client Booking
                        </Button>
                    </div>
                )}

                <div className="bg-status-pending-bg border border-status-pending-text/20 text-status-pending-text rounded-card p-4 mb-6 text-sm">
                    <p className="font-semibold">24-hour cancellation policy</p>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                        <li>Cancel coaching sessions ≥24 hours ahead to restore the session to your package.</li>
                        <li>Cancel simulator sessions ≥24 hours ahead to earn a simulator credit you can reuse later.</li>
                        <li>Contact an admin for any changes inside the 24-hour window.</li>
                    </ul>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 mb-6">
                    {categoriesLoading ? (
                        <p className="text-sm text-text-secondary py-2 text-center">Loading session types…</p>
                    ) : useCategoryDropdown ? (
                        <div className="space-y-2">
                            <label htmlFor="booking-category" className="block text-sm font-semibold text-text-primary">
                                Type of session
                            </label>
                            <select
                                id="booking-category"
                                className="w-full rounded-button border border-border bg-background px-4 py-3 text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={selectedCategoryId ?? ''}
                                onChange={handleCategorySelectChange}
                                disabled={categoriesLoading}
                            >
                                {categoriesLoading && <option value="">Loading…</option>}
                                {!categoriesLoading &&
                                    bookableCategories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.customer_label || c.name}
                                        </option>
                                    ))}
                            </select>
                            <p className="text-xs text-text-secondary">
                                Categories are managed per location. New sports or fitness types will appear here in a
                                later phase once configured in admin.
                            </p>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                    activeTab === 'simulator'
                                        ? 'bg-primary/10 text-primary border border-primary'
                                        : 'bg-background text-text-secondary hover:bg-primary/5'
                                }`}
                                onClick={() => handleLegacyTabClick('simulator')}
                            >
                                Book Simulator
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-3 px-4 rounded-button font-semibold transition duration-200 ${
                                    activeTab === 'coaching'
                                        ? 'bg-primary/10 text-primary border border-primary'
                                        : 'bg-background text-text-secondary hover:bg-primary/5'
                                }`}
                                onClick={() => handleLegacyTabClick('coaching')}
                            >
                                Book Coaching
                            </button>
                        </div>
                    )}
                </div>

                <div className="booking-content">
                    {activeTab === 'simulator' && <SimulatorBooking client={client} />}
                    {activeTab === 'coaching' && <CoachingBooking client={client} />}
                </div>
            </div>

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

export default Booking;
