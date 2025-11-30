import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getActiveCoachingPackages,
    getMyPackagePurchases,
    getGiftsPending,
    getTransfersPending,
    getMyOrganizationPurchases,
} from '../store/slices/coachingSlice';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import OrganizationMemberManagement from '../components/OrganizationMemberManagement';
import SessionTransfer from '../components/SessionTransfer';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function Packages() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { 
        packages, 
        purchases, 
        purchasesPagination,
        organizationPurchases,
        organizationPurchasesPagination,
        loading, 
        purchasesLoading, 
        organizationPurchasesLoading 
    } = useAppSelector((state) => state.coaching);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('normal');
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [memberManagementOpen, setMemberManagementOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const previewLimit = 5;

    useEffect(() => {
        dispatch(getActiveCoachingPackages());
        dispatch(getMyPackagePurchases({ page: 1 }));
        dispatch(getMyOrganizationPurchases({ page: 1 }));
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
    }, [dispatch]);


    const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

    const handleOpenModal = (pkgId, type) => {
        setSelectedPackageId(pkgId);
        setModalType(type);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPackageId(null);
    };

    const handlePurchaseSuccess = () => {
        dispatch(getMyPackagePurchases());
        dispatch(getMyOrganizationPurchases());
        dispatch(getGiftsPending());
    };

    const handleManageMembers = (purchase) => {
        setSelectedPurchase(purchase);
        setMemberManagementOpen(true);
    };

    const handleCloseMemberManagement = () => {
        setMemberManagementOpen(false);
        setSelectedPurchase(null);
        // No need to refresh - Redux state is already updated when members are added/removed
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8">
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Packages & Gifts</h1>
                        <p className="text-text-secondary mt-1">
                            Buy packages for yourself, gift entire packages, or share sessions from your existing purchases.
                        </p>
                    </div>
                </div>

                {loading && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="rounded-card p-5 shadow-card bg-surface space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <Skeleton height="24px" width="70%" className="mb-2" />
                                        <Skeleton height="16px" width="90%" />
                                    </div>
                                    <div className="text-right space-y-2">
                                        <Skeleton height="28px" width="80px" />
                                        <Skeleton height="16px" width="60px" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Skeleton height="16px" width="60%" />
                                    <Skeleton height="16px" width="80%" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Skeleton height="44px" />
                                    <Skeleton height="44px" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && packages.length === 0 && (
                    <div className="text-center py-6 text-text-secondary">
                        No active packages available at the moment.
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const ownedSessions = purchases
                            .filter((purchase) => purchase.package === pkg.id)
                            .reduce((total, purchase) => total + (purchase.sessions_remaining || 0), 0);

                        return (
                            <div 
                                key={pkg.id} 
                                className="rounded-card shadow-card bg-surface border border-border hover:shadow-card-hover transition-all duration-200 flex flex-col"
                            >
                                {/* Header Section with Price */}
                                <div className="bg-gradient-to-br from-primary/5 to-primary-light/5 p-4 border-b border-border">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 pr-3 min-w-0">
                                            <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-1">{pkg.title}</h3>
                                            {pkg.description && (
                                                <p className="text-xs text-text-secondary line-clamp-2">{pkg.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-2xl font-bold text-accent leading-none">${pkg.price}</p>
                                            <p className="text-xs text-text-secondary mt-0.5">One-time</p>
                                        </div>
                                    </div>
                                    
                                    {/* Package Stats */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-status-confirmed-text"></div>
                                            <span className="text-xs font-medium text-text-primary">{pkg.session_count} Sessions</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            <span className="text-xs font-medium text-text-primary">{pkg.session_duration_minutes} min</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Your Sessions Info */}
                                    {ownedSessions > 0 && (
                                        <div className="bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-lg p-2.5 mb-3">
                                            <p className="text-xs text-status-confirmed-text font-semibold">
                                                You have <span className="text-base font-bold">{ownedSessions}</span> session{ownedSessions !== 1 ? 's' : ''} remaining
                                            </p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-2 mt-auto">
                                        <Button
                                            onClick={() => handleOpenModal(pkg.id, 'normal')}
                                            variant="primary"
                                            className="w-full py-2 text-sm"
                                        >
                                            Buy for Myself
                                        </Button>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                onClick={() => handleOpenModal(pkg.id, 'gift')}
                                                variant="accent"
                                                className="w-full py-2 text-sm"
                                            >
                                                Gift Package
                                            </Button>
                                            <Button
                                                onClick={() => handleOpenModal(pkg.id, 'organization')}
                                                variant="secondary"
                                                className="w-full py-2 text-sm"
                                            >
                                                For Organization
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <SessionTransfer />
                </div>
                <div className="space-y-6 flex flex-col">
                    <GiftClaim />
                    <TransferClaim />
                </div>
            </div>

            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-primary">My Package Purchases</h2>
                    <div className="flex items-center gap-3">
                        {purchases.length > previewLimit && (
                            <button
                                onClick={() => navigate('/purchases/personal')}
                                className="group text-sm text-primary hover:text-primary-light transition-colors font-medium cursor-pointer"
                            >
                                <span className="border-b border-current group-hover:border-primary-light transition-colors">
                                    View All ({purchasesPagination.count || purchases.length})
                                </span>
                            </button>
                        )}
                        <button
                            onClick={() => dispatch(getMyPackagePurchases({ page: 1 }))}
                            className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                {purchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: Math.min(3, previewLimit) }).map((_, idx) => (
                            <div key={idx} className="rounded-card p-4 bg-surface shadow-card space-y-3">
                                <Skeleton height="20px" width="50%" />
                                <Skeleton height="16px" width="70%" />
                                <Skeleton height="16px" width="60%" />
                                <div className="flex items-center justify-between">
                                    <Skeleton height="24px" width="100px" rounded="rounded-full" />
                                    <Skeleton height="14px" width="120px" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : purchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-6">You haven&apos;t purchased any packages yet.</div>
                ) : (
                    <div className="grid gap-4">
                        {purchases
                            .slice(0, previewLimit)
                            .map((purchase) => {
                            const isGift = purchase.purchase_type === 'gift';
                            const owner = purchase.original_owner_details;
                            return (
                                <div key={purchase.id} className="rounded-card p-4 bg-surface shadow-card">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-text-primary">{purchase.purchase_name}</h3>
                                            <p className="text-sm text-text-secondary">
                                                Package: {purchase.package_details?.title}
                                            </p>
                                            <p className="text-sm text-text-secondary">
                                                Sessions Remaining: <span className="font-semibold">{purchase.sessions_remaining}</span> / {purchase.sessions_total}
                                            </p>
                                            {isGift && owner && (
                                                <p className="text-sm text-accent mt-1">
                                                    Gifted by {owner.first_name} {owner.last_name}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end text-right space-y-1">
                                            <Badge status={isGift ? 'pending' : 'personal'}>
                                                {isGift ? (purchase.gift_status === 'accepted' ? 'Gift (Accepted)' : 'Gift') : 'Personal Purchase'}
                                            </Badge>
                                            <span className="text-xs text-text-secondary">
                                                Purchased on {new Date(purchase.purchased_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Organization Purchases Section */}
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">My Group Purchases</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Manage members for your group package purchases
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {organizationPurchases.length > previewLimit && (
                            <button
                                onClick={() => navigate('/purchases/organizations')}
                                className="group text-sm text-primary hover:text-primary-light transition-colors font-medium cursor-pointer"
                            >
                                <span className="border-b border-current group-hover:border-primary-light transition-colors">
                                    View All ({organizationPurchasesPagination.count || organizationPurchases.length})
                                </span>
                            </button>
                        )}
                        <button
                            onClick={() => dispatch(getMyOrganizationPurchases({ page: 1 }))}
                            className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                {organizationPurchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: Math.min(2, previewLimit) }).map((_, idx) => (
                            <div key={idx} className="rounded-card p-4 bg-surface shadow-card space-y-3">
                                <Skeleton height="20px" width="50%" />
                                <Skeleton height="16px" width="70%" />
                                <Skeleton height="16px" width="60%" />
                                <Skeleton height="40px" width="150px" />
                            </div>
                        ))}
                    </div>
                ) : organizationPurchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-6">
                        You haven&apos;t created any group purchases yet.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {organizationPurchases.slice(0, previewLimit).map((purchase) => {
                            const memberCount = purchase.organization_members?.length || 0;
                            return (
                                <div key={purchase.id} className="rounded-card p-4 bg-background border border-border shadow-card">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-semibold text-text-primary">{purchase.purchase_name}</h3>
                                                <Badge variant="accent">Group</Badge>
                                            </div>
                                            <p className="text-sm text-text-secondary">
                                                Package: {purchase.package_details?.title}
                                            </p>
                                            <p className="text-sm text-text-secondary">
                                                Sessions Remaining: <span className="font-semibold">{purchase.sessions_remaining}</span> / {purchase.sessions_total}
                                            </p>
                                            <p className="text-sm text-text-secondary mt-1">
                                                Members: <span className="font-semibold">{memberCount}</span>
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end text-right space-y-2">
                                            <Button
                                                onClick={() => handleManageMembers(purchase)}
                                                variant="primary"
                                                className="w-full md:w-auto"
                                            >
                                                Manage Members
                                            </Button>
                                            <span className="text-xs text-text-secondary">
                                                Created on {new Date(purchase.purchased_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PackagePurchaseModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                packageId={selectedPackageId}
                packageData={selectedPackage}
                onSuccess={handlePurchaseSuccess}
                defaultType={modalType}
                lockType={true}
                titleText={modalType === 'gift' ? 'Gift Entire Package' : modalType === 'organization' ? 'Purchase for Group' : 'Buy Package for Yourself'}
            />

            <OrganizationMemberManagement
                isOpen={memberManagementOpen}
                onClose={handleCloseMemberManagement}
                purchase={selectedPurchase}
            />
        </div>
    );
}

export default Packages;

