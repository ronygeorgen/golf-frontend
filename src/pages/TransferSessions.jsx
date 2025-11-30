import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getTransferablePurchases, createSessionTransfer, checkPhoneExists, getMyPackagePurchases } from '../store/slices/coachingSlice';
import PopupMessage from '../components/PopupMessage';
import usePopup from '../hooks/usePopup';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';

function TransferSessions() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { transferablePurchases, transferablePurchasesPagination, transferablePurchasesLoading, phoneChecking, phoneCheck } = useAppSelector((state) => state.coaching);
    
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [toUserPhone, setToUserPhone] = useState('');
    const [sessionCount, setSessionCount] = useState(1);
    const [phoneValidated, setPhoneValidated] = useState(false);
    const [notes, setNotes] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(getTransferablePurchases({ page: currentPage }));
    }, [dispatch, currentPage]);

    useEffect(() => {
        if (!showTransferModal) {
            setSelectedPurchase(null);
            setToUserPhone('');
            setSessionCount(1);
            setPhoneValidated(false);
            setNotes('');
            setTransferLoading(false);
        }
    }, [showTransferModal]);

    useEffect(() => {
        if (toUserPhone) {
            setPhoneValidated(false);
        }
    }, [toUserPhone]);

    const handlePhoneCheck = async () => {
        if (!toUserPhone.trim()) {
            openPopup({
                type: 'warning',
                title: 'Phone Required',
                message: 'Please enter a phone number.',
            });
            return;
        }

        const result = await dispatch(checkPhoneExists(toUserPhone.trim()));
        if (checkPhoneExists.fulfilled.match(result)) {
            if (result.payload.exists) {
                setPhoneValidated(true);
                openPopup({
                    type: 'success',
                    title: 'User Found',
                    message: `User found: ${result.payload.name || result.payload.username}`,
                });
            } else {
                setPhoneValidated(false);
                openPopup({
                    type: 'error',
                    title: 'User Not Found',
                    message: 'No user found with this phone number.',
                });
            }
        } else {
            setPhoneValidated(false);
            openPopup({
                type: 'error',
                title: 'Validation Error',
                message: result.payload?.error || 'Unable to validate phone number.',
            });
        }
    };

    const handleTransfer = async () => {
        if (!selectedPurchase) return;
        
        if (!toUserPhone.trim()) {
            openPopup({
                type: 'warning',
                title: 'Recipient Required',
                message: 'Please enter recipient phone number.',
            });
            return;
        }
        
        if (!phoneValidated) {
            openPopup({
                type: 'warning',
                title: 'Validate Phone',
                message: 'Please validate the recipient phone number first.',
            });
            return;
        }

        if (sessionCount < 1 || sessionCount > selectedPurchase.sessions_remaining) {
            openPopup({
                type: 'warning',
                title: 'Invalid Count',
                message: `Please enter a valid session count (1-${selectedPurchase.sessions_remaining}).`,
            });
            return;
        }

        setTransferLoading(true);
        const result = await dispatch(createSessionTransfer({
            packagePurchaseId: selectedPurchase.id,
            toUserPhone: toUserPhone.trim(),
            sessionCount,
            notes: notes.trim() || undefined,
        }));
        setTransferLoading(false);

        if (createSessionTransfer.fulfilled.match(result)) {
            openPopup({
                type: 'success',
                title: 'Transfer Initiated!',
                message: 'The transfer request has been sent. The recipient will receive a notification.',
            });
            dispatch(getTransferablePurchases({ page: currentPage }));
            setShowTransferModal(false);
        } else {
            const errorMsg = result.payload?.to_user_phone?.[0] || 
                           result.payload?.session_count?.[0] ||
                           result.payload?.error || 
                           'Unable to create transfer.';
            openPopup({
                type: 'error',
                title: 'Transfer Failed',
                message: errorMsg,
            });
        }
    };

    const totalPages = transferablePurchasesPagination.totalPages || 1;
    const totalCount = transferablePurchasesPagination.count || 0;
    const pageSize = transferablePurchasesPagination.pageSize || 10;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Transfer Sessions</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Transfer sessions from your packages to other users
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(getTransferablePurchases({ page: currentPage }))}
                        className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {transferablePurchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="rounded-card p-4 bg-surface shadow-card space-y-3">
                                <Skeleton height="20px" width="50%" />
                                <Skeleton height="16px" width="70%" />
                                <Skeleton height="40px" width="150px" />
                            </div>
                        ))}
                    </div>
                ) : transferablePurchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        <p className="text-lg mb-2">You have no packages with transferable sessions.</p>
                        <p className="text-sm">Purchase a package to start transferring sessions.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4 mb-6">
                            {transferablePurchases.map((purchase) => (
                                <div key={purchase.id} className="border border-border rounded-card p-4 bg-background">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-text-primary">
                                                {purchase.purchase_name || purchase.package_details?.title}
                                            </h3>
                                            {purchase.purchase_name && (
                                                <p className="text-xs text-text-secondary">
                                                    Package: {purchase.package_details?.title || 'Unknown package'}
                                                </p>
                                            )}
                                            <p className="text-sm text-text-secondary mt-1">
                                                {purchase.sessions_remaining} of {purchase.sessions_total} sessions remaining
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setSelectedPurchase(purchase);
                                                setSessionCount(Math.min(1, purchase.sessions_remaining));
                                                setShowTransferModal(true);
                                            }}
                                            variant="primary"
                                            className="ml-4"
                                        >
                                            Transfer Sessions
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
                                <p className="text-sm text-text-secondary">
                                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} packages
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1 || transferablePurchasesLoading}
                                        variant="secondary"
                                        className="px-3 py-1"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm font-medium text-text-primary">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage >= totalPages || transferablePurchasesLoading}
                                        variant="primary"
                                        className="px-3 py-1"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Transfer Modal */}
            {showTransferModal && selectedPurchase && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                            onClick={() => setShowTransferModal(false)}
                        ></div>

                        <div className="relative z-10 inline-block align-bottom bg-surface rounded-card text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-text-primary">Transfer Sessions</h3>
                                    <button
                                        onClick={() => setShowTransferModal(false)}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mb-4 p-3 bg-background rounded-lg">
                                    <h4 className="font-semibold text-text-primary">
                                        {selectedPurchase.purchase_name || selectedPurchase.package_details?.title}
                                    </h4>
                                    <p className="text-xs text-text-secondary">
                                        Package: {selectedPurchase.package_details?.title || 'Unknown package'}
                                    </p>
                                    <p className="text-sm text-text-secondary mt-1">
                                        Available: {selectedPurchase.sessions_remaining} sessions
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Recipient Phone Number
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                value={toUserPhone}
                                                onChange={(e) => setToUserPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handlePhoneCheck}
                                                disabled={phoneChecking || !toUserPhone.trim()}
                                                variant="primary"
                                            >
                                                {phoneChecking ? 'Checking...' : 'Validate'}
                                            </Button>
                                        </div>
                                        {phoneCheck && phoneCheck.exists && (
                                            <div className="mt-2 text-sm text-status-confirmed-text flex items-center">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                User found: {phoneCheck.name || phoneCheck.username}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Number of Sessions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedPurchase.sessions_remaining}
                                            value={sessionCount}
                                            onChange={(e) => setSessionCount(Math.max(1, Math.min(selectedPurchase.sessions_remaining, parseInt(e.target.value) || 1)))}
                                        />
                                        <p className="text-xs text-text-secondary mt-1">
                                            Maximum: {selectedPurchase.sessions_remaining} sessions
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Notes (Optional)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                                <Button
                                    type="button"
                                    onClick={handleTransfer}
                                    disabled={!phoneValidated || transferLoading}
                                    variant="primary"
                                    className="w-full sm:w-auto"
                                >
                                    {transferLoading ? 'Transferring...' : 'Transfer Sessions'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default TransferSessions;

