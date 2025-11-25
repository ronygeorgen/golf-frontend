import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getTransfersPending, claimTransfer, getMyPackagePurchases } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';
import PopupMessage from './PopupMessage';
import { ListSkeleton } from './skeletons/SkeletonLoader';

function TransferClaim() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { transfersPending, transfersLoading } = useAppSelector((state) => state.coaching);
    const [processingId, setProcessingId] = useState(null);
    const [processingAction, setProcessingAction] = useState(null);

    useEffect(() => {
        dispatch(getTransfersPending());
    }, [dispatch]);

    const handleClaimTransfer = async (transfer, action) => {
        setProcessingId(transfer.id);
        setProcessingAction(action);
        const result = await dispatch(claimTransfer({ transferId: transfer.id, action }));
        
        if (claimTransfer.fulfilled.match(result)) {
            if (action === 'accept') {
                openPopup({
                    type: 'success',
                    title: 'Transfer Accepted!',
                    message: 'The sessions have been added to your account. You can now book sessions.',
                });
                dispatch(getMyPackagePurchases());
            } else {
                openPopup({
                    type: 'info',
                    title: 'Transfer Rejected',
                    message: 'You have rejected this transfer.',
                });
            }
            dispatch(getTransfersPending());
        } else {
            openPopup({
                type: 'error',
                title: 'Error',
                message: result.payload?.error || 'Unable to process transfer claim.',
            });
        }
        setProcessingId(null);
        setProcessingAction(null);
    };

    if (transfersLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Transfers</h2>
                <ListSkeleton items={3} />
            </div>
        );
    }

    if (!transfersPending || transfersPending.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Transfers</h2>
                <p className="text-gray-600">You have no pending session transfers at this time.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Transfers</h2>
            <div className="space-y-4">
                {transfersPending.map((transfer) => (
                    <div key={transfer.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                    {transfer.package_purchase_details?.purchase_name || transfer.package_purchase_details?.package_details?.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {transfer.session_count} session{transfer.session_count !== 1 ? 's' : ''} from {transfer.from_user_details?.first_name} {transfer.from_user_details?.last_name}
                                </p>
                                {transfer.notes && (
                                    <p className="text-sm text-gray-500 mt-2 italic">"{transfer.notes}"</p>
                                )}
                            </div>
                            <div className="ml-4 text-right">
                                <div className="text-2xl font-bold text-blue-600">{transfer.session_count}</div>
                                <div className="text-xs text-gray-500">sessions</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleClaimTransfer(transfer, 'accept')}
                                disabled={processingId === transfer.id}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-green-300 disabled:cursor-not-allowed"
                            >
                                {processingId === transfer.id && processingAction === 'accept' ? 'Accepting...' : 'Accept Transfer'}
                            </button>
                            <button
                                onClick={() => handleClaimTransfer(transfer, 'reject')}
                                disabled={processingId === transfer.id}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-red-300 disabled:cursor-not-allowed"
                            >
                                {processingId === transfer.id && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                            </button>
                        </div>
                        {transfer.expires_at && (
                            <p className="text-xs text-gray-500 mt-2">
                                Expires: {new Date(transfer.expires_at).toLocaleDateString()}
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

export default TransferClaim;

