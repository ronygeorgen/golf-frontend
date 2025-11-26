import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOTP, verifyOTP, clearError } from '../store/slices/authSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

function SignIn() {
    const dispatch = useAppDispatch();
    const { loading, error, otpSent, otpMessage } = useAppSelector((state) => state.auth);
    
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone');
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const locationId = searchParams.get('location');
        if (locationId && locationId.trim()) {
            // Store location_id for use during OTP verification
            const cleanLocationId = locationId.trim();
            localStorage.setItem('ghlLocationId', cleanLocationId);
            console.log('Stored GHL location_id from URL:', cleanLocationId);
            // Note: Onboarding is now done via OAuth flow at /api/ghlpage/onboard/
            // No need to POST here - just store the location_id for later use
        } else {
            // Clear if no location in URL
            localStorage.removeItem('ghlLocationId');
            console.log('No location parameter in URL, cleared ghlLocationId from localStorage');
        }
    }, [searchParams]);

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 md:p-8">
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
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
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
