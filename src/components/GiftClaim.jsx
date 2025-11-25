import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getGiftsPending, claimGift, getMyPackagePurchases } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';
import PopupMessage from './PopupMessage';
import { ListSkeleton } from './skeletons/SkeletonLoader';

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
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Gifts</h2>
                <ListSkeleton items={3} />
            </div>
        );
    }

    if (!giftsPending || giftsPending.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Gifts</h2>
                <p className="text-gray-600">You have no pending gifts at this time.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Gifts</h2>
            <div className="space-y-4">
                {giftsPending.map((gift) => (
                    <div key={gift.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{gift.purchase_name || gift.package_details?.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{gift.package_details?.title}</p>
                                <p className="text-sm text-gray-500">{gift.package_details?.description}</p>
                                {gift.original_owner_details && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        From: {gift.original_owner_details.first_name} {gift.original_owner_details.last_name}
                                    </p>
                                )}
                            </div>
                            <div className="ml-4 text-right">
                                <div className="text-2xl font-bold text-blue-600">{gift.sessions_total}</div>
                                <div className="text-xs text-gray-500">sessions</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleClaimGift(gift, 'accept')}
                                disabled={processingId === gift.id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-green-300 disabled:cursor-not-allowed"
                            >
                                {processingId === gift.id && processingAction === 'accept' ? 'Accepting...' : 'Accept Gift'}
                            </button>
                            <button
                                onClick={() => handleClaimGift(gift, 'reject')}
                                disabled={processingId === gift.id}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-red-300 disabled:cursor-not-allowed"
                            >
                                {processingId === gift.id && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                        {gift.gift_expires_at && (
                            <p className="text-xs text-gray-500 mt-2">
                                Expires: {new Date(gift.gift_expires_at).toLocaleDateString()}
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
    );
}

export default GiftClaim;

