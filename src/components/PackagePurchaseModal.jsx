import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createPackagePurchase, checkPhoneExists, clearPhoneCheck } from '../store/slices/coachingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

function PackagePurchaseModal({
    isOpen,
    onClose,
    packageId,
    packageData,
    onSuccess,
    defaultType = 'normal',
    lockType = false,
    titleText = 'Purchase Package',
}) {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { purchaseSubmitting, phoneChecking, phoneCheck } = useAppSelector((state) => state.coaching);
    
    const [purchaseType, setPurchaseType] = useState(defaultType);
    const [purchaseName, setPurchaseName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [phoneValidated, setPhoneValidated] = useState(false);
    const [notes, setNotes] = useState('');
    const [memberPhones, setMemberPhones] = useState([]); // [{phone: string, validated: boolean, name: string}]
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [validatingMemberPhone, setValidatingMemberPhone] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset all form state when modal opens
            setPurchaseType(defaultType);
            setPurchaseName('');
            setRecipientPhone('');
            setPhoneValidated(false);
            setNotes('');
            setMemberPhones([]);
            setNewMemberPhone('');
            // Clear phone check state
            dispatch(clearPhoneCheck());
            // Close any open popups
            closePopup();
        } else {
            // Reset form when modal closes
            setPurchaseType(defaultType);
            setPurchaseName('');
            setRecipientPhone('');
            setPhoneValidated(false);
            setNotes('');
            setMemberPhones([]);
            setNewMemberPhone('');
            // Clear phone check state
            dispatch(clearPhoneCheck());
            // Close any open popups
            closePopup();
        }
    }, [isOpen, defaultType, dispatch, closePopup]);

    useEffect(() => {
        // Reset phone validation when phone changes
        if (recipientPhone) {
            setPhoneValidated(false);
        }
    }, [recipientPhone]);

    const handlePhoneCheck = async () => {
        if (!recipientPhone.trim()) {
            openPopup({
                type: 'warning',
                title: 'Phone Required',
                message: 'Please enter a phone number.',
            });
            return;
        }

        const result = await dispatch(checkPhoneExists(recipientPhone.trim()));
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
                    message: 'No user found with this phone number. The recipient must be registered in the system.',
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

    const handleAddMember = async () => {
        if (!newMemberPhone.trim()) {
            openPopup({
                type: 'warning',
                title: 'Phone Required',
                message: 'Please enter a phone number.',
            });
            return;
        }

        // Check if already added
        if (memberPhones.some(m => m.phone === newMemberPhone.trim())) {
            openPopup({
                type: 'warning',
                title: 'Already Added',
                message: 'This phone number is already in the member list.',
            });
            return;
        }

        setValidatingMemberPhone(true);
        const result = await dispatch(checkPhoneExists(newMemberPhone.trim()));
        setValidatingMemberPhone(false);

        if (checkPhoneExists.fulfilled.match(result)) {
            if (result.payload.exists) {
                setMemberPhones([...memberPhones, {
                    phone: newMemberPhone.trim(),
                    validated: true,
                    name: result.payload.name || result.payload.username
                }]);
                setNewMemberPhone('');
            } else {
                openPopup({
                    type: 'error',
                    title: 'User Not Found',
                    message: 'No user found with this phone number. Members must be registered in the system.',
                });
            }
        } else {
            openPopup({
                type: 'error',
                title: 'Validation Error',
                message: result.payload?.error || 'Unable to validate phone number.',
            });
        }
    };

    const handleRemoveMember = (phone) => {
        setMemberPhones(memberPhones.filter(m => m.phone !== phone));
    };

    const handlePurchase = async () => {
        if (!purchaseName.trim()) {
            openPopup({
                type: 'warning',
                title: 'Purchase Name Required',
                message: 'Please enter a name for this purchase.',
            });
            return;
        }

        if (purchaseType === 'gift') {
            if (!recipientPhone.trim()) {
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
        }

        if (purchaseType === 'organization') {
            if (memberPhones.length === 0) {
                openPopup({
                    type: 'warning',
                    title: 'Members Required',
                    message: 'Please add at least one member to the organization package.',
                });
                return;
            }
        }

        const result = await dispatch(createPackagePurchase({
            packageId,
            notes: notes.trim() || undefined,
            purchaseType,
            recipientPhone: purchaseType === 'gift' ? recipientPhone.trim() : undefined,
            purchaseName: purchaseName.trim(),
            memberPhones: purchaseType === 'organization' ? memberPhones.map(m => m.phone) : undefined,
        }));

        if (createPackagePurchase.fulfilled.match(result)) {
            // Reset form state immediately
            setRecipientPhone('');
            setPhoneValidated(false);
            setNotes('');
            
            openPopup({
                type: 'success',
                title: purchaseType === 'gift' ? 'Gift Purchased!' : 'Package Purchased!',
                message: purchaseType === 'gift'
                    ? 'The gift has been sent. The recipient will receive a notification to accept it.'
                    : 'Package sessions added. You can now book your coaching session.',
            });
            if (onSuccess) {
                onSuccess(result.payload);
            }
            setTimeout(() => {
                closePopup();
                onClose();
            }, 1500);
        } else {
            const errorMsg = result.payload?.recipient_phone?.[0] || 
                           result.payload?.error || 
                           result.payload?.detail ||
                           'Unable to complete purchase.';
            openPopup({
                type: 'error',
                title: 'Purchase Failed',
                message: errorMsg,
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

                <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{titleText}</h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {packageData && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-gray-900">{packageData.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{packageData.description}</p>
                                <div className="mt-2 flex justify-between text-sm">
                                    <span className="text-gray-600">Sessions:</span>
                                    <span className="font-medium">{packageData.session_count}</span>
                                </div>
                                <div className="mt-1 flex justify-between text-sm">
                                    <span className="text-gray-600">Price:</span>
                                    <span className="font-medium">${packageData.price}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Purchase Name
                                </label>
                                <input
                                    type="text"
                                    value={purchaseName}
                                    onChange={(e) => setPurchaseName(e.target.value)}
                                    placeholder="e.g., Fall Coaching Plan"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            {!lockType && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Purchase Type
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="normal"
                                                checked={purchaseType === 'normal'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900">Buy for Myself</div>
                                                <div className="text-sm text-gray-500">Package will be immediately available for booking</div>
                                            </div>
                                        </label>
                                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="gift"
                                                checked={purchaseType === 'gift'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900">Buy as Gift</div>
                                                <div className="text-sm text-gray-500">Send this package to someone else</div>
                                            </div>
                                        </label>
                                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="organization"
                                                checked={purchaseType === 'organization'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900">Buy for Organization</div>
                                                <div className="text-sm text-gray-500">Share this package with multiple members</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {purchaseType === 'organization' && (
                                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Add Organization Members
                                        </label>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="tel"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                                placeholder="Enter member phone number"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddMember}
                                                disabled={validatingMemberPhone || !newMemberPhone.trim()}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {validatingMemberPhone ? 'Checking...' : 'Add'}
                                            </button>
                                        </div>
                                        {memberPhones.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-700">Members ({memberPhones.length}):</p>
                                                {memberPhones.map((member, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                                        <div className="flex items-center">
                                                            <svg className="h-4 w-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            <span className="text-sm text-gray-900">{member.phone}</span>
                                                            {member.name && (
                                                                <span className="text-sm text-gray-500 ml-2">({member.name})</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(member.phone)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-600 mt-2">
                                            All members (including you) can use sessions from this package. First-come-first-served basis.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {purchaseType === 'gift' && (
                                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Recipient Phone Number
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => setRecipientPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePhoneCheck}
                                                disabled={phoneChecking || !recipientPhone.trim()}
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
                                        {phoneCheck && !phoneCheck.exists && recipientPhone.trim() && (
                                            <div className="mt-2 text-sm text-red-600">
                                                User not found. Recipient must be registered in the system.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                            onClick={handlePurchase}
                            disabled={purchaseSubmitting || (purchaseType === 'gift' && !phoneValidated) || (purchaseType === 'organization' && memberPhones.length === 0)}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {purchaseSubmitting ? 'Processing...' : purchaseType === 'gift' ? 'Purchase Gift' : purchaseType === 'organization' ? 'Purchase for Organization' : 'Purchase Package'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
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

export default PackagePurchaseModal;

