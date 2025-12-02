import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createPackagePurchase, createTempPurchase, clearPhoneCheck } from '../store/slices/coachingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';

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
    const { purchaseSubmitting } = useAppSelector((state) => state.coaching);
    const { user } = useAppSelector((state) => state.auth);
    
    const [purchaseType, setPurchaseType] = useState(defaultType);
    const [purchaseName, setPurchaseName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [memberPhones, setMemberPhones] = useState([]); // [{phone: string, validated: boolean, name: string}]
    const [newMemberPhone, setNewMemberPhone] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset all form state when modal opens
            setPurchaseType(defaultType);
            setPurchaseName('');
            setRecipientPhone('');
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
            setNotes('');
            setMemberPhones([]);
            setNewMemberPhone('');
            // Clear phone check state
            dispatch(clearPhoneCheck());
            // Close any open popups
            closePopup();
        }
    }, [isOpen, defaultType, dispatch, closePopup]);

    const handleAddMember = () => {
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

        // Add member directly without validation
        setMemberPhones([...memberPhones, {
            phone: newMemberPhone.trim(),
            validated: false,
            name: null
        }]);
        setNewMemberPhone('');
    };

    const handleRemoveMember = (phone) => {
        setMemberPhones(memberPhones.filter(m => m.phone !== phone));
    };

    const handlePurchase = async () => {
        // Check if package has redirect_url - if yes, purchaseName is optional and use temp purchase flow
        const redirectUrl = packageData?.redirect_url;
        const hasRedirectUrl = redirectUrl && redirectUrl.trim() !== '';
        
        // Only require purchaseName if no redirect URL (normal purchase flow)
        if (!hasRedirectUrl && !purchaseName.trim()) {
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
        }

        if (purchaseType === 'organization') {
            if (memberPhones.length === 0) {
                openPopup({
                    type: 'warning',
                    title: 'Members Required',
                    message: 'Please add at least one member to the group package.',
                });
                return;
            }
        }
        
        if (hasRedirectUrl) {
            // Use temp purchase flow
            // Get current logged-in user's phone number
            const buyerPhone = user?.phone;
            if (!buyerPhone) {
                openPopup({
                    type: 'error',
                    title: 'Phone Required',
                    message: 'Phone number not found. Please ensure you are logged in.',
                });
                return;
            }
            
            // Prepare recipients array
            let recipients = [];
            if (purchaseType === 'gift' && recipientPhone.trim()) {
                recipients = [recipientPhone.trim()];
            } else if (purchaseType === 'organization' && memberPhones.length > 0) {
                recipients = memberPhones.map(m => m.phone);
            }
            
            // Create temp purchase
            const tempResult = await dispatch(createTempPurchase({
                packageId,
                buyerPhone,
                purchaseType,
                recipients,
            }));
            
            if (createTempPurchase.fulfilled.match(tempResult)) {
                const tempId = tempResult.payload.temp_id;
                const redirectUrlFromResponse = tempResult.payload.redirect_url;
                
                // Build redirect URL with query params
                // phone parameter contains the current logged-in user's phone number
                const url = new URL(redirectUrlFromResponse);
                url.searchParams.set('phone', buyerPhone); // Current user's phone
                url.searchParams.set('package_id', packageId.toString());
                url.searchParams.set('purchase_type', purchaseType);
                url.searchParams.set('recipient_phone', tempId); // recipient_phone contains temp_id
                
                // Reset form state
                setRecipientPhone('');
                // setPhoneValidated(false);
                setNotes('');
                setMemberPhones([]);
                
                openPopup({
                    type: 'success',
                    title: 'Redirecting to Payment...',
                    message: 'You will be redirected to complete your purchase.',
                });
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = url.toString();
                }, 1000);
            } else {
                const errorMsg = tempResult.payload?.error || 
                               tempResult.payload?.detail ||
                               'Unable to create temporary purchase.';
                openPopup({
                    type: 'error',
                    title: 'Error',
                    message: errorMsg,
                });
            }
        } else {
            // No redirect URL - use normal purchase flow
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
                // setPhoneValidated(false);
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
                const errorMsg = result.payload?.error || 
                               result.payload?.detail ||
                               'Unable to complete purchase.';
                openPopup({
                    type: 'error',
                    title: 'Error',
                    message: errorMsg,
                });
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

                <div className="relative z-10 inline-block align-bottom bg-surface rounded-card text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-text-primary">{titleText}</h3>
                            <button
                                onClick={onClose}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {packageData && (
                            <div className="mb-4 p-3 bg-background rounded-lg">
                                <h4 className="font-semibold text-text-primary">{packageData.title}</h4>
                                <p className="text-sm text-text-secondary mt-1">{packageData.description}</p>
                                <div className="mt-2 flex justify-between text-sm">
                                    <span className="text-text-secondary">Sessions:</span>
                                    <span className="font-medium text-text-primary">{packageData.session_count}</span>
                                </div>
                                {packageData.simulator_hours > 0 && (
                                    <div className="mt-1 flex justify-between text-sm">
                                        <span className="text-text-secondary">Simulator Hours:</span>
                                        <span className="font-medium text-text-primary">{packageData.simulator_hours} hrs</span>
                                    </div>
                                )}
                                <div className="mt-1 flex justify-between text-sm">
                                    <span className="text-text-secondary">Price:</span>
                                    <span className="font-medium text-accent">${packageData.price}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Purchase Name
                                </label>
                                <input
                                    type="text"
                                    value={purchaseName}
                                    onChange={(e) => setPurchaseName(e.target.value)}
                                    placeholder="e.g., Fall Coaching Plan"
                                />
                            </div>
                            {!lockType && (
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Purchase Type
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="normal"
                                                checked={purchaseType === 'normal'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-text-primary">Buy for Myself</div>
                                                <div className="text-sm text-text-secondary">Package will be immediately available for booking</div>
                                            </div>
                                        </label>
                                        <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="gift"
                                                checked={purchaseType === 'gift'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-text-primary">Buy as Gift</div>
                                                <div className="text-sm text-text-secondary">Send this package to someone else</div>
                                            </div>
                                        </label>
                                        <label className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-background transition-colors">
                                            <input
                                                type="radio"
                                                name="purchaseType"
                                                value="organization"
                                                checked={purchaseType === 'organization'}
                                                onChange={(e) => setPurchaseType(e.target.value)}
                                                className="mr-3"
                                            />
                                            <div>
                                                <div className="font-medium text-text-primary">Buy for Group</div>
                                                <div className="text-sm text-text-secondary">Share this package with multiple members</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {purchaseType === 'organization' && (
                                <div className="space-y-3 p-4 bg-status-personal-bg rounded-lg border border-status-personal-text/20">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Add Organization Members
                                        </label>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="tel"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                                placeholder="Enter member phone number"
                                                className="flex-1"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleAddMember}
                                                disabled={!newMemberPhone.trim()}
                                                variant="accent"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                        {memberPhones.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-text-primary">Members ({memberPhones.length}):</p>
                                                {memberPhones.map((member, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                                                        <div className="flex items-center">
                                                            <svg className="h-4 w-4 mr-2 text-status-confirmed-text" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            <span className="text-sm text-text-primary">{member.phone}</span>
                                                            {member.name && (
                                                                <span className="text-sm text-text-secondary ml-2">({member.name})</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(member.phone)}
                                                            className="text-danger hover:text-danger-light transition-colors"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-text-secondary mt-2">
                                            All members (including you) can use sessions from this package. First-come-first-served basis. Members don't need to be registered yet - they will receive access when they sign up.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {purchaseType === 'gift' && (
                                <div className="space-y-3 p-4 bg-status-pending-bg rounded-lg border border-status-pending-text/20">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Recipient Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={recipientPhone}
                                            onChange={(e) => setRecipientPhone(e.target.value)}
                                            placeholder="Enter recipient phone number"
                                        />
                                        <p className="mt-2 text-xs text-text-secondary">
                                            Recipient doesn't need to be registered yet. They will receive the package when they sign up.
                                        </p>
                                    </div>
                                </div>
                            )}

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
                            onClick={handlePurchase}
                            disabled={purchaseSubmitting || (purchaseType === 'organization' && memberPhones.length === 0)}
                            variant="primary"
                            className="w-full sm:w-auto"
                        >
                            {purchaseSubmitting ? 'Processing...' : purchaseType === 'gift' ? 'Purchase Gift' : purchaseType === 'organization' ? 'Purchase for Group' : 'Purchase Package'}
                        </Button>
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
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

