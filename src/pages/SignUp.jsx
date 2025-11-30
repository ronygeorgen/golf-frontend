import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signup, clearError } from '../store/slices/authSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Link2 } from 'lucide-react';
import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';

function SignUp() {
    const dispatch = useAppDispatch();
    const { loading, error } = useAppSelector((state) => state.auth);
    
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        role: 'client'
    });
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const locationId = searchParams.get('location');
        if (locationId) {
            localStorage.setItem('ghlLocationId', locationId);
            const onboardFlag = `ghlOnboarded:${locationId}`;
            if (!localStorage.getItem(onboardFlag)) {
                apiClient.post(endpoints.ghl.onboard, { location_id: locationId })
                    .then(() => localStorage.setItem(onboardFlag, 'true'))
                    .catch(() => {});
            }
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        const result = await dispatch(signup(formData));
        if (signup.fulfilled.match(result)) {
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
                    Sign Up
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                First Name
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={formData.password_confirm}
                            onChange={(e) => setFormData({...formData, password_confirm: e.target.value})}
                            required
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
                    Already have an account?{' '}
                    <Link to="/signin" className="text-primary hover:text-primary-light font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignUp;








