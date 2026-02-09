import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getGiftsPending, claimGift, getMyPackagePurchases } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';
import PopupMessage from './PopupMessage';
import { ListSkeleton } from './skeletons/SkeletonLoader';
import Button from './ui/Button';
import { Gift } from 'lucide-react';

function GiftClaim() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { giftsPending, giftsLoading } = useAppSelector((state) => state.coaching);
    const [processingId, setProcessingId] = useState(null);
    const [processingAction, setProcessingAction] = useState(null);

    useEffect(() => {
        dispatch(getGiftsPending());
    }, [dispatch]);

    const handleClaimGift = async (gift, action) => {
        setProcessingId(gift.id);
        setProcessingAction(action);
        const result = await dispatch(claimGift({ token: gift.gift_token, action }));

        if (claimGift.fulfilled.match(result)) {
            if (action === 'accept') {
                openPopup({
                    type: 'success',
                    title: 'Gift Accepted!',
                    message: 'The gift has been added to your account. You can now book sessions.',
                });
                dispatch(getMyPackagePurchases());
            } else {
                openPopup({
                    type: 'info',
                    title: 'Gift Rejected',
                    message: 'You have rejected this gift.',
                });
            }
            dispatch(getGiftsPending());
        } else {
            openPopup({
                type: 'error',
                title: 'Error',
                message: result.payload?.error || 'Unable to process gift claim.',
            });
        }
        setProcessingId(null);
        setProcessingAction(null);
    };

    if (giftsLoading) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold text-text-primary mb-4">Pending Gifts</h2>
                <ListSkeleton items={3} />
            </div>
        );
    }

    if (!giftsPending || giftsPending.length === 0) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-text-primary">Pending Gifts</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                        <Gift className="w-10 h-10 text-accent" />
                    </div>
                    <p className="text-text-secondary text-center">You have no pending gifts at this time.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-text-primary">Pending Gifts</h2>
            </div>
            <div className="flex-1">
                <div className="space-y-4">
                    {giftsPending.map((gift) => (
                        <div key={gift.id} className="border border-border rounded-card p-4 hover:shadow-card-hover transition-shadow bg-surface">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-text-primary">{gift.purchase_name || gift.package_details?.title}</h3>
                                    <p className="text-sm text-text-secondary mt-1">{gift.package_details?.title}</p>
                                    <p className="text-sm text-text-secondary">{gift.package_details?.description}</p>
                                    {gift.original_owner_details && (
                                        <p className="text-sm text-text-secondary mt-2">
                                            From: {gift.original_owner_details.first_name} {gift.original_owner_details.last_name}
                                        </p>
                                    )}
                                </div>
                                <div className="ml-4 text-right">
                                    <div className="text-2xl font-bold text-primary">{gift.sessions_total}</div>
                                    <div className="text-xs text-text-secondary">sessions</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleClaimGift(gift, 'accept')}
                                    disabled={processingId === gift.id}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {processingId === gift.id && processingAction === 'accept' ? 'Accepting...' : 'Accept Gift'}
                                </Button>
                                <Button
                                    onClick={() => handleClaimGift(gift, 'reject')}
                                    disabled={processingId === gift.id}
                                    variant="danger"
                                    className="flex-1"
                                >
                                    {processingId === gift.id && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                                </Button>
                            </div>
                            {gift.gift_expires_at && (
                                <p className="text-xs text-text-secondary mt-2">
                                    Expires: {new Date(gift.gift_expires_at).toLocaleDateString('en-US', { timeZone: 'America/Halifax' })}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <PopupMessage
                    open={popup.open}
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    confirmText={popup.confirmText}
                    cancelText={popup.cancelText}
                    showCancel={popup.showCancel}
                    onConfirm={popup.onConfirm ? async () => {
                        const action = popup.onConfirm;
                        closePopup();
                        if (action) {
                            await action();
                        }
                    } : closePopup}
                    onClose={closePopup}
                />
            </div>
        </div>
    );
}

export default GiftClaim;

