import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from '../components/skeletons/SkeletonLoader';
import Button from '../components/ui/Button';
import { Eye, Package as PackageIcon, X, UserPlus } from 'lucide-react';
import useToast from '../hooks/useToast';
import Toast from '../components/ui/Toast';
import CreateUserModal from '../components/CreateUserModal';
import { createUser } from '../store/slices/adminSlice';
import { getUserPurchases, getUserSimulatorPurchases } from '../store/slices/coachingSlice';

function MemberList() {
    const authState = useAppSelector((state) => state.auth);
    const locationTimezone = authState?.locationTimezone;
    const tz = locationTimezone || 'America/Halifax';

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { toast, showSuccess, showError, hideToast } = useToast();
    const {
        purchases,
        simulatorPurchases,
        purchasesLoading,
        simulatorPurchasesLoading
    } = useAppSelector((state) => state.coaching);

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [showPackagesListModal, setShowPackagesListModal] = useState(false);
    const [selectedMemberPackages, setSelectedMemberPackages] = useState([]);
    const [packages, setPackages] = useState([]);           // keyed by category tab id
    const [simulatorPackages, setSimulatorPackages] = useState([]);
    const [packagesLoading, setPackagesLoading] = useState(false);
    const [purchasingPackageId, setPurchasingPackageId] = useState(null);
    const [activePackageTab, setActivePackageTab] = useState('');  // set after categories load
    const [serviceCategories, setServiceCategories] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        count: 0,
        total_pages: 1,
        current_page: 1,
        page_size: 10
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef(null);
    const [activeTab, setActiveTab] = useState('details'); // 'details', 'coaching', 'simulator'

    const fetchMembers = async (pageNum = 1, search = '') => {
        try {
            setLoading(true);
            const params = {};
            if (search.trim()) {
                params.search = search.trim();
            } else {
                params.page = pageNum;
            }

            const response = await apiClient.get(endpoints.auth.memberList, { params });
            setMembers(response.data.members || []);
            setPagination({
                count: response.data.count || 0,
                total_pages: response.data.total_pages || 1,
                current_page: response.data.current_page || 1,
                page_size: response.data.page_size || 10
            });
        } catch (error) {
            console.error('Error fetching members:', error);
            showError('Failed to load member list');
        } finally {
            setLoading(false);
        }
    };

    // Handle search input change with debouncing
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
            if (value.trim()) {
                setIsSearching(true);
                fetchMembers(1, value);
            } else {
                setIsSearching(false);
                setPage(1);
                fetchMembers(1, '');
            }
        }, 500); // 500ms debounce delay
    };

    // Fetch members when component mounts or page changes (only if not searching)
    useEffect(() => {
        window.scrollTo(0, 0);
        if (!isSearching && !searchQuery.trim()) {
            fetchMembers(page);
        }
    }, [page]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Load service categories once so tabs are dynamic
    useEffect(() => {
        apiClient.get(endpoints.categories.admin.list)
            .then((res) => {
                const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
                const active = data.filter((c) => c.is_active);
                setServiceCategories(active);
                // Default detail tab: first non-simulator category, or first overall
                if (active.length > 0) {
                    const first = active.find((c) => c.legacy_booking_type !== 'simulator') || active[0];
                    setActivePackageTab(
                        first.legacy_booking_type === 'simulator' ? 'simulator'
                        : first.legacy_booking_type === 'coaching' ? 'coaching'
                        : `cat-${first.id}`
                    );
                }
            })
            .catch(() => {});
    }, []);

    // Build tab list for the member-detail modal from categories
    const detailTabs = useMemo(() => {
        const tabs = [{ id: 'details', label: 'Details' }];
        serviceCategories.forEach((cat) => {
            if (cat.legacy_booking_type === 'simulator') {
                tabs.push({ id: 'simulator', label: `Simulator Packages` });
            } else if (cat.legacy_booking_type === 'coaching') {
                tabs.push({ id: 'coaching', label: `Coaching Packages` });
            } else {
                tabs.push({ id: `cat-${cat.id}`, label: `${cat.customer_label || cat.name} Packages`, categoryId: cat.id });
            }
        });
        return tabs;
    }, [serviceCategories]);

    // Build tab list for the Add Package modal from categories
    const packageModalTabs = useMemo(() => {
        return serviceCategories.map((cat) => ({
            id: cat.legacy_booking_type === 'simulator' ? 'simulator'
                : cat.legacy_booking_type === 'coaching' ? 'coaching'
                : `cat-${cat.id}`,
            label: cat.customer_label || cat.name,
            categoryId: cat.id,
            legacyType: cat.legacy_booking_type,
        }));
    }, [serviceCategories]);

    const fetchPackages = async () => {
        try {
            setPackagesLoading(true);
            const params = { is_active: true };
            if (user?.ghl_location_id) params.location_id = user.ghl_location_id;

            // Build one request per category tab
            const requests = packageModalTabs.map((tab) => {
                if (tab.legacyType === 'simulator') {
                    return apiClient.get(endpoints.coaching.simulatorPackages, { params });
                }
                const p = { ...params };
                if (!tab.legacyType) p.category_id = tab.categoryId; // new-sport categories
                return apiClient.get(endpoints.coaching.packages, { params: p });
            });

            const results = await Promise.all(requests);
            const byTab = {};
            packageModalTabs.forEach((tab, i) => {
                const data = results[i].data;
                byTab[tab.id] = Array.isArray(data) ? data : data?.results || [];
            });
            setPackages(byTab);
            // Also keep simulatorPackages for backward compat
            const simTab = packageModalTabs.find((t) => t.legacyType === 'simulator');
            if (simTab) setSimulatorPackages(byTab[simTab.id] || []);
        } catch (error) {
            console.error('Error fetching packages:', error);
            showError('Failed to load packages');
        } finally {
            setPackagesLoading(false);
        }
    };

    const handleViewMember = (member) => {
        setSelectedMember(member);
        setActiveTab('details');
        dispatch(getUserPurchases({ userId: member.id }));
        dispatch(getUserSimulatorPurchases({ userId: member.id }));
        setShowModal(true);
    };

    const handleViewPackages = (member) => {
        if (member.staff_referred_purchases && member.staff_referred_purchases.length > 0) {
            setSelectedMemberPackages(member.staff_referred_purchases);
            setShowPackagesListModal(true);
        }
    };

    const handleAddPackage = () => {
        setShowPackageModal(true);
        if (packageModalTabs.length > 0) setActivePackageTab(packageModalTabs[0].id);
        fetchPackages();
    };

    const handlePurchasePackage = async (packageId, packageType = 'coaching') => {
        if (!selectedMember) return;

        try {
            setPurchasingPackageId(packageId);

            // Create temp purchase with referral_id
            const response = await apiClient.post('/coaching/temp-purchase/', {
                package_id: packageId,
                buyer_phone: selectedMember.phone,
                purchase_type: 'normal',
                package_type: packageType, // 'coaching' or 'simulator'
                referral_id: user.id  // Staff user ID
            });

            if (response.data.redirect_url && response.data.temp_id) {
                // Build redirect URL with all required query parameters
                const url = new URL(response.data.redirect_url);
                url.searchParams.set('phone', selectedMember.phone); // Client's phone
                url.searchParams.set('package_id', packageId.toString());
                url.searchParams.set('purchase_type', 'normal');
                url.searchParams.set('recipient_phone', response.data.temp_id); // recipient_phone contains temp_id
                url.searchParams.set('package_type', packageType);
                if (user.id) {
                    url.searchParams.set('referral_id', user.id.toString());
                }

                // Redirect to payment page
                window.location.href = url.toString();
            } else {
                showError('Failed to initiate purchase');
            }
        } catch (error) {
            console.error('Error creating temp purchase:', error);
            showError(error.response?.data?.error || 'Failed to initiate purchase');
        } finally {
            setPurchasingPackageId(null);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedMember(null);
        setShowPackageModal(false);
    };

    const closePackagesListModal = () => {
        setShowPackagesListModal(false);
        setSelectedMemberPackages([]);
    };

    const handleCreateUser = async (formData) => {
        try {
            const storedLocationId = localStorage.getItem('locationId');
            const userData = {
                ...formData,
                ghl_location_id: user?.ghl_location_id || storedLocationId,
                role: 'client'
            };
            const result = await dispatch(createUser(userData));
            if (createUser.fulfilled.match(result)) {
                showSuccess('User created successfully');
                fetchMembers(page);
            } else {
                throw new Error(result.payload?.error || 'Failed to create user');
            }
        } catch (error) {
            throw error;
        }
    };

    const renderPurchaseStatus = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </span>
        );
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 w-full">
            <div className="w-full">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                        Member List
                    </h1>
                    <p className="text-text-secondary mt-2">
                        View and manage all clients in your location
                    </p>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="relative flex flex-col md:flex-row gap-4 items-center">
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone number..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary placeholder-text-secondary"
                        />
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            variant="primary"
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap"
                        >
                            <UserPlus className="w-5 h-5" />
                            Create User
                        </Button>
                    </div>
                </div>

                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    {loading ? (
                        <TableSkeleton />
                    ) : members.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-secondary">No members found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Email</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Phone</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Staff Referred Packages</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => (
                                        <tr key={member.id} className="border-b border-border hover:bg-background transition-colors">
                                            <td className="py-3 px-4 text-sm text-text-primary">
                                                {member.first_name} {member.last_name}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-text-primary">{member.email}</td>
                                            <td className="py-3 px-4 text-sm text-text-primary">{member.phone}</td>
                                            <td
                                                className="py-3 px-4 text-sm text-text-primary cursor-pointer hover:text-primary transition-colors"
                                                onClick={() => handleViewPackages(member)}
                                            >
                                                {member.staff_referred_purchases && member.staff_referred_purchases.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="inline-block px-2 py-1 bg-primary-light/10 text-primary text-xs rounded-button">
                                                            {member.staff_referred_purchases[0].purchase_name}
                                                        </span>
                                                        {member.staff_referred_purchases.length > 1 && (
                                                            <span className="text-text-secondary">..</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-text-secondary">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    onClick={() => handleViewMember(member)}
                                                    variant="secondary"
                                                    className="px-3 py-1 text-sm"
                                                >
                                                    <Eye className="w-4 h-4 inline mr-1" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && members.length > 0 && !isSearching && !searchQuery.trim() && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-border">
                            <p className="text-sm text-text-secondary">
                                Showing{' '}
                                {pagination.count === 0
                                    ? '0'
                                    : `${(page - 1) * pagination.page_size + 1} - ${Math.min(page * pagination.page_size, pagination.count)}`} of {pagination.count} members
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page <= 1}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-medium text-text-primary">
                                    Page {page} of {pagination.total_pages}
                                </span>
                                <Button
                                    onClick={() => setPage((prev) => Math.min(pagination.total_pages, prev + 1))}
                                    disabled={page >= pagination.total_pages}
                                    variant="secondary"
                                    className="px-3 py-1"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}

                    {!loading && isSearching && searchQuery.trim() && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="text-sm text-text-secondary">
                                Found {members.length} {members.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Member Details Modal */}
            {showModal && selectedMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-text-primary">
                                        {selectedMember.first_name} {selectedMember.last_name}
                                    </h2>
                                    <p className="text-text-secondary">{selectedMember.email}</p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex flex-wrap border-b border-border mb-6">
                                {detailTabs.map((tab) => {
                                    let count = '';
                                    if (tab.id === 'simulator') {
                                        count = ` (${simulatorPurchases?.length || 0})`;
                                    } else if (tab.id === 'coaching') {
                                        const n = (purchases || []).filter((p) =>
                                            !p.package_details?.service_category_id ||
                                            p.package_details?.service_category_legacy_type === 'coaching'
                                        ).length;
                                        count = ` (${n})`;
                                    } else if (tab.id !== 'details' && tab.categoryId) {
                                        const n = (purchases || []).filter((p) =>
                                            p.package_details?.service_category_id === tab.categoryId
                                        ).length;
                                        count = ` (${n})`;
                                    }
                                    return (
                                        <button
                                            key={tab.id}
                                            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === tab.id
                                                ? 'border-primary text-primary'
                                                : 'border-transparent text-text-secondary hover:text-text-primary'
                                                }`}
                                            onClick={() => setActiveTab(tab.id)}
                                        >
                                            {tab.label}{count}
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTab === 'details' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary">Phone</label>
                                            <p className="text-text-primary">{selectedMember.phone}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary">Role</label>
                                            <p className="text-text-primary capitalize">{selectedMember.role}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 mt-4">
                                        <h3 className="text-lg font-semibold text-text-primary mb-3">Statistics</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-text-secondary">Total Coaching Sessions</label>
                                                <p className="text-text-primary">{selectedMember.custom_fields?.total_coaching_session || '0'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-text-secondary">Total Simulator Hours</label>
                                                <p className="text-text-primary">{selectedMember.custom_fields?.total_simulator_hour || '0'}</p>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-sm font-medium text-text-secondary">Last Active Package</label>
                                                <p className="text-text-primary">{selectedMember.custom_fields?.last_active_package || 'None'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 mt-4">
                                        <h3 className="text-lg font-semibold text-text-primary mb-3">Staff Referred Packages</h3>
                                        {selectedMember.staff_referred_purchases && selectedMember.staff_referred_purchases.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedMember.staff_referred_purchases.map((purchase) => (
                                                    <div key={purchase.id} className="p-3 bg-background rounded-card border border-border">
                                                        <p className="font-medium text-text-primary">{purchase.purchase_name}</p>
                                                        <p className="text-sm text-text-secondary">
                                                            Purchased: {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-text-secondary">No packages referred yet</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic purchase tab content */}
                            {activeTab === 'simulator' && (
                                <div className="space-y-4">
                                    {simulatorPurchasesLoading ? (
                                        <div className="text-center py-8 text-text-secondary">Loading purchases...</div>
                                    ) : simulatorPurchases?.length > 0 ? (
                                        <div className="space-y-3">
                                            {simulatorPurchases.map((purchase) => (
                                                <div key={purchase.id} className="p-4 bg-background rounded-card border border-border">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-semibold text-text-primary">{purchase.purchase_name}</h4>
                                                        {renderPurchaseStatus(purchase.package_status)}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-text-secondary">Hours Remaining:</span>
                                                            <span className="ml-2 font-medium text-text-primary">{purchase.simulator_hours_remaining}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-text-secondary">Purchased:</span>
                                                            <span className="ml-2 font-medium text-text-primary">
                                                                {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-text-secondary">No simulator packages found.</div>
                                    )}
                                </div>
                            )}

                            {/* Coaching (legacy) and new-sport category tabs */}
                            {activeTab !== 'details' && activeTab !== 'simulator' && (() => {
                                const isCoaching = activeTab === 'coaching';
                                const tabDef = detailTabs.find((t) => t.id === activeTab);
                                const filtered = purchasesLoading ? [] : (purchases || []).filter((p) => {
                                    if (isCoaching) {
                                        return !p.package_details?.service_category_id ||
                                            p.package_details?.service_category_legacy_type === 'coaching';
                                    }
                                    return p.package_details?.service_category_id === tabDef?.categoryId;
                                });
                                return (
                                    <div className="space-y-4">
                                        {purchasesLoading ? (
                                            <div className="text-center py-8 text-text-secondary">Loading purchases...</div>
                                        ) : filtered.length > 0 ? (
                                            <div className="space-y-3">
                                                {filtered.map((purchase) => (
                                                    <div key={purchase.id} className="p-4 bg-background rounded-card border border-border">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-semibold text-text-primary">{purchase.purchase_name}</h4>
                                                            {renderPurchaseStatus(purchase.package_status)}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-text-secondary">Sessions Remaining:</span>
                                                                <span className="ml-2 font-medium text-text-primary">{purchase.sessions_remaining}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-text-secondary">Purchased:</span>
                                                                <span className="ml-2 font-medium text-text-primary">
                                                                    {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-text-secondary">
                                                No {tabDef?.label || 'packages'} found.
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 pt-4 border-t border-border">
                                <Button
                                    onClick={() => navigate('/booking', { state: { client: selectedMember } })}
                                    variant="primary"
                                    className="w-full sm:w-auto"
                                >
                                    Book Session
                                </Button>
                                <Button
                                    onClick={handleAddPackage}
                                    variant="primary"
                                    className="w-full sm:w-auto"
                                >
                                    <PackageIcon className="w-4 h-4 inline mr-2" />
                                    Add Package
                                </Button>
                                <Button
                                    onClick={closeModal}
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPackageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-text-primary">Select Package</h2>
                                <button
                                    onClick={() => setShowPackageModal(false)}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Package Type Filter Tabs — dynamic from service categories */}
                            <div className="flex flex-wrap border-b border-border mb-4">
                                {packageModalTabs.map((tab) => {
                                    const tabPkgs = Array.isArray(packages) ? [] : (packages[tab.id] || []);
                                    return (
                                        <button
                                            key={tab.id}
                                            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                                                activePackageTab === tab.id
                                                    ? 'border-primary text-primary'
                                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                                            }`}
                                            onClick={() => setActivePackageTab(tab.id)}
                                        >
                                            {tab.label} ({tabPkgs.length})
                                        </button>
                                    );
                                })}
                            </div>

                            {packagesLoading ? (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary">Loading packages...</p>
                                </div>
                            ) : (() => {
                                const currentTab = packageModalTabs.find((t) => t.id === activePackageTab);
                                const tabPkgs = Array.isArray(packages) ? [] : (packages[activePackageTab] || []);
                                const isSimulator = currentTab?.legacyType === 'simulator';

                                if (tabPkgs.length === 0) {
                                    return (
                                        <div className="text-center py-8">
                                            <p className="text-text-secondary">No {currentTab?.label || ''} packages available</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {tabPkgs.map((pkg) => (
                                            <div
                                                key={pkg.id}
                                                className="border border-border rounded-card p-4 hover:shadow-card-hover transition-shadow"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-text-primary text-lg">{pkg.title}</h3>
                                                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{pkg.description}</p>
                                                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                                                            {isSimulator ? (
                                                                <span className="text-text-secondary">
                                                                    Hours: <span className="font-medium text-text-primary">{pkg.hours_total}</span>
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <span className="text-text-secondary">
                                                                        Sessions: <span className="font-medium text-text-primary">{pkg.session_count}</span>
                                                                    </span>
                                                                    {pkg.simulator_hours > 0 && (
                                                                        <span className="text-text-secondary">
                                                                            Sim Hours: <span className="font-medium text-text-primary">{pkg.simulator_hours}</span>
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                            <span className="font-bold text-primary text-base">${pkg.price}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={() => handlePurchasePackage(pkg.id, isSimulator ? 'simulator' : 'coaching')}
                                                        variant="primary"
                                                        disabled={purchasingPackageId === pkg.id}
                                                        className="w-full sm:w-auto sm:min-w-[120px] sm:self-start"
                                                    >
                                                        {purchasingPackageId === pkg.id ? 'Processing...' : 'Purchase'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showPackagesListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-card shadow-card max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-text-primary">Staff Referred Packages</h2>
                                <button
                                    onClick={closePackagesListModal}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {selectedMemberPackages.length > 0 ? (
                                    selectedMemberPackages.map((purchase) => (
                                        <div key={purchase.id} className="p-3 bg-background rounded-card border border-border">
                                            <p className="font-medium text-text-primary">{purchase.purchase_name}</p>
                                            {purchase.purchased_at && (
                                                <p className="text-sm text-text-secondary mt-1">
                                                    Purchased: {new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: tz })}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-text-secondary text-center py-4">No packages found</p>
                                )}
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button
                                    onClick={closePackagesListModal}
                                    variant="secondary"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}

            <CreateUserModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreateUser}
            />
        </div>
    );
}

export default MemberList;












