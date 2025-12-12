import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { signup, clearError } from '../store/slices/authSlice';
import logo from '../assets/hole9golf-logo.png';
import Button from '../components/ui/Button';
import { X } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

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
        role: 'client',
        ghl_location_id: '',
        date_of_birth: ''
    });
    
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        setToast({ show: false, messages: [] });
        
        // Prepare data - convert empty string to null for date_of_birth
        const submitData = {
            ...formData,
            date_of_birth: formData.date_of_birth || null
        };
        
        const result = await dispatch(signup(submitData));
        if (signup.fulfilled.match(result)) {
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
                    
                    {locations.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Select Location <span className="text-text-secondary text-xs">(Optional)</span>
                            </label>
                            <select
                                value={formData.ghl_location_id}
                                onChange={(e) => setFormData({...formData, ghl_location_id: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                            >
                                <option value="">Select a location (optional)</option>
                                {locations.map((location) => (
                                    <option key={location.location_id} value={location.location_id}>
                                        {location.display_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Date of Birth <span className="text-text-secondary text-xs">(Optional)</span>
                        </label>
                        <input
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
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
        </div>
    );
}

export default SignUp;








