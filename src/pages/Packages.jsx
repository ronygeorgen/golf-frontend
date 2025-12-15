import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getActiveCoachingPackages,
    getActiveSimulatorPackages,
    getMyPackagePurchases,
    getMySimulatorPurchases,
    getGiftsPending,
    getTransfersPending,
    getMyOrganizationPurchases,
} from '../store/slices/coachingSlice';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import OrganizationMemberManagement from '../components/OrganizationMemberManagement';
import PackageUsageDetails from '../components/PackageUsageDetails';
import SessionTransfer from '../components/SessionTransfer';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

function Packages() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { 
        packages, 
        simulatorPackages,
        purchases, 
        simulatorPurchases,
        purchasesPagination,
        organizationPurchases,
        organizationPurchasesPagination,
        loading, 
        simulatorPackagesLoading,
        purchasesLoading,
        simulatorPurchasesLoading,
        organizationPurchasesLoading 
    } = useAppSelector((state) => state.coaching);

    // Get view mode from URL params, default to 'view-packages'
    const viewMode = searchParams.get('view') === 'purchases' ? 'manage-purchases' : 'view-packages';
    const [packageFilter, setPackageFilter] = useState('all'); // 'all', 'coaching', 'simulator', 'combo'
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('normal');
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [selectedPackageCategory, setSelectedPackageCategory] = useState(null); // Track which category was clicked
    const [memberManagementOpen, setMemberManagementOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
    const [selectedPurchaseForDetails, setSelectedPurchaseForDetails] = useState(null);
    const previewLimit = 5;

    // Initial load - fetch all data on mount
    useEffect(() => {
        console.log('🔄 Initial mount - fetching all data');
        // Always fetch packages
        dispatch(getActiveCoachingPackages());
        dispatch(getActiveSimulatorPackages());
        
        // Always fetch purchases (both types) on mount - CRITICAL: both must be called
        console.log('📞 Initial mount - Calling getMyPackagePurchases');
        dispatch(getMyPackagePurchases({ page: 1 }));
        console.log('📞 Initial mount - Calling getMySimulatorPurchases');
        dispatch(getMySimulatorPurchases({ page: 1 })); // Ensure this is always called
        dispatch(getMyOrganizationPurchases({ page: 1 }));
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
    }, [dispatch]);
    
    // Refetch data when view mode changes - watch searchParams directly to ensure it triggers on URL changes
    useEffect(() => {
        const currentView = searchParams.get('view') === 'purchases' ? 'manage-purchases' : 'view-packages';
        console.log('🔄 View mode changed:', currentView, 'URL view param:', searchParams.get('view'));
        
        if (currentView === 'manage-purchases') {
            // When switching to purchases view, refresh purchase-related data
            // IMPORTANT: Always call both purchase APIs to get latest data
            console.log('📞 ViewMode effect (manage-purchases) - Calling getMyPackagePurchases');
            dispatch(getMyPackagePurchases({ page: 1 }));
            console.log('📞 ViewMode effect (manage-purchases) - Calling getMySimulatorPurchases');
            dispatch(getMySimulatorPurchases({ page: 1 })); // Ensure simulator purchases are fetched
            dispatch(getMyOrganizationPurchases({ page: 1 }));
            dispatch(getGiftsPending());
            dispatch(getTransfersPending());
        } else if (currentView === 'view-packages') {
            // When switching to packages view, refresh package listings
            console.log('📞 ViewMode effect (view-packages) - Calling getActiveCoachingPackages and getActiveSimulatorPackages');
            dispatch(getActiveCoachingPackages());
            dispatch(getActiveSimulatorPackages());
        }
    }, [searchParams, dispatch]); // Watch searchParams directly instead of viewMode
    
    // Debug: Log simulator purchases when they change
    useEffect(() => {
        if (simulatorPurchases && simulatorPurchases.length > 0) {
            console.log('📦 Simulator Purchases in Redux:', {
                count: simulatorPurchases.length,
                purchases: simulatorPurchases.map(p => ({
                    id: p.id,
                    purchase_name: p.purchase_name,
                    package_title: p.package_details?.title,
                    package_status: p.package_status,
                    hours_remaining: p.hours_remaining,
                    hours_total: p.hours_total,
                    purchase_type: p.purchase_type,
                    gift_status: p.gift_status,
                    purchased_at: p.purchased_at
                }))
            });
        }
    }, [simulatorPurchases]);

    // Additional safeguard: Refresh purchases when component becomes visible and we're on purchases view
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && viewMode === 'manage-purchases') {
                console.log('🔄 Page became visible - Refreshing purchase data');
                dispatch(getMyPackagePurchases({ page: 1 }));
                dispatch(getMySimulatorPurchases({ page: 1 }));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [viewMode, dispatch]);


    // Find package - use selectedPackageCategory to determine which array to check first
    // This prevents conflicts when the same ID exists in both arrays
    const simulatorPackage = (simulatorPackages || []).find((pkg) => pkg.id === selectedPackageId);
    const coachingPackage = packages.find((pkg) => pkg.id === selectedPackageId);
    
    // Determine which package to use based on the category that was clicked
    let selectedPackage;
    if (selectedPackageCategory === 'simulator') {
        // User clicked a simulator package, use that even if coaching package exists with same ID
        selectedPackage = simulatorPackage || coachingPackage;
    } else if (selectedPackageCategory === 'coaching' || selectedPackageCategory === 'combo') {
        // User clicked a coaching/combo package, use that even if simulator package exists with same ID
        selectedPackage = coachingPackage || simulatorPackage;
    } else {
        // Fallback: prioritize simulatorPackages if ID exists in both (original behavior)
        selectedPackage = simulatorPackage || coachingPackage;
    }
    
    // Determine package type: simulator packages are ONLY in simulatorPackages array
    // Coaching packages (including combo) are in packages array
    // Use the selected package's category if available, otherwise check which array it came from
    const isSimulatorPackage = selectedPackage?.category === 'simulator' || 
                                (selectedPackage === simulatorPackage && !coachingPackage);
    
    // Debug: Log selected package details when it changes
    useEffect(() => {
        if (selectedPackage && selectedPackageId) {
            console.log('📦 Selected Package Debug:', {
                packageId: selectedPackageId,
                title: selectedPackage.title,
                category: selectedPackage.category,
                selectedPackageCategory, // The category that was clicked
                isSimulatorPackage,
                simulator_hours: selectedPackage.simulator_hours,
                'from simulatorPackages': !!simulatorPackage,
                'from packages': !!coachingPackage,
                'simulatorPackage exists': !!simulatorPackage,
                'coachingPackage exists': !!coachingPackage
            });
        }
    }, [selectedPackageId, selectedPackage, selectedPackageCategory, isSimulatorPackage, simulatorPackage, coachingPackage]);

    const handleOpenModal = (pkgId, type, packageCategory = null) => {
        setSelectedPackageId(pkgId);
        setModalType(type);
        setSelectedPackageCategory(packageCategory); // Store the category of the clicked package
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedPackageId(null);
        setSelectedPackageCategory(null);
    };

    const handlePurchaseSuccess = () => {
        // Refresh all purchase-related data after a successful purchase
        console.log('🔄 Purchase success - Refreshing all purchase data');
        dispatch(getMyPackagePurchases({ page: 1 }));
        dispatch(getMySimulatorPurchases({ page: 1 }));
        dispatch(getMyOrganizationPurchases({ page: 1 }));
        dispatch(getGiftsPending());
        dispatch(getTransfersPending());
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

    const handleViewDetails = (purchase) => {
        setSelectedPurchaseForDetails(purchase);
        setUsageDetailsOpen(true);
    };

    const handleCloseUsageDetails = () => {
        setUsageDetailsOpen(false);
        setSelectedPurchaseForDetails(null);
    };

    // Filter packages based on selected filter
    const getFilteredPackages = () => {
        if (packageFilter === 'all') {
            return packages;
        } else if (packageFilter === 'coaching') {
            // Coaching packages (no simulator hours)
            return packages.filter(pkg => !pkg.simulator_hours || parseFloat(pkg.simulator_hours) === 0);
        } else if (packageFilter === 'combo') {
            // Combo packages (have simulator hours)
            return packages.filter(pkg => pkg.simulator_hours && parseFloat(pkg.simulator_hours) > 0);
        }
        return [];
    };

    const getFilteredSimulatorPackages = () => {
        if (packageFilter === 'all' || packageFilter === 'simulator') {
            return simulatorPackages || [];
        }
        return [];
    };

    const filteredPackages = getFilteredPackages();
    const filteredSimulatorPackages = getFilteredSimulatorPackages();
    const hasAnyPackages = filteredPackages.length > 0 || filteredSimulatorPackages.length > 0;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-text-primary">Packages & Gifts</h1>
                    <p className="text-text-secondary mt-1">
                        {viewMode === 'view-packages' 
                            ? 'Buy packages for yourself, gift entire packages, or share sessions from your existing purchases.'
                            : 'Manage your purchased packages, transfer sessions, and claim gifts.'}
                    </p>
                </div>

                {viewMode === 'view-packages' && (
                    <>
                        {/* Filter Toggles */}
                        <div className="mb-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-text-secondary mr-2">Filter:</span>
                                {[
                                    { id: 'all', label: 'All Packages' },
                                    { id: 'coaching', label: 'Coaching Packages' },
                                    { id: 'simulator', label: 'Simulator Only Packages' },
                                    { id: 'combo', label: 'Combo Packages' },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setPackageFilter(filter.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            packageFilter === filter.id
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-background text-text-secondary hover:bg-background/80 border border-border'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
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

                        {!loading && !simulatorPackagesLoading && !hasAnyPackages && (
                            <div className="text-center py-6 text-text-secondary">
                                {packageFilter === 'all' 
                                    ? 'No active packages available at the moment.'
                                    : `No ${packageFilter === 'coaching' ? 'coaching' : packageFilter === 'simulator' ? 'simulator only' : 'combo'} packages available.`}
                            </div>
                        )}

                        {!loading && !simulatorPackagesLoading && hasAnyPackages && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Coaching/Combo Packages */}
                        {filteredPackages.map((pkg) => {
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
                                    <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-status-confirmed-text"></div>
                                            <span className="text-xs font-medium text-text-primary">{pkg.session_count} Sessions</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            <span className="text-xs font-medium text-text-primary">{pkg.session_duration_minutes} min</span>
                                        </div>
                                        {pkg.simulator_hours > 0 && (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                                <span className="text-xs font-medium text-text-primary">{pkg.simulator_hours} Simulator hrs</span>
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* Content Section */}
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Package Info */}
                                    <div className="bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-lg p-2.5 mb-3">
                                        <p className="text-xs text-status-confirmed-text font-semibold">
                                            You will get <span className="text-base font-bold">{pkg.session_count}</span> coaching session{pkg.session_count !== 1 ? 's' : ''}
                                            {pkg.simulator_hours > 0 && (
                                                <> and <span className="text-base font-bold">{pkg.simulator_hours}</span> simulator hour{pkg.simulator_hours !== 1 ? 's' : ''}</>
                                            )}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 mt-auto">
                                        {pkg.session_count >= 10 ? (
                                            <>
                                                <Button
                                                    onClick={() => handleOpenModal(pkg.id, 'normal', pkg.category)}
                                                    variant="primary"
                                                    className="w-full py-2 text-sm"
                                                >
                                                    Buy for Myself
                                                </Button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        onClick={() => handleOpenModal(pkg.id, 'gift', pkg.category)}
                                                        variant="accent"
                                                        className="w-full py-2 text-sm"
                                                    >
                                                        Gift Package
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleOpenModal(pkg.id, 'organization', pkg.category)}
                                                        variant="secondary"
                                                        className="w-full py-2 text-sm"
                                                    >
                                                        Group Purchase
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    onClick={() => handleOpenModal(pkg.id, 'normal', pkg.category)}
                                                    variant="primary"
                                                    className="w-full py-2 text-sm"
                                                >
                                                    Buy for Myself
                                                </Button>
                                                <Button
                                                    onClick={() => handleOpenModal(pkg.id, 'gift', pkg.category)}
                                                    variant="accent"
                                                    className="w-full py-2 text-sm"
                                                >
                                                    Gift Package
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                        {/* Simulator-Only Packages */}
                        {filteredSimulatorPackages.map((pkg) => {
                            return (
                                <div 
                                    key={`sim-${pkg.id}`} 
                                    className="rounded-card shadow-card bg-surface border border-border hover:shadow-card-hover transition-all duration-200 flex flex-col"
                                >
                                    {/* Header Section with Price */}
                                    <div className="bg-gradient-to-br from-accent/5 to-accent-light/5 p-4 border-b border-border">
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
                                        <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                                <span className="text-xs font-medium text-text-primary">{pkg.hours} Simulator Hours</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="mb-3">
                                            <p className="text-xs text-text-secondary">
                                                Simulator-only package. Hours can be used for simulator bookings only.
                                            </p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            <Button
                                                onClick={() => handleOpenModal(pkg.id, 'normal', pkg.category)}
                                                variant="primary"
                                                className="w-full py-2 text-sm"
                                            >
                                                Buy for Myself
                                            </Button>
                                            <Button
                                                onClick={() => handleOpenModal(pkg.id, 'gift', pkg.category)}
                                                variant="accent"
                                                className="w-full py-2 text-sm"
                                            >
                                                Gift Package
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                        )}
                    </>
                )}
            </div>

            {/* Manage Purchased Packages View */}
            {viewMode === 'manage-purchases' && (
                <>
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
                        {(() => {
                            const totalPurchases = purchases.length + simulatorPurchases.length;
                            const totalCount = (purchasesPagination.count || purchases.length) + (simulatorPurchases.length || 0);
                            return totalPurchases > previewLimit && (
                                <button
                                    onClick={() => navigate('/purchases/personal')}
                                    className="group text-sm text-primary hover:text-primary-light transition-colors font-medium cursor-pointer"
                                >
                                    <span className="border-b border-current group-hover:border-primary-light transition-colors">
                                        View All ({totalCount})
                                    </span>
                                </button>
                            );
                        })()}
                        <button
                            onClick={() => {
                                console.log('🔄 Refresh button clicked - Refreshing purchase data');
                                dispatch(getMyPackagePurchases({ page: 1 }));
                                dispatch(getMySimulatorPurchases({ page: 1 }));
                            }}
                            className="text-sm text-primary hover:text-primary-light font-semibold transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                {(purchasesLoading || simulatorPurchasesLoading) ? (
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
                ) : purchases.length === 0 && simulatorPurchases.length === 0 ? (
                    <div className="text-center text-text-secondary py-6">You haven&apos;t purchased any packages yet.</div>
                ) : (
                    <div className="grid gap-4">
                        {/* Combined purchases (coaching + simulator) - sorted by latest purchase first */}
                        {(() => {
                            // Combine all purchases and mark their type
                            const allPurchases = [
                                ...purchases.map(p => ({ ...p, purchaseType: 'coaching' })),
                                ...simulatorPurchases.map(p => ({ ...p, purchaseType: 'simulator' }))
                            ];
                            
                            // Sort by purchased_at date/time (most recent first)
                            const sortedPurchases = allPurchases.sort((a, b) => {
                                const dateA = new Date(a.purchased_at);
                                const dateB = new Date(b.purchased_at);
                                return dateB - dateA; // Descending order (newest first)
                            });
                            
                            // Take only the preview limit
                            return sortedPurchases
                                .slice(0, previewLimit)
                                .map((purchase) => {
                                    const isGift = purchase.purchase_type === 'gift';
                                    const owner = purchase.original_owner_details;
                                    const isSimulator = purchase.purchaseType === 'simulator';
                                    
                                    return (
                                        <div 
                                            key={isSimulator ? `sim-${purchase.id}` : purchase.id} 
                                            className={`rounded-card p-4 bg-surface shadow-card ${isSimulator ? 'border-l-4 border-accent' : ''}`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-text-primary">{purchase.purchase_name}</h3>
                                                    <p className="text-sm text-text-secondary">
                                                        Package: {purchase.package_details?.title || (isSimulator ? 'Simulator Package' : 'Package')}
                                                    </p>
                                                    {isSimulator ? (
                                                        <p className="text-sm text-text-secondary">
                                                            Simulator Hours Remaining: <span className="font-semibold">{purchase.hours_remaining}</span> / {purchase.hours_total} hrs
                                                        </p>
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
                                });
                        })()}
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
                )}
                    </div>
                </>
            )}

            <PackagePurchaseModal
                isOpen={modalOpen}
                onClose={handleCloseModal}
                packageId={selectedPackageId}
                packageData={selectedPackage}
                isSimulatorPackage={isSimulatorPackage}
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
            <PackageUsageDetails
                purchase={selectedPurchaseForDetails}
                isOpen={usageDetailsOpen}
                onClose={handleCloseUsageDetails}
            />
        </div>
    );
}

export default Packages;

