import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signup, verifyOTP, requestOTP, clearError, clearOTP, getActiveWaiver, checkWaiverAcceptance } from '../store/slices/authSlice';
// import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';
import DateInput from '../components/ui/DateInput';
import LiabilityWaiverPopup from '../components/LiabilityWaiverPopup';
import { X } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

function SignUp() {
    const dispatch = useAppDispatch();
    const { loading, error, otpSent, otpMessage, user, locationLogoUrl } = useAppSelector((state) => state.auth);
    // Logo is no longer shown on this page

    const [searchParams] = useSearchParams();
    const locationIdParam = searchParams.get('location_id') || searchParams.get('locationid');
    const initialLocationId = locationIdParam || localStorage.getItem('selected_location_id') || '';

    const [showWaiverPopup, setShowWaiverPopup] = useState(false);
    const [activeWaiver, setActiveWaiver] = useState(null);
    const [lockedLocationId, setLockedLocationId] = useState(initialLocationId || null);

    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        first_name: '',
        last_name: '',
        role: 'client',
        ghl_location_id: initialLocationId,
        date_of_birth: ''
    });

    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('signup'); // 'signup' or 'otp'
    const [toast, setToast] = useState({ show: false, messages: [] });
    const [locations, setLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);

    const navigate = useNavigate();

    // Fetch GHL locations on component mount
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                setLoadingLocations(true);
                const response = await apiClient.get(endpoints.auth.ghlLocations);
                if (response.data && response.data.locations) {
                    setLocations(response.data.locations);
                }
            } catch (error) {
                console.error('Failed to fetch GHL locations:', error);
                // Don't show error to user, just continue without location dropdown
            } finally {
                setLoadingLocations(false);
            }
        };
        fetchLocations();
    }, []);

    // Helper function to parse error messages from API response
    const parseErrorMessages = (error) => {
        if (!error) return [];

        // If error is a string, return it as is
        if (typeof error === 'string') {
            return [error];
        }

        // If error is an object, extract all messages
        const messages = [];

        // Handle nested error objects like { password: ["error1", "error2"] }
        for (const [key, value] of Object.entries(error)) {
            if (Array.isArray(value)) {
                // If value is an array, add each message
                value.forEach(msg => {
                    const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                    messages.push(`${fieldName}: ${msg}`);
                });
            } else if (typeof value === 'string') {
                const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                messages.push(`${fieldName}: ${value}`);
            } else if (typeof value === 'object' && value !== null) {
                // Recursively handle nested objects
                const nestedMessages = parseErrorMessages(value);
                messages.push(...nestedMessages);
            }
        }

        return messages.length > 0 ? messages : ['An error occurred during signup'];
    };

    useEffect(() => {
        // Clear OTP state on mount
        dispatch(clearError());
        dispatch(clearOTP());
        setStep('signup');
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            const errorMessages = parseErrorMessages(error);
            // Show all error messages as toast
            if (errorMessages.length > 0) {
                setToast({ show: true, messages: errorMessages });
                // Auto-hide after 8 seconds (longer for multiple messages)
                const timer = setTimeout(() => {
                    setToast({ show: false, messages: [] });
                }, 8000);
                return () => clearTimeout(timer);
            }
        }
    }, [error]);

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        setToast({ show: false, messages: [] });

        // Validate that location is selected (mandatory)
        if (!formData.ghl_location_id) {
            setToast({
                show: true,
                messages: ['Please select a location']
            });
            return;
        }

        // Prepare data - convert empty string to null for date_of_birth
        const submitData = {
            ...formData,
            date_of_birth: formData.date_of_birth || null
        };

        const result = await dispatch(signup(submitData));
        if (signup.fulfilled.match(result)) {
            // After successful signup, show OTP input
            setStep('otp');
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        const result = await dispatch(verifyOTP({ phone: formData.phone, otp }));
        if (verifyOTP.fulfilled.match(result)) {
            // Clear the popup flags on new signup
            sessionStorage.removeItem('dobPopupShown');
            sessionStorage.removeItem('waiverPopupShown');

            // Check for waiver first
            try {
                const waiverResult = await dispatch(getActiveWaiver());
                if (getActiveWaiver.fulfilled.match(waiverResult) && waiverResult.payload.waiver) {
                    const waiver = waiverResult.payload.waiver;
                    setActiveWaiver(waiver);

                    // Check if user has accepted
                    const acceptanceResult = await dispatch(checkWaiverAcceptance());
                    if (checkWaiverAcceptance.fulfilled.match(acceptanceResult)) {
                        const acceptance = acceptanceResult.payload;

                        // Show waiver popup if needed
                        if (acceptance.waiver_exists && acceptance.needs_acceptance) {
                            setShowWaiverPopup(true);
                            sessionStorage.setItem('waiverPopupShown', 'true');
                            return; // Don't redirect yet
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking waiver:', error);
            }

            // If no waiver needed, redirect to booking page
            navigate('/booking');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface rounded-card shadow-card w-full max-w-md p-6 md:p-8">
                {/* Logo removed - only shown after login */}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6 text-center">
                    Sign Up
                </h2>

                {step === 'signup' && (
                    <form onSubmit={handleSignupSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Phone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Select Location <span className="text-danger">*</span>
                                </label>
                                {loadingLocations ? (
                                    <div className="w-full px-4 py-3 border border-border rounded-button bg-background text-text-secondary text-center">
                                        Loading locations...
                                    </div>
                                ) : (
                                    <select
                                        value={formData.ghl_location_id}
                                        onChange={(e) => setFormData({ ...formData, ghl_location_id: e.target.value })}
                                        disabled={!!lockedLocationId}
                                        className={`w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary ${!!lockedLocationId ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        required
                                    >
                                        <option value="">Select a location</option>
                                        {locations.map((location) => (
                                            <option key={location.location_id} value={location.location_id}>
                                                {location.display_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Date of Birth <span className="text-text-secondary text-xs">(Optional)</span>
                            </label>
                            <DateInput
                                value={formData.date_of_birth}
                                onChange={(val) => setFormData({ ...formData, date_of_birth: val })}
                                max={new Date().toISOString().split('T')[0]}
                                placeholder="Select date of birth"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            className="w-full py-3"
                        >
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Enter OTP
                            </label>
                            <p className="text-sm text-text-secondary mb-3">
                                We've sent a verification code to {formData.phone}
                            </p>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl tracking-widest bg-background text-text-primary"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            className="w-full py-3"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </Button>
                        <p className="text-sm text-center text-text-secondary">
                            Didn't receive OTP?{' '}
                            <button
                                type="button"
                                className="text-primary hover:text-primary-light font-medium transition-colors"
                                onClick={() => {
                                    dispatch(clearError());
                                    dispatch(requestOTP(formData.phone));
                                }}
                            >
                                Resend
                            </button>
                        </p>
                    </form>
                )}

                {otpMessage && (
                    <div className="mt-4 p-3 bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-card">
                        <p className="text-sm text-status-confirmed-text text-center">{otpMessage}</p>
                    </div>
                )}

                {/* Toast Notification */}
                {toast.show && toast.messages.length > 0 && (
                    <div className="fixed top-4 right-4 z-50 animate-slide-in-right max-w-md">
                        <div className="bg-red-50 border-l-4 border-danger p-4 rounded-lg shadow-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-danger" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm text-red-700 font-medium mb-2">Signup Error</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {toast.messages.map((message, index) => (
                                            <li key={index} className="text-sm text-red-600">{message}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <button
                                        onClick={() => setToast({ show: false, messages: [] })}
                                        className="inline-flex text-red-400 hover:text-red-600 focus:outline-none"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <p className="mt-6 text-sm text-center text-text-secondary">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-primary hover:text-primary-light font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>

            <LiabilityWaiverPopup
                isOpen={showWaiverPopup}
                onClose={() => {
                    setShowWaiverPopup(false);
                    // After waiver is accepted, redirect to booking page
                    navigate('/booking');
                }}
                waiver={activeWaiver}
            />
        </div>
    );
}

export default SignUp;








