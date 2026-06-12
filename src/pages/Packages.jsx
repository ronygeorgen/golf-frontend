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
import { getMyMemberships } from '../store/slices/membershipSlice';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import OrganizationMemberManagement from '../components/OrganizationMemberManagement';
import PackageUsageDetails from '../components/PackageUsageDetails';
import SessionTransfer from '../components/SessionTransfer';
import GiftClaim from '../components/GiftClaim';
import TransferClaim from '../components/TransferClaim';
import MembershipSubscribeModal from '../components/MembershipSubscribeModal';
import MembershipManageModal from '../components/MembershipManageModal';
import { Skeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ChevronDown, Clock, Calendar, CalendarDays } from 'lucide-react';

function Packages() {
    const authState = useAppSelector((state) => state.auth);
    const locationTimezone = authState?.locationTimezone;
    const tz = locationTimezone || 'America/Halifax';

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
    const [packageFilter, setPackageFilter] = useState('all'); // 'all', 'coaching', 'simulator', 'combo', or 'cat-<id>'
    const [serviceCategories, setServiceCategories] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('normal');
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [selectedPackageCategory, setSelectedPackageCategory] = useState(null); // Track which category was clicked
    const [memberManagementOpen, setMemberManagementOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
    const [selectedPurchaseForDetails, setSelectedPurchaseForDetails] = useState(null);
    const [restrictionsModalOpen, setRestrictionsModalOpen] = useState(false);
    const [selectedPackageForRestrictions, setSelectedPackageForRestrictions] = useState(null);
    const [membershipSubscribeOpen, setMembershipSubscribeOpen] = useState(false);
    const [membershipManageOpen, setMembershipManageOpen] = useState(false);
    const [selectedMembership, setSelectedMembership] = useState(null);
    const { subscriptions: memberships } = useAppSelector((state) => state.memberships);
    const previewLimit = 5;

    // Load service categories for dynamic filter tabs
    useEffect(() => {
        apiClient.get(endpoints.categories.active).then(({ data }) => {
            if (Array.isArray(data)) setServiceCategories(data);
        }).catch(() => {});
    }, []);

    // Auto-open purchase modal when ?buy=<packageId> is in the URL
    // (e.g. deep-linked from the booking page when user doesn't own a package)
    useEffect(() => {
        const buyId = searchParams.get('buy');
        if (!buyId) return;
        const allPkgs = [...(packages || []), ...(simulatorPackages || [])];
        if (allPkgs.length === 0) return; // wait for packages to load
        const targetPkg = allPkgs.find((p) => String(p.id) === String(buyId));
        if (targetPkg) {
            const isSimulator = simulatorPackages?.some((p) => String(p.id) === String(buyId));
            setSelectedPackageId(targetPkg.id);
            setSelectedPackageCategory(isSimulator ? 'simulator' : (targetPkg.category || 'coaching'));
            setModalType('normal');
            setModalOpen(true);
            // Remove the ?buy param so reloads don't re-open the modal
            setSearchParams((prev) => { prev.delete('buy'); return prev; });
        }
    }, [searchParams, packages, simulatorPackages]); // eslint-disable-line react-hooks/exhaustive-deps

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
        dispatch(getMyMemberships());
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
            dispatch(getMyMemberships());
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
                dispatch(getMyMemberships());
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
        setSelectedPackageCategory(packageCategory);
        
        // Find the correct package using the category to avoid ID conflicts
        let pkg;
        if (packageCategory === 'simulator') {
            pkg = (simulatorPackages || []).find(p => p.id === pkgId) || packages.find(p => p.id === pkgId);
        } else if (packageCategory === 'coaching' || packageCategory === 'combo') {
            pkg = packages.find(p => p.id === pkgId) || (simulatorPackages || []).find(p => p.id === pkgId);
        } else {
            pkg = (simulatorPackages || []).find(p => p.id === pkgId) || packages.find(p => p.id === pkgId);
        }

        if (pkg?.is_membership && type === 'normal') {
            setMembershipSubscribeOpen(true);
        } else {
            setModalType(type);
            setModalOpen(true);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setMembershipSubscribeOpen(false);
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
        dispatch(getMyMemberships());
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

    // IDs of non-legacy (new-sport) service categories — used to exclude them from the
    // "Coaching" / "Combo" legacy filter tabs so they only appear under their own tab.
    const nonLegacyCatIds = new Set(
        serviceCategories.filter(c => !c.legacy_booking_type).map(c => c.id)
    );

    // Filter packages based on selected filter
    const getFilteredPackages = () => {
        if (packageFilter === 'all') {
            return packages;
        } else if (packageFilter === 'memberships') {
            return packages.filter(pkg => pkg.is_membership);
        } else if (packageFilter === 'coaching') {
            // Legacy coaching: session-based, NOT belonging to a new-sport category
            return packages.filter(pkg => {
                const catId = pkg.service_category_id ?? pkg.service_category;
                if (catId && nonLegacyCatIds.has(catId)) return false;
                return !pkg.simulator_hours || parseFloat(pkg.simulator_hours) === 0;
            });
        } else if (packageFilter === 'combo') {
            // Combo: coaching + simulator hours, NOT belonging to a new-sport category
            return packages.filter(pkg => {
                const catId = pkg.service_category_id ?? pkg.service_category;
                if (catId && nonLegacyCatIds.has(catId)) return false;
                return pkg.simulator_hours && parseFloat(pkg.simulator_hours) > 0;
            });
        } else if (packageFilter.startsWith('cat-')) {
            // Phase E: filter by service_category_id
            const catId = Number(packageFilter.replace('cat-', ''));
            return packages.filter(pkg => pkg.service_category_id === catId || pkg.service_category === catId);
        }
        return [];
    };

    const getFilteredSimulatorPackages = () => {
        if (packageFilter === 'all' || packageFilter === 'simulator') {
            return simulatorPackages || [];
        } else if (packageFilter === 'memberships') {
            return (simulatorPackages || []).filter(pkg => pkg.is_membership);
        }
        // Phase E: a non-legacy service category might also have simulator packages
        if (packageFilter.startsWith('cat-')) {
            const catId = Number(packageFilter.replace('cat-', ''));
            return (simulatorPackages || []).filter(
                pkg => pkg.service_category_id === catId || pkg.service_category === catId,
            );
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
                                    { id: 'memberships', label: 'Memberships' },
                                    { id: 'coaching', label: 'Coaching' },
                                    { id: 'simulator', label: 'Simulator Only' },
                                    { id: 'combo', label: 'Combo' },
                                    // Phase E: one button per non-legacy service category
                                    ...serviceCategories
                                        .filter(c => !c.legacy_booking_type)
                                        .map(c => ({ id: `cat-${c.id}`, label: c.customer_label || c.name })),
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setPackageFilter(filter.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${packageFilter === filter.id
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
                                                        <p className="text-xs text-text-secondary mt-0.5">
                                                            {pkg.is_membership ? 'Per Month' : 'One-time'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Package Stats */}
                                                {pkg.is_membership && (
                                                    <div className="mb-2">
                                                        <Badge status="info" className="w-fit text-xs">Membership</Badge>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-status-confirmed-text"></div>
                                                        <span className="text-xs font-medium text-text-primary">
                                                            {pkg.is_membership ? `${pkg.monthly_sessions} Sessions/mo` : `${pkg.session_count} Sessions`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                                        <span className="text-xs font-medium text-text-primary">Duration {pkg.session_duration_minutes} min</span>
                                                    </div>
                                                    {((!pkg.is_membership && pkg.simulator_hours > 0) || (pkg.is_membership && pkg.monthly_simulator_hours > 0)) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                                            <span className="text-xs font-medium text-text-primary">
                                                                {pkg.is_membership ? `${pkg.monthly_simulator_hours} Simulator hrs/mo` : `${pkg.simulator_hours} Simulator hrs`}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {((!pkg.is_membership && pkg.category_hours > 0) || (pkg.is_membership && pkg.monthly_category_hours > 0)) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
                                                            <span className="text-xs font-medium text-text-primary">
                                                                {pkg.is_membership ? `${pkg.monthly_category_hours} Category hrs/mo` : `${pkg.category_hours} Category hrs`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>


                                            {/* Content Section */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                {/* Package Info */}
                                                <div className="bg-status-confirmed-bg border border-status-confirmed-text/20 rounded-lg p-2.5 mb-3">
                                                    <p className="text-xs text-status-confirmed-text font-semibold">
                                                        {pkg.is_membership ? (
                                                            <>You will get <span className="text-base font-bold">{pkg.monthly_sessions}</span> coaching session{pkg.monthly_sessions !== 1 ? 's' : ''}</>
                                                        ) : (
                                                            <>You will get <span className="text-base font-bold">{pkg.session_count}</span> coaching session{pkg.session_count !== 1 ? 's' : ''}</>
                                                        )}
                                                        {pkg.simulator_hours > 0 && !pkg.is_membership && (
                                                            <> and <span className="text-base font-bold">{pkg.simulator_hours}</span> simulator hour{pkg.simulator_hours !== 1 ? 's' : ''}</>
                                                        )}
                                                        {pkg.monthly_simulator_hours > 0 && pkg.is_membership && (
                                                            <> and <span className="text-base font-bold">{pkg.monthly_simulator_hours}</span> simulator hour{pkg.monthly_simulator_hours !== 1 ? 's' : ''}</>
                                                        )}
                                                        {pkg.is_membership && " per month"}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="space-y-2 mt-auto">
                                                    {pkg.is_membership ? (
                                                        memberships?.some(m => m.package_id === pkg.id && m.status === 'active') ? (
                                                            <Button
                                                                onClick={() => {
                                                                    const activeMembership = memberships.find(m => m.package_id === pkg.id && m.status === 'active');
                                                                    setSelectedMembership(activeMembership);
                                                                    setMembershipManageOpen(true);
                                                                }}
                                                                variant="secondary"
                                                                className="w-full py-2 text-sm"
                                                            >
                                                                Manage Membership
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleOpenModal(pkg.id, 'normal', pkg.category)}
                                                                variant="primary"
                                                                className="w-full py-2 text-sm"
                                                            >
                                                                Subscribe
                                                            </Button>
                                                        )
                                                    ) : pkg.session_count >= 10 ? (
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
                                                        <p className="text-xs text-text-secondary mt-0.5">{pkg.is_membership ? 'Per Month' : 'One-time'}</p>
                                                    </div>
                                                </div>

                                                {/* Package Stats */}
                                                {pkg.is_membership && (
                                                    <div className="mb-2">
                                                        <Badge status="info" className="w-fit text-xs">Membership</Badge>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 pt-2 border-t border-border/50 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                                                        <span className="text-xs font-medium text-text-primary">{pkg.is_membership ? pkg.monthly_hours : pkg.hours} Simulator Hours</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Content Section */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="mb-3">
                                                    <p className="text-xs text-text-secondary">
                                                        {pkg.is_membership 
                                                            ? `Simulator membership. You get ${pkg.monthly_hours} simulator hours every month.` 
                                                            : 'Simulator-only package. Hours can be used for simulator bookings only.'}
                                                    </p>
                                                </div>

                                                {/* Time Restrictions Section */}
                                                {pkg.time_restrictions && pkg.time_restrictions.length > 0 && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-primary" />
                                                                <span className="text-xs font-semibold text-text-primary">Time Restrictions</span>
                                                                <Badge variant="accent" className="text-xs py-0 px-1.5">
                                                                    {pkg.time_restrictions.length}
                                                                </Badge>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedPackageForRestrictions(pkg);
                                                                    setRestrictionsModalOpen(true);
                                                                }}
                                                                className="text-xs text-primary hover:text-primary-light transition-colors flex items-center gap-1 font-medium"
                                                            >
                                                                <span>View More</span>
                                                                <ChevronDown className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Validity Period */}
                                                {pkg.validity_days && (
                                                    <div className="mb-3 p-2 bg-background rounded-button border border-border">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                                                            <span className="text-text-secondary">Valid for: </span>
                                                            <span className="font-semibold text-text-primary">
                                                                {pkg.validity_days} day{pkg.validity_days !== 1 ? 's' : ''} from purchase
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="grid gap-2 mt-auto">
                                                    {pkg.is_membership ? (
                                                        memberships?.some(m => m.package_id === pkg.id && m.status === 'active') ? (
                                                            <Button
                                                                onClick={() => {
                                                                    const activeMembership = memberships.find(m => m.package_id === pkg.id && m.status === 'active');
                                                                    setSelectedMembership(activeMembership);
                                                                    setMembershipManageOpen(true);
                                                                }}
                                                                variant="secondary"
                                                                className="w-full py-2 text-sm"
                                                            >
                                                                Manage Membership
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleOpenModal(pkg.id, 'normal', pkg.category)}
                                                                variant="primary"
                                                                className="w-full py-2 text-sm"
                                                            >
                                                                Subscribe
                                                            </Button>
                                                        )
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

                    {memberships && memberships.length > 0 && (
                        <div className="bg-surface rounded-card shadow-card p-6 mb-8 border-l-4 border-primary">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <span className="text-primary">🔁</span> My Memberships
                                </h2>
                            </div>
                            <div className="grid gap-4">
                                {memberships.map((membership) => (
                                    <div key={membership.id} className="rounded-card p-4 bg-background border border-border shadow-card">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-semibold text-text-primary">{membership.package_details?.title}</h3>
                                                    <Badge status={membership.status === 'active' ? 'confirmed' : 'cancelled'}>
                                                        {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-text-secondary">
                                                    Hours reset every month.
                                                </p>
                                                {membership.status === 'active' && membership.current_period_end && (
                                                    <p className="text-sm font-medium text-primary mt-2">
                                                        Next billing & hours reset: {new Date(membership.current_period_end).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {membership.status === 'canceled' && membership.current_period_end && (
                                                    <p className="text-sm font-medium text-danger mt-2">
                                                        Access ends on: {new Date(membership.current_period_end).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {membership.status === 'active' && (
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setSelectedMembership(membership);
                                                            setMembershipManageOpen(true);
                                                        }}
                                                    >
                                                        Manage Membership
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                                        dispatch(getMyMemberships());
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
                                                                                            (Expires: {expiryDate.toLocaleDateString('en-US', { timeZone: tz })})
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
                                                                Purchased on {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
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
                                                        Created on {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
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
            
            <MembershipSubscribeModal
                isOpen={membershipSubscribeOpen}
                onClose={handleCloseModal}
                package={selectedPackage}
                locationId={authState?.locationId}
                onSuccess={handlePurchaseSuccess}
            />
            
            <MembershipManageModal
                isOpen={membershipManageOpen}
                onClose={() => { setMembershipManageOpen(false); setSelectedMembership(null); }}
                subscription={selectedMembership}
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

            {/* Time Restrictions Modal */}
            {restrictionsModalOpen && selectedPackageForRestrictions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setRestrictionsModalOpen(false)}>
                    <div className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Time Restrictions
                                </h2>
                                <p className="text-sm text-text-secondary mt-1">{selectedPackageForRestrictions.title}</p>
                            </div>
                            <button
                                onClick={() => setRestrictionsModalOpen(false)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {selectedPackageForRestrictions.validity_days && (
                            <div className="mb-4 p-3 bg-background rounded-button border border-border">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-text-secondary" />
                                    <span className="text-text-secondary">Valid for: </span>
                                    <span className="font-semibold text-text-primary">
                                        {selectedPackageForRestrictions.validity_days} day{selectedPackageForRestrictions.validity_days !== 1 ? 's' : ''} from purchase date
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {selectedPackageForRestrictions.time_restrictions.map((restriction, idx) => {
                                const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                const dayName = restriction.is_recurring
                                    ? (restriction.day_of_week !== null ? dayNames[restriction.day_of_week] : 'Unknown')
                                    : null;
                                const dateStr = restriction.is_recurring
                                    ? null
                                    : (restriction.date ? new Date(restriction.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    }) : null);

                                const formatTime = (timeStr) => {
                                    if (!timeStr) return '';
                                    const timeParts = timeStr.split(':');
                                    const hours = parseInt(timeParts[0], 10);
                                    const minutes = timeParts[1] || '00';
                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                    const displayHour = hours % 12 || 12;
                                    return `${displayHour}:${minutes} ${ampm}`;
                                };

                                return (
                                    <div key={idx} className="p-4 bg-background rounded-button border border-border">
                                        <div className="flex items-start gap-3">
                                            {restriction.is_recurring ? (
                                                <CalendarDays className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                            ) : (
                                                <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-base font-semibold text-text-primary">
                                                        {restriction.is_recurring ? dayName : dateStr}
                                                    </h3>
                                                    {restriction.is_recurring && (
                                                        <Badge variant="accent" className="text-xs">Recurring</Badge>
                                                    )}
                                                    {!restriction.is_recurring && (
                                                        <Badge variant="primary" className="text-xs">One-time</Badge>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 text-sm">
                                                    <div className="flex items-center gap-2 text-text-secondary">
                                                        <Clock className="w-4 h-4" />
                                                        <span>
                                                            {formatTime(restriction.start_time)} - {formatTime(restriction.end_time)}
                                                        </span>
                                                    </div>
                                                    <div className="text-text-secondary">
                                                        <span className="font-medium">Usage Limit: </span>
                                                        <span className="font-semibold text-text-primary">{restriction.limit_hours} hour{restriction.limit_hours !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <p className="text-xs text-text-secondary mt-2 pt-2 border-t border-border/50">
                                                        This package can be used for up to {restriction.limit_hours} hour{restriction.limit_hours !== 1 ? 's' : ''} on {restriction.is_recurring ? dayName : dateStr} between {formatTime(restriction.start_time)} and {formatTime(restriction.end_time)}.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setRestrictionsModalOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Packages;

