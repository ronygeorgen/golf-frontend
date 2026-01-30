import React, { useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { acceptWaiver } from '../store/slices/authSlice';
import Button from './ui/Button';
import Toast from './ui/Toast';
import useToast from '../hooks/useToast';
import { X, Loader2 } from 'lucide-react';

function LiabilityWaiverPopup({ isOpen, onClose, waiver }) {
    const dispatch = useAppDispatch();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleAccept = async (e) => {
        e.preventDefault();
        
        if (!agreed) {
            showError('Please check the agreement checkbox to continue');
            return;
        }

        setLoading(true);

        try {
            // Get current time in Halifax timezone and convert to UTC
            const now = new Date();
            
            // Format current time in Halifax timezone
            const halifaxTZ = Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Halifax',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            const parts = halifaxTZ.formatToParts(now);
            const year = parts.find(p => p.type === 'year').value;
            const month = parts.find(p => p.type === 'month').value;
            const day = parts.find(p => p.type === 'day').value;
            const hour = parts.find(p => p.type === 'hour').value;
            const minute = parts.find(p => p.type === 'minute').value;
            const second = parts.find(p => p.type === 'second').value;
            
            // Create ISO string in Halifax timezone format (backend will convert to UTC)
            // Format: YYYY-MM-DDTHH:mm:ss (without timezone, backend will interpret as Halifax)
            const halifaxISO = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
            
            const result = await dispatch(acceptWaiver({
                waiver_id: waiver.id,
                accepted_at: halifaxISO
            }));
            
            if (acceptWaiver.fulfilled.match(result)) {
                showSuccess('Waiver accepted successfully');
                setTimeout(() => {
                    setLoading(false);
                    onClose();
                }, 500);
            } else {
                const errorMessage = result.payload?.error || 'Failed to accept waiver';
                showError(errorMessage);
                setLoading(false);
            }
        } catch (err) {
            const errorMessage = 'An unexpected error occurred';
            showError(errorMessage);
            setLoading(false);
        }
    };

    const handleClose = async () => {
        if (closing || loading) return;
        
        setClosing(true);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        onClose();
        setClosing(false);
    };

    // Render formatted content
    const renderContent = () => {
        if (!waiver || !waiver.content || !Array.isArray(waiver.content)) {
            return <p className="text-text-secondary">No waiver content available.</p>;
        }

        return waiver.content.map((item, index) => {
            const { type, text, bold, italic } = item;
            const className = [];
            
            if (type === 'heading') {
                className.push('text-lg font-bold mb-2');
            } else {
                className.push('mb-2');
            }
            
            if (bold) className.push('font-bold');
            if (italic) className.push('italic');
            
            return (
                <p key={index} className={className.join(' ')}>
                    {text}
                </p>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)' }}>
                <div className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
                    {/* Loading overlay */}
                    {(loading || closing) && (
                        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm rounded-card z-10 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                                <p className="text-text-secondary text-sm">
                                    {loading ? 'Processing...' : 'Closing...'}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <div style={{ opacity: (loading || closing) ? 0.5 : 1 }}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-text-primary">Liability Waiver</h2>
                            <button
                                onClick={handleClose}
                                disabled={loading || closing}
                                className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-6 text-text-primary max-h-[60vh] overflow-y-auto pr-2">
                            {renderContent()}
                        </div>
                        
                        <form onSubmit={handleAccept} className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <input
                                    type="checkbox"
                                    id="waiver-agreement"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    disabled={loading || closing}
                                    className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                                />
                                <label htmlFor="waiver-agreement" className="text-sm text-text-primary cursor-pointer">
                                    I agree to the liability waiver
                                </label>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <Button 
                                    type="submit"
                                    disabled={!agreed || loading || closing}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                                            Accepting...
                                        </>
                                    ) : 'Accept'}
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

export default LiabilityWaiverPopup;

