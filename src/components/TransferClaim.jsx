import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getTransfersPending, claimTransfer, getMyPackagePurchases } from '../store/slices/coachingSlice';
import usePopup from '../hooks/usePopup';
import PopupMessage from './PopupMessage';
import { ListSkeleton } from './skeletons/SkeletonLoader';
import Button from './ui/Button';
import { ArrowRightLeft } from 'lucide-react';

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
            <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold text-text-primary mb-4">Pending Transfers</h2>
                <ListSkeleton items={3} />
            </div>
        );
    }

    if (!transfersPending || transfersPending.length === 0) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-text-primary">Pending Transfers</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <ArrowRightLeft className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-text-secondary text-center">You have no pending session transfers at this time.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-card shadow-card p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-text-primary">Pending Transfers</h2>
            </div>
            <div className="flex-1">
            <div className="space-y-4">
                {transfersPending.map((transfer) => (
                    <div key={transfer.id} className="border border-border rounded-card p-4 hover:shadow-card-hover transition-shadow bg-surface">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-text-primary">
                                    {transfer.package_purchase_details?.purchase_name || transfer.package_purchase_details?.package_details?.title}
                                </h3>
                                <p className="text-sm text-text-secondary mt-1">
                                    {transfer.session_count} session{transfer.session_count !== 1 ? 's' : ''} from {transfer.from_user_details?.first_name} {transfer.from_user_details?.last_name}
                                </p>
                                {transfer.notes && (
                                    <p className="text-sm text-text-secondary mt-2 italic">"{transfer.notes}"</p>
                                )}
                            </div>
                            <div className="ml-4 text-right">
                                <div className="text-2xl font-bold text-primary">{transfer.session_count}</div>
                                <div className="text-xs text-text-secondary">sessions</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleClaimTransfer(transfer, 'accept')}
                                disabled={processingId === transfer.id}
                                variant="primary"
                                className="flex-1"
                            >
                                {processingId === transfer.id && processingAction === 'accept' ? 'Accepting...' : 'Accept Transfer'}
                            </Button>
                            <Button
                                onClick={() => handleClaimTransfer(transfer, 'reject')}
                                disabled={processingId === transfer.id}
                                variant="danger"
                                className="flex-1"
                            >
                                {processingId === transfer.id && processingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                            </Button>
                        </div>
                        {transfer.expires_at && (
                            <p className="text-xs text-text-secondary mt-2">
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
        </div>
    );
}

export default TransferClaim;

