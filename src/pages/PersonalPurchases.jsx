import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getMyPackagePurchases } from '../store/slices/coachingSlice';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function PersonalPurchases() {
    const dispatch = useAppDispatch();
    const { purchases, purchasesPagination, purchasesLoading } = useAppSelector((state) => state.coaching);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(getMyPackagePurchases({ page: currentPage }));
    }, [dispatch, currentPage]);

    const totalPages = purchasesPagination.totalPages || 1;
    const totalCount = purchasesPagination.count || 0;
    const pageSize = purchasesPagination.pageSize || 10;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">My Package Purchases</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            View and manage all your package purchases
                        </p>
                    </div>
                    <button
                        onClick={() => dispatch(getMyPackagePurchases({ page: currentPage }))}
                        className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {purchasesLoading ? (
                    <div className="grid gap-4">
                        {Array.from({ length: 5 }).map((_, idx) => (
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
                    <div className="text-center text-text-secondary py-12">
                        <p className="text-lg mb-2">You haven&apos;t purchased any packages yet.</p>
                        <p className="text-sm">Start by purchasing a package from the Packages page.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 mb-6">
                            {purchases.map((purchase) => {
                                const isGift = purchase.purchase_type === 'gift';
                                const owner = purchase.original_owner_details;
                                return (
                                    <div key={purchase.id} className="rounded-card p-4 bg-background border border-border shadow-card">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-text-primary">{purchase.purchase_name}</h3>
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border">
                                <p className="text-sm text-text-secondary">
                                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} purchases
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1 || purchasesLoading}
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
                                        disabled={currentPage >= totalPages || purchasesLoading}
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
        </div>
    );
}

export default PersonalPurchases;

