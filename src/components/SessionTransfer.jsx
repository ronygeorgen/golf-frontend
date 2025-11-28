import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getMyPackagePurchases, createSessionTransfer, checkPhoneExists } from '../store/slices/coachingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import { FormSkeleton } from './skeletons/SkeletonLoader';

function SessionTransfer() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { purchases, phoneChecking, phoneCheck, purchasesLoading } = useAppSelector((state) => state.coaching);
    
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [toUserPhone, setToUserPhone] = useState('');
    const [sessionCount, setSessionCount] = useState(1);
    const [phoneValidated, setPhoneValidated] = useState(false);
    const [notes, setNotes] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    useEffect(() => {
        dispatch(getMyPackagePurchases());
    }, [dispatch]);

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
            dispatch(getMyPackagePurchases());
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

    const availablePurchases = purchases.filter(
        p => p.sessions_remaining > 0 && 
        p.package_status === 'active' && 
        p.gift_status !== 'pending' &&
        p.purchase_type !== 'organization' // Exclude organization packages from transfers
    );

    if (purchasesLoading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Transfer Sessions</h2>
                <FormSkeleton fields={3} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Transfer Sessions</h2>
            
            {availablePurchases.length === 0 ? (
                <p className="text-gray-600">You have no packages with transferable sessions.</p>
            ) : (
                <div className="space-y-4">
                    {availablePurchases.map((purchase) => (
                        <div key={purchase.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        {purchase.purchase_name || purchase.package_details?.title}
                                    </h3>
                                    {purchase.purchase_name && (
                                        <p className="text-xs text-gray-500">
                                            package: {purchase.package_details?.title || 'Unknown package'}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-600 mt-1">
                                        {purchase.sessions_remaining} of {purchase.sessions_total} sessions remaining
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedPurchase(purchase);
                                        setSessionCount(Math.min(1, purchase.sessions_remaining));
                                        setShowTransferModal(true);
                                    }}
                                    className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                                >
                                    Transfer Sessions
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && selectedPurchase && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                            onClick={() => setShowTransferModal(false)}
                        ></div>

                        <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Transfer Sessions</h3>
                                    <button
                                        onClick={() => setShowTransferModal(false)}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <h4 className="font-semibold text-gray-900">
                                        {selectedPurchase.purchase_name || selectedPurchase.package_details?.title}
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                        package: {selectedPurchase.package_details?.title || 'Unknown package'}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Available: {selectedPurchase.sessions_remaining} sessions
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Recipient Phone Number
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                value={toUserPhone}
                                                onChange={(e) => setToUserPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePhoneCheck}
                                                disabled={phoneChecking || !toUserPhone.trim()}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {phoneChecking ? 'Checking...' : 'Validate'}
                                            </button>
                                        </div>
                                        {phoneCheck && phoneCheck.exists && (
                                            <div className="mt-2 text-sm text-green-600 flex items-center">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                User found: {phoneCheck.name || phoneCheck.username}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Number of Sessions
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={selectedPurchase.sessions_remaining}
                                            value={sessionCount}
                                            onChange={(e) => setSessionCount(Math.max(1, Math.min(selectedPurchase.sessions_remaining, parseInt(e.target.value) || 1)))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Maximum: {selectedPurchase.sessions_remaining} sessions
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Notes (Optional)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add any notes..."
                                            rows={3}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleTransfer}
                                    disabled={!phoneValidated || transferLoading}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {transferLoading ? 'Transferring...' : 'Transfer Sessions'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancel
                                </button>
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

export default SessionTransfer;

