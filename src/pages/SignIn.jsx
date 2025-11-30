import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOTP, verifyOTP, clearError, clearOTP } from '../store/slices/authSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Link2 } from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';

function SignIn() {
    const dispatch = useAppDispatch();
    const { loading, error, otpSent, otpMessage } = useAppSelector((state) => state.auth);
    
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone');
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [hasLocationId, setHasLocationId] = useState(false);

    useEffect(() => {
        const locationId = searchParams.get('location');
        if (locationId && locationId.trim()) {
            // Store location_id for use during OTP verification
            const cleanLocationId = locationId.trim();
            localStorage.setItem('ghlLocationId', cleanLocationId);
            setHasLocationId(true);
            console.log('Stored GHL location_id from URL:', cleanLocationId);
            // Note: Onboarding is now done via OAuth flow at /api/ghlpage/onboard/
            // No need to POST here - just store the location_id for later use
        } else {
            // Clear if no location in URL
            localStorage.removeItem('ghlLocationId');
            setHasLocationId(false);
            console.log('No location parameter in URL, cleared ghlLocationId from localStorage');
        }
        // Clear OTP state when location changes
        dispatch(clearError());
        dispatch(clearOTP());
        setStep('phone');
    }, [searchParams, dispatch]);

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
            navigate('/booking');
        }
    };

    const handleGHLOnboard = () => {
        const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
        const onboardURL = `${baseURL}${endpoints.ghl.onboard}`;
        window.open(onboardURL, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-surface rounded-card shadow-card w-full max-w-md p-6 md:p-8">
                <div className="flex justify-center mb-6">
                    <img 
                        src={logo} 
                        alt="Hole 9 Golf Logo" 
                        className="h-16 w-auto object-contain"
                    />
                </div>
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
                        {!hasLocationId && (
                            <div className="mb-2 p-3 bg-status-pending-bg border border-status-pending-text/20 rounded-card">
                                <p className="text-sm text-status-pending-text text-center">
                                    Location ID is required. Please access this page with a valid location parameter.
                                </p>
                            </div>
                        )}
                        <Button 
                            type="submit" 
                            disabled={loading || !hasLocationId}
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
                
                {/* GHL Onboard Button */}
                <div className="mt-4 pt-4 border-t border-border">
                    <Button
                        onClick={handleGHLOnboard}
                        variant="accent"
                        className="w-full flex items-center justify-center space-x-2"
                    >
                        <Link2 className="w-4 h-4" />
                        <span>Onboard GHL Location</span>
                    </Button>
                </div>
                
                <p className="mt-6 text-sm text-center text-text-secondary">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary hover:text-primary-light font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignIn;
