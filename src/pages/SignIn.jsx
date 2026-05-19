import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOTP, verifyOTP, clearError, clearOTP, getActiveWaiver, checkWaiverAcceptance } from '../store/slices/authSlice';
// import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';
import DOBPopup from '../components/DOBPopup';
import LiabilityWaiverPopup from '../components/LiabilityWaiverPopup';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';

function SignIn() {
    const dispatch = useAppDispatch();
    const { loading, error, otpSent, otpMessage, user, locationLogoUrl } = useAppSelector((state) => state.auth);
    // Logo is no longer shown on this page
    const location = useLocation();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone');
    const [showDOBPopup, setShowDOBPopup] = useState(false);
    const [showWaiverPopup, setShowWaiverPopup] = useState(false);
    const [activeWaiver, setActiveWaiver] = useState(null);

    const navigate = useNavigate();
    const { toast, showInfo, showSuccess, hideToast } = useToast();

    useEffect(() => {
        // Clear OTP state on mount
        dispatch(clearError());
        dispatch(clearOTP());
        setStep('phone');

        // Show toast message if redirected from guest landing page
        if (location.state?.message) {
            showInfo(location.state.message);
            // Clear the state to prevent showing the message again on refresh
            window.history.replaceState({}, document.title);
        }

        // Check for purchase success message from URL params (after payment)
        const searchParams = new URLSearchParams(location.search);
        const purchaseSuccess = searchParams.get('purchase_success');
        const message = searchParams.get('message');
        if (purchaseSuccess === 'true' && message) {
            showSuccess(decodeURIComponent(message));
            // Clean up URL
            searchParams.delete('purchase_success');
            searchParams.delete('message');
            const newSearch = searchParams.toString();
            const newUrl = newSearch
                ? `${location.pathname}?${newSearch}`
                : location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [dispatch, location.state, location.search, showInfo, showSuccess]);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        const result = await dispatch(requestOTP(phone));
        if (requestOTP.fulfilled.match(result)) {
            setStep('otp');
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        const result = await dispatch(verifyOTP({ phone, otp }));
        if (verifyOTP.fulfilled.match(result)) {
            // Clear the popup flags on new login
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
                            return; // Don't check DOB yet
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking waiver:', error);
            }

            // Check if DOB is needed (only after waiver is handled)
            if (result.payload.needs_dob) {
                setShowDOBPopup(true);
                sessionStorage.setItem('dobPopupShown', 'true');
            } else {
                navigate('/'); // Navigate to root, LandingRedirect will handle role-based redirect
            }
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface rounded-card shadow-card w-full max-w-md p-6 md:p-8">
                {/* Logo removed - only shown after login */}
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-6 text-center">
                    Sign In
                </h2>

                {step === 'phone' && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            className="w-full py-3"
                        >
                            {loading ? 'Sending OTP...' : 'Get OTP'}
                        </Button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary text-center text-2xl tracking-widest"
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
                                onClick={handlePhoneSubmit}
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
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-danger/20 rounded-card">
                        <p className="text-sm text-danger text-center">
                            {typeof error === 'string' ? error : error?.error || 'An error occurred'}
                        </p>
                    </div>
                )}

                <p className="mt-6 text-sm text-center text-text-secondary">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary hover:text-primary-light font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>

            <LiabilityWaiverPopup
                isOpen={showWaiverPopup}
                onClose={() => {
                    setShowWaiverPopup(false);
                    // After waiver is accepted, check for DOB popup
                    if (user && !user.date_of_birth) {
                        setShowDOBPopup(true);
                        sessionStorage.setItem('dobPopupShown', 'true');
                    } else {
                        navigate('/'); // Navigate to root, LandingRedirect will handle role-based redirect
                    }
                }}
                waiver={activeWaiver}
            />
            <DOBPopup
                isOpen={showDOBPopup}
                onClose={() => {
                    setShowDOBPopup(false);
                    navigate('/'); // Navigate to root, LandingRedirect will handle role-based redirect
                }}
                onSkip={() => {
                    setShowDOBPopup(false);
                    navigate('/'); // Navigate to root, LandingRedirect will handle role-based redirect
                }}
            />

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

export default SignIn;
