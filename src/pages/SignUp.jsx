import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signup, clearError } from '../store/slices/authSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Link2 } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 md:p-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                    Sign Up
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Name
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={formData.password_confirm}
                            onChange={(e) => setFormData({...formData, password_confirm: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
                
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
                    Already have an account?{' '}
                    <Link to="/signin" className="text-blue-600 hover:text-blue-800 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default SignUp;








