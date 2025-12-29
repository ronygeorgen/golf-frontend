import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getMyPackagePurchases, getMySimulatorPurchases } from '../store/slices/coachingSlice';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function PersonalPurchases() {
    const dispatch = useAppDispatch();
    const { 
        purchases, 
        simulatorPurchases,
        purchasesPagination, 
        purchasesLoading,
        simulatorPurchasesLoading 
    } = useAppSelector((state) => state.coaching);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        dispatch(getMyPackagePurchases({ page: currentPage }));
        dispatch(getMySimulatorPurchases({ page: 1 })); // Fetch all simulator purchases
    }, [dispatch, currentPage]);

    // Combine all purchases (coaching + simulator) - sorted by latest purchase first
    const allPurchases = React.useMemo(() => {
        // Combine purchases from both types
        const combined = [
            ...purchases.map(p => ({ ...p, purchaseType: 'coaching' })),
            ...(simulatorPurchases || []).map(p => ({ ...p, purchaseType: 'simulator' }))
        ];
        
        // Sort by purchased_at date/time (most recent first)
        return combined.sort((a, b) => {
            const dateA = new Date(a.purchased_at);
            const dateB = new Date(b.purchased_at);
            return dateB - dateA; // Descending order (newest first)
        });
    }, [purchases, simulatorPurchases]);

    const totalCount = allPurchases.length;
    const isLoading = purchasesLoading || simulatorPurchasesLoading;

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
                        onClick={() => {
                            dispatch(getMyPackagePurchases({ page: currentPage }));
                            dispatch(getMySimulatorPurchases({ page: 1 }));
                        }}
                        className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {isLoading ? (
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
                ) : allPurchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-12">
                        <p className="text-lg mb-2">You haven&apos;t purchased any packages yet.</p>
                        <p className="text-sm">Start by purchasing a package from the Packages page.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 mb-6">
                            {allPurchases.map((purchase) => {
                                const isGift = purchase.purchase_type === 'gift';
                                const owner = purchase.original_owner_details;
                                const isSimulator = purchase.purchaseType === 'simulator';
                                
                                return (
                                    <div 
                                        key={isSimulator ? `sim-${purchase.id}` : purchase.id} 
                                        className={`rounded-card p-4 bg-background border border-border shadow-card ${isSimulator ? 'border-l-4 border-accent' : ''}`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-text-primary">{purchase.purchase_name}</h3>
                                                <p className="text-sm text-text-secondary">
                                                    Package: {purchase.package_details?.title || (isSimulator ? 'Simulator Package' : 'Package')}
                                                </p>
                                                {isSimulator ? (
                                                    <>
                                                        <p className="text-sm text-text-secondary">
                                                            Simulator Hours Remaining: <span className="font-semibold">{purchase.hours_remaining}</span> / {purchase.hours_total} hrs
                                                        </p>
                                                        {purchase.expiry_date && (() => {
                                                            const expiryDate = new Date(purchase.expiry_date);
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            expiryDate.setHours(0, 0, 0, 0);
                                                            const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                                                            const isExpired = daysRemaining < 0;
                                                            
                                                            return (
                                                                <p className={`text-sm mt-1 ${isExpired ? 'text-danger' : daysRemaining <= 7 ? 'text-accent' : 'text-text-secondary'}`}>
                                                                    {isExpired ? (
                                                                        <>
                                                                            <span className="text-danger font-semibold">Expired</span>
                                                                            <span className="ml-2 text-text-secondary">
                                                                                ({Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago)
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="font-semibold">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</span>
                                                                            <span className="ml-2 text-text-secondary">
                                                                                (Expires: {expiryDate.toLocaleDateString()})
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </p>
                                                            );
                                                        })()}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-text-secondary">
                                                            Sessions Remaining: <span className="font-semibold">{purchase.sessions_remaining}</span> / {purchase.sessions_total}
                                                        </p>
                                                        {purchase.simulator_hours_total > 0 && (
                                                            <p className="text-sm text-text-secondary">
                                                                Simulator Hours Remaining: <span className="font-semibold">{purchase.simulator_hours_remaining}</span> / {purchase.simulator_hours_total} hrs
                                                            </p>
                                                        )}
                                                    </>
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

                        {/* Show total count */}
                        <div className="flex items-center justify-center pt-4 border-t border-border">
                            <p className="text-sm text-text-secondary">
                                Total: {totalCount} purchase{totalCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PersonalPurchases;

