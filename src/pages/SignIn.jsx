import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { requestOTP, verifyOTP, clearError, clearOTP } from '../store/slices/authSlice';
import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';

function SignIn() {
    const dispatch = useAppDispatch();
    const { loading, error, otpSent, otpMessage } = useAppSelector((state) => state.auth);
    
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('phone');
    
    const navigate = useNavigate();

    useEffect(() => {
        // Clear OTP state on mount
        dispatch(clearError());
        dispatch(clearOTP());
        setStep('phone');
    }, [dispatch]);

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
        </div>
    );
}

export default SignIn;
