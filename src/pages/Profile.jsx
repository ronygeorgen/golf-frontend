import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getProfile, updateProfile, logout } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Toast from '../components/ui/Toast';
import useToast from '../hooks/useToast';
import { FormSkeleton } from '../components/skeletons/SkeletonLoader';

function Profile() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user, loading } = useAppSelector((state) => state.auth);
    const { toast, showSuccess, showError, showWarning, showToast, hideToast } = useToast();
    
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        first_name: '',
        last_name: '',
        date_of_birth: ''
    });
    
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formInitialized, setFormInitialized] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const countdownIntervalRef = useRef(null);

    // Only fetch profile once on mount, and only if user data is missing or incomplete
    useEffect(() => {
        // Only fetch if we don't have complete user data
        if (!user || !user.email) {
            dispatch(getProfile());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array - only run once on mount

    // Update form data when user changes, but only initialize once
    useEffect(() => {
        if (user && user.email && !formInitialized) {
            // Format date_of_birth for date input (YYYY-MM-DD)
            let dob = '';
            if (user.date_of_birth) {
                const date = new Date(user.date_of_birth);
                if (!isNaN(date.getTime())) {
                    dob = date.toISOString().split('T')[0];
                }
            }
            
            setFormData({
                email: user.email || '',
                phone: user.phone || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                date_of_birth: dob
            });
            setFormInitialized(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Only depend on user.id to initialize form once when user loads

    // Handle countdown for phone change logout
    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            // Clear any existing interval
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }

            // Update toast message immediately
            showWarning(
                `Your phone number has been updated. You will be logged out in ${countdown} second${countdown !== 1 ? 's' : ''}...`,
                0 // 0 duration means persistent (won't auto-close)
            );

            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev === null || prev <= 1) {
                        // Countdown finished, logout
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }
                        hideToast(); // Hide countdown toast
                        dispatch(logout()).then(() => {
                            navigate('/signin');
                        });
                        return null;
                    }
                    
                    const newCount = prev - 1;
                    
                    // Update toast message with new countdown
                    showWarning(
                        `Your phone number has been updated. You will be logged out in ${newCount} second${newCount !== 1 ? 's' : ''}...`,
                        0 // Persistent toast
                    );
                    
                    return newCount;
                });
            }, 1000);
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
        };
    }, [countdown, dispatch, navigate, showWarning, hideToast]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Set loading state immediately to show skeleton
        setSubmitLoading(true);
        
        try {
            // Prepare data - convert empty string to null for date_of_birth
            const updateData = {
                ...formData,
                date_of_birth: formData.date_of_birth || null
            };
            
            const result = await dispatch(updateProfile(updateData));
            
            if (updateProfile.fulfilled.match(result)) {
                // Reset form initialization flag so form updates with new user data
                setFormInitialized(false);
                
                if (result.payload.phone_changed) {
                    // Show success message first
                    const message = result.payload?.message || 'Profile updated successfully!';
                    showSuccess(message);
                    
                    // Start countdown after a short delay to show success message first
                    setTimeout(() => {
                        setCountdown(4); // Start countdown from 4
                    }, 1500);
                } else {
                    const message = result.payload?.message || 'Profile updated successfully!';
                    showSuccess(message);
                }
            } else {
                const errorMessage = result.payload?.error || 'Failed to update profile';
                showError(errorMessage);
            }
        } catch (err) {
            showError('An unexpected error occurred');
        } finally {
            // Small delay to ensure skeleton shows properly before clearing
            setTimeout(() => {
                setSubmitLoading(false);
            }, 300);
        }
    };

    // Show skeleton while loading user data initially
    if (loading && !user) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6"></div>
                <div className="bg-surface rounded-card shadow-card p-6">
                    <FormSkeleton fields={5} />
                </div>
            </div>
        );
    }

    // Show skeleton when submitting (primary control)
    // Also show if Redux loading is active during update (fallback)
    const showSkeleton = submitLoading || (loading && user && formInitialized);

    return (
        <>
            <div className="max-w-2xl mx-auto p-6 relative">
                <h1 className="text-2xl font-bold text-text-primary mb-6">Profile Settings</h1>
                
                <div className="bg-surface rounded-card shadow-card p-6 relative">
                    {/* Show skeleton loading when submitting or updating */}
                    {showSkeleton ? (
                        <FormSkeleton fields={5} showGrid={true} />
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                    className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                    required
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
                                    className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                    required
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
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                required
                            />
                            <p className="text-xs text-text-secondary mt-1">
                                If you change your phone number, you'll need to logout and login with the new number to verify it.
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Date of Birth <span className="text-text-secondary text-xs">(Optional)</span>
                            </label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        
                            <div className="flex gap-4 pt-4">
                                <Button 
                                    type="submit" 
                                    disabled={submitLoading}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    Update Profile
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
            
            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}
        </>
    );
}

export default Profile;










