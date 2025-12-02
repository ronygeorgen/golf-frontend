import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getMyOrganizationPurchases } from '../store/slices/coachingSlice';
import OrganizationMemberManagement from '../components/OrganizationMemberManagement';
import PackageUsageDetails from '../components/PackageUsageDetails';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function OrganizationPurchases() {
    const dispatch = useAppDispatch();
    const { organizationPurchases, organizationPurchasesPagination, organizationPurchasesLoading } = useAppSelector((state) => state.coaching);
    const [currentPage, setCurrentPage] = useState(1);
    const [memberManagementOpen, setMemberManagementOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
    const [selectedPurchaseForDetails, setSelectedPurchaseForDetails] = useState(null);

    useEffect(() => {
        dispatch(getMyOrganizationPurchases({ page: currentPage }));
    }, [dispatch, currentPage]);

    const handleManageMembers = (purchase) => {
        setSelectedPurchase(purchase);
        setMemberManagementOpen(true);
    };

    const handleCloseMemberManagement = () => {
        setMemberManagementOpen(false);
        setSelectedPurchase(null);
    };

    const handleViewDetails = (purchase) => {
        setSelectedPurchaseForDetails(purchase);
        setUsageDetailsOpen(true);
    };

    const handleCloseUsageDetails = () => {
        setUsageDetailsOpen(false);
        setSelectedPurchaseForDetails(null);
    };

    const totalPages = organizationPurchasesPagination.totalPages || 1;
    const totalCount = organizationPurchasesPagination.count || 0;
    const pageSize = organizationPurchasesPagination.pageSize || 10;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">My Group Purchases</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            Manage members for your group package purchases
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(getMyOrganizationPurchases({ page: currentPage }))}
                        className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {organizationPurchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: 5 }).map((_, idx) => (
                            <div key={idx} className="rounded-card p-4 bg-surface shadow-card space-y-3">
                                <Skeleton height="20px" width="50%" />
                                <Skeleton height="16px" width="70%" />
                                <Skeleton height="16px" width="60%" />
                                <Skeleton height="40px" width="150px" />
                            </div>
                        ))}
                    </div>
                ) : organizationPurchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        <p className="text-lg mb-2">You haven&apos;t created any group purchases yet.</p>
                        <p className="text-sm">Create a group purchase from the Packages page.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 mb-6">
                            {organizationPurchases.map((purchase) => {
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
                                                {purchase.simulator_hours_total > 0 && (
                                                    <p className="text-sm text-text-secondary">
                                                        Simulator Hours Remaining: <span className="font-semibold">{purchase.simulator_hours_remaining}</span> / {purchase.simulator_hours_total} hrs
                                                    </p>
                                                )}
                                                <p className="text-sm text-text-secondary mt-1">
                                                    Members: <span className="font-semibold">{memberCount}</span>
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end text-right space-y-2 gap-2">
                                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                                    <Button
                                                        onClick={() => handleManageMembers(purchase)}
                                                        variant="primary"
                                                        className="w-full md:w-auto"
                                                    >
                                                        Manage Members
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleViewDetails(purchase)}
                                                        variant="secondary"
                                                        className="w-full md:w-auto"
                                                    >
                                                        View Details
                                                    </Button>
                                                </div>
                                                <span className="text-xs text-text-secondary">
                                                    Created on {new Date(purchase.purchased_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
                                <p className="text-sm text-text-secondary">
                                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} purchases
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1 || organizationPurchasesLoading}
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
                                        disabled={currentPage >= totalPages || organizationPurchasesLoading}
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

            <OrganizationMemberManagement
                isOpen={memberManagementOpen}
                onClose={handleCloseMemberManagement}
                purchase={selectedPurchase}
            />
            <PackageUsageDetails
                purchase={selectedPurchaseForDetails}
                isOpen={usageDetailsOpen}
                onClose={handleCloseUsageDetails}
            />
        </div>
    );
}

export default OrganizationPurchases;

