import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { cancelMembership, getMyMemberships } from '../store/slices/membershipSlice';

/**
 * Modal for viewing and managing an existing membership subscription.
 */
function MembershipManageModal({ isOpen, onClose, subscription }) {
    const dispatch = useAppDispatch();
    const { canceling } = useAppSelector((state) => state.memberships);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [cancelError, setCancelError] = useState('');
    const [cancelSuccess, setCancelSuccess] = useState(false);

    const handleCancel = async () => {
        setCancelError('');
        const res = await dispatch(cancelMembership(subscription.subscription_id));
        if (cancelMembership.fulfilled.match(res)) {
            dispatch(getMyMemberships());
            setCancelSuccess(true);
            setConfirmCancel(false);
        } else {
            setCancelError(res.payload?.error || 'Failed to cancel. Please try again.');
            setConfirmCancel(false);
        }
    };

    const handleClose = () => {
        setConfirmCancel(false);
        setCancelError('');
        setCancelSuccess(false);
        onClose();
    };

    if (!isOpen || !subscription) return null;

    const isCanceled = subscription.status === 'canceled';
    const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    const hoursPercent = subscription.hours_total > 0
        ? Math.min(100, Math.round((subscription.hours_remaining / subscription.hours_total) * 100))
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative bg-surface rounded-card shadow-2xl w-full max-w-md z-10 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 ${ isCanceled ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-primary to-primary/80'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{isCanceled ? '⏹' : '🔁'}</span>
                                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                                    {isCanceled ? 'Canceled Membership' : 'Active Membership'}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white">{subscription.package_title}</h2>
                        </div>
                        <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {cancelSuccess && (
                        <div className="bg-status-confirmed-bg border border-status-confirmed-text/30 rounded-xl p-3">
                            <p className="text-sm text-status-confirmed-text font-medium">
                                ✅ Subscription canceled. Your hours remain active until {periodEnd}.
                            </p>
                        </div>
                    )}

                    {cancelError && (
                        <div className="bg-status-cancelled-bg border border-status-cancelled-text/30 rounded-xl p-3">
                            <p className="text-sm text-status-cancelled-text">{cancelError}</p>
                        </div>
                    )}

                    {/* Hours progress */}
                    <div className="bg-background rounded-xl p-4 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-primary">Hours this period</span>
                            <span className="text-sm font-bold text-primary">{subscription.hours_remaining} / {subscription.hours_total} hrs</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${hoursPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-background rounded-xl p-3 border border-border">
                            <p className="text-xs text-text-secondary mb-1">Monthly Price</p>
                            <p className="text-base font-bold text-text-primary">${subscription.package_price}<span className="text-xs font-normal text-text-secondary">/mo</span></p>
                        </div>
                        <div className="bg-background rounded-xl p-3 border border-border">
                            <p className="text-xs text-text-secondary mb-1">Hours/Month</p>
                            <p className="text-base font-bold text-text-primary">{subscription.monthly_hours} hrs</p>
                        </div>
                        <div className="bg-background rounded-xl p-3 border border-border col-span-2">
                            <p className="text-xs text-text-secondary mb-1">{isCanceled ? 'Access Until' : 'Next Billing / Reset'}</p>
                            <p className="text-sm font-semibold text-text-primary">{periodEnd || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Cancel section */}
                    {!isCanceled && !cancelSuccess && (
                        <div className="pt-2">
                            {!confirmCancel ? (
                                <button
                                    onClick={() => setConfirmCancel(true)}
                                    className="w-full py-2.5 border border-status-cancelled-text text-status-cancelled-text rounded-button text-sm font-medium hover:bg-status-cancelled-bg transition-all"
                                >
                                    Cancel Membership
                                </button>
                            ) : (
                                <div className="bg-status-cancelled-bg border border-status-cancelled-text/30 rounded-xl p-4 space-y-3">
                                    <p className="text-sm text-text-primary font-medium">Are you sure you want to cancel?</p>
                                    <p className="text-xs text-text-secondary">Your hours will remain active until {periodEnd}. No refunds are issued.</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setConfirmCancel(false)}
                                            className="flex-1 py-2 border border-border text-text-primary rounded-button text-sm font-medium hover:bg-background transition-all"
                                            disabled={canceling}
                                        >
                                            Keep It
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={canceling}
                                            className="flex-1 py-2 bg-status-cancelled-text text-white rounded-button text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                        >
                                            {canceling ? 'Canceling...' : 'Yes, Cancel'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(isCanceled || cancelSuccess) && (
                        <p className="text-xs text-text-secondary text-center">
                            This membership has been canceled. Your hours are available until {periodEnd}.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MembershipManageModal;
