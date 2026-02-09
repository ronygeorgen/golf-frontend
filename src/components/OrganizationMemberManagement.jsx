import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addOrganizationMember, removeOrganizationMember } from '../store/slices/coachingSlice';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import Badge from './ui/Badge';

function OrganizationMemberManagement({ isOpen, onClose, purchase }) {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { memberManagementLoading } = useAppSelector((state) => state.coaching);
    const { user } = useAppSelector((state) => state.auth);

    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [members, setMembers] = useState([]);

    useEffect(() => {
        if (isOpen && purchase) {
            setMembers(purchase.organization_members || []);
            setNewMemberPhone('');
        }
    }, [isOpen, purchase]);

    const handleAddMember = async () => {
        if (!newMemberPhone.trim()) {
            openPopup({
                type: 'warning',
                title: 'Phone Required',
                message: 'Please enter a phone number.',
            });
            return;
        }

        // Check if already a member
        if (members.some(m => m.phone === newMemberPhone.trim())) {
            openPopup({
                type: 'warning',
                title: 'Already Added',
                message: 'This phone number is already a member.',
            });
            return;
        }

        // Check if trying to add purchaser
        if (newMemberPhone.trim() === purchase?.client_details?.phone) {
            openPopup({
                type: 'warning',
                title: 'Cannot Add',
                message: 'The purchaser is already a member.',
            });
            return;
        }

        try {
            const result = await dispatch(addOrganizationMember({
                purchaseId: purchase.id,
                phone: newMemberPhone.trim()
            }));

            if (addOrganizationMember.fulfilled.match(result)) {
                setMembers(result.payload.purchase.organization_members || []);
                setNewMemberPhone('');
                openPopup({
                    type: 'success',
                    title: 'Member Added',
                    message: 'Member has been added successfully.',
                });
            } else {
                const errorMsg = result.payload?.error ||
                    result.payload?.detail ||
                    'Unable to add member.';
                openPopup({
                    type: 'error',
                    title: 'Error',
                    message: errorMsg,
                });
            }
        } catch (error) {
            openPopup({
                type: 'error',
                title: 'Error',
                message: 'An unexpected error occurred.',
            });
        }
    };

    const handleRemoveMember = async (phone) => {
        // Prevent removing purchaser
        if (phone === purchase?.client_details?.phone) {
            openPopup({
                type: 'warning',
                title: 'Cannot Remove',
                message: 'Cannot remove the purchaser from the group purchase.',
            });
            return;
        }

        openPopup({
            type: 'warning',
            title: 'Remove Member?',
            message: `Are you sure you want to remove ${phone} from this group purchase?`,
            showCancel: true,
            confirmText: 'Remove',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    const result = await dispatch(removeOrganizationMember({
                        purchaseId: purchase.id,
                        phone: phone
                    }));

                    if (removeOrganizationMember.fulfilled.match(result)) {
                        setMembers(result.payload.purchase.organization_members || []);
                        openPopup({
                            type: 'success',
                            title: 'Member Removed',
                            message: 'Member has been removed successfully.',
                        });
                        // No need to refresh - Redux state is already updated
                    } else {
                        const errorMsg = result.payload?.error ||
                            result.payload?.detail ||
                            'Unable to remove member.';
                        openPopup({
                            type: 'error',
                            title: 'Error',
                            message: errorMsg,
                        });
                    }
                } catch (error) {
                    openPopup({
                        type: 'error',
                        title: 'Error',
                        message: 'An unexpected error occurred.',
                    });
                }
            }
        });
    };

    if (!isOpen || !purchase) return null;

    const purchaserPhone = purchase.client_details?.phone || purchase.client;
    const isPurchaser = user?.phone === purchaserPhone;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

                <div className="relative z-10 inline-block align-bottom bg-surface rounded-card text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-surface px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-text-primary">Manage Group Members</h3>
                            <button
                                onClick={onClose}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Purchase Info */}
                        <div className="mb-6 p-4 bg-background rounded-lg border border-border">
                            <h4 className="font-semibold text-text-primary mb-2">{purchase.purchase_name}</h4>
                            <p className="text-sm text-text-secondary mb-2">
                                Package: {purchase.package_details?.title}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">Sessions Remaining:</span>
                                <span className="font-medium text-text-primary">
                                    {purchase.sessions_remaining} / {purchase.sessions_total}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-text-secondary">Members:</span>
                                <Badge variant="accent">{members.length}</Badge>
                            </div>
                        </div>

                        {/* Add Member Form */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                Add New Member
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={newMemberPhone}
                                    onChange={(e) => setNewMemberPhone(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                                    placeholder="Enter member phone number"
                                    className="flex-1"
                                    disabled={memberManagementLoading}
                                />
                                <Button
                                    type="button"
                                    onClick={handleAddMember}
                                    disabled={!newMemberPhone.trim() || memberManagementLoading}
                                    variant="accent"
                                >
                                    {memberManagementLoading ? 'Adding...' : 'Add'}
                                </Button>
                            </div>
                            <p className="text-xs text-text-secondary mt-2">
                                Members don't need to be registered yet. They will receive access when they sign up.
                            </p>
                        </div>

                        {/* Members List */}
                        <div>
                            <h4 className="text-sm font-medium text-text-primary mb-3">
                                Members ({members.length})
                            </h4>
                            {members.length === 0 ? (
                                <div className="text-center py-6 text-text-secondary">
                                    No members added yet.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {members.map((member, index) => {
                                        const isMemberPurchaser = member.phone === purchaserPhone;
                                        const isRegistered = member.user !== null;

                                        return (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="flex-shrink-0">
                                                        {isRegistered ? (
                                                            <svg className="h-5 w-5 text-status-confirmed-text" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="h-5 w-5 text-status-pending-text" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-text-primary">
                                                                {member.phone}
                                                            </span>
                                                            {isMemberPurchaser && (
                                                                <Badge variant="primary" className="text-xs">Purchaser</Badge>
                                                            )}
                                                            {!isRegistered && (
                                                                <Badge variant="secondary" className="text-xs">Pending Signup</Badge>
                                                            )}
                                                        </div>
                                                        {member.user_details && (
                                                            <p className="text-xs text-text-secondary mt-0.5">
                                                                {member.user_details.first_name} {member.user_details.last_name}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-text-secondary mt-0.5">
                                                            Added: {new Date(member.added_at).toLocaleDateString('en-US', { timeZone: 'America/Halifax' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!isMemberPurchaser && isPurchaser && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMember(member.phone)}
                                                        disabled={memberManagementLoading}
                                                        className="ml-2 text-danger hover:text-danger-light transition-colors disabled:opacity-50"
                                                        title="Remove member"
                                                    >
                                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            Close
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

export default OrganizationMemberManagement;

