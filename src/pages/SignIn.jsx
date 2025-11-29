import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOTP, verifyOTP, clearError, clearOTP } from '../store/slices/authSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Link2 } from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 md:p-8">
                <div className="flex justify-center mb-6">
                    <img 
                        src={logo} 
                        alt="Hole 9 Golf Logo" 
                        className="h-16 w-auto object-contain"
                    />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                    Sign In
                </h2>
                
                {step === 'phone' && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        {!hasLocationId && (
                            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800 text-center">
                                    Location ID is required. Please access this page with a valid location parameter.
                                </p>
                            </div>
                        )}
                        <button 
                            type="submit" 
                            disabled={loading || !hasLocationId}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                        >
                            {loading ? 'Sending OTP...' : 'Get OTP'}
                        </button>
                    </form>
                )}
                
                {step === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <p className="text-sm text-center text-gray-600">
                            Didn't receive OTP?{' '}
                            <button 
                                type="button" 
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                onClick={handlePhoneSubmit}
                            >
                                Resend
                            </button>
                        </p>
                    </form>
                )}
                
                {otpMessage && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 text-center">{otpMessage}</p>
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 text-center">
                            {typeof error === 'string' ? error : error?.error || 'An error occurred'}
                        </p>
                    </div>
                )}
                
                {/* GHL Onboard Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={handleGHLOnboard}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Link2 className="w-4 h-4" />
                        <span>Onboard GHL Location</span>
                    </button>
                </div>
                
                <p className="mt-6 text-sm text-center text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignIn;
