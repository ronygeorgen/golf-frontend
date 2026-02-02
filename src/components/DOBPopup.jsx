import React, { useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateDob } from '../store/slices/authSlice';
import Button from './ui/Button';
import Toast from './ui/Toast';
import useToast from '../hooks/useToast';
import { X, Loader2 } from 'lucide-react';

function DOBPopup({ isOpen, onClose, onSkip }) {
    const dispatch = useAppDispatch();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // DOB is optional, so allow empty submission (which will be handled by skip)
        if (!dateOfBirth) {
            handleSkip();
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await dispatch(updateDob(dateOfBirth));
            if (updateDob.fulfilled.match(result)) {
                // Clear the flag when DOB is successfully saved
                sessionStorage.removeItem('dobPopupShown');
                const message = result.payload?.message || 'Date of birth updated successfully!';
                showSuccess(message);
                // Close popup after a short delay to show toast
                setTimeout(() => {
                    setLoading(false);
                    onClose();
                }, 500);
            } else {
                const errorMessage = result.payload?.error || 'Failed to update date of birth';
                setError(errorMessage);
                showError(errorMessage);
                setLoading(false);
            }
        } catch (err) {
            const errorMessage = 'An unexpected error occurred';
            setError(errorMessage);
            showError(errorMessage);
            setLoading(false);
        }
    };

    // Prevent form submission on Enter if date is empty
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !dateOfBirth) {
            e.preventDefault();
        }
    };

    const handleSkip = async () => {
        if (closing) return; // Prevent multiple calls
        
        setClosing(true);
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (onSkip) {
            onSkip();
        }
        onClose();
        setClosing(false);
    };
    
    const handleClose = async () => {
        if (closing || loading) return; // Prevent closing during loading
        
        setClosing(true);
        // Small delay for smooth transition
        await new Promise(resolve => setTimeout(resolve, 200));
        
        onClose();
        setClosing(false);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)' }}>
                <div className="bg-surface rounded-card shadow-xl max-w-md w-full p-6 relative">
                    {/* Loading overlay */}
                    {(loading || closing) && (
                        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm rounded-card z-10 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                                <p className="text-text-secondary text-sm">
                                    {loading ? 'Saving...' : 'Closing...'}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ opacity: (loading || closing) ? 0.5 : 1 }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-text-primary">Date of Birth</h2>
                            <button
                                onClick={handleClose}
                                disabled={loading || closing}
                                className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <p className="text-sm text-text-secondary mb-4">
                            Please provide your date of birth to complete your profile. This information helps us serve you better.
                        </p>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => {
                                        setDateOfBirth(e.target.value);
                                        setError('');
                                    }}
                                    onKeyDown={handleKeyDown}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                />
                                {error && (
                                    <p className="text-sm text-danger mt-1">{error}</p>
                                )}
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <Button 
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={handleSkip}
                                    disabled={loading || closing}
                                >
                                    Skip for Now
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={loading || closing}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                            Saving...
                                        </>
                                    ) : 'Save'}
                                </Button>
                            </div>
                        </form>
                    </div>
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

export default DOBPopup;







