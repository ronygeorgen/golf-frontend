import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import {
    Ticket,
    Plus,
    Trash2,
    Edit,
    CheckCircle2,
    XCircle,
    Calendar,
    RefreshCcw,
    Search,
    Filter,
    Users,
    Activity,
    Package,
    ChevronRight,
    X,
    CheckSquare,
    Square,
} from 'lucide-react';
import PopupMessage from './PopupMessage';

export default function CouponManagement() {
    const [coupons, setCoupons] = useState([]);
    const [usages, setUsages] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' | 'usages'
    const [popup, setPopup] = useState({
        show: false,
        message: '',
        type: 'success',
        title: '',
        showCancel: false,
        onConfirm: null,
        confirmText: 'OK'
    });

    const [usageFilters, setUsageFilters] = useState({
        user: '',
        coupon: '',
        startDate: '',
        endDate: '',
        purpose: '',
        label: ''
    });

    const [allPackages, setAllPackages] = useState([]);
    const [allEvents, setAllEvents] = useState([]);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        applicable_to: 'all',
        max_uses: '',
        per_user_limit: '1',
        valid_from: '',
        valid_until: '',
        is_active: true
    });

    const [searchTerm, setSearchTerm] = useState('');

    // Package picker for per-package coupon restriction
    const [pkgPickerOpen, setPkgPickerOpen] = useState(false);
    const [pkgPickerSearch, setPkgPickerSearch] = useState('');
    const pkgPickerRef = useRef(null);

    // Event picker for per-event coupon restriction
    const [evtPickerOpen, setEvtPickerOpen] = useState(false);
    const [evtPickerSearch, setEvtPickerSearch] = useState('');

    // Close picker when clicking outside (no longer used for modal, kept for safety)
    useEffect(() => {
        if (!pkgPickerOpen) return;
        const handleClick = (e) => {
            if (pkgPickerRef.current && !pkgPickerRef.current.contains(e.target)) {
                setPkgPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [pkgPickerOpen]);

    // Derive which events are individually selected from applicable_to
    const selectedEventIds = formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('event')
        ? []
        : formData.applicable_to.split(',').filter(t => t.startsWith('event:')).map(t => Number(t.split(':')[1]));

    const allEvtChecked = formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('event');

    function toggleEvent(evtId) {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('event:') && x !== 'event');
        if (allEvtChecked) {
            const allIds = allEvents.map(e => e.id).filter(id => id !== evtId);
            setFormData({ ...formData, applicable_to: [...current, ...allIds.map(id => `event:${id}`)].join(',') });
        } else {
            const key = `event:${evtId}`;
            let newSelected;
            if (selectedEventIds.includes(evtId)) {
                newSelected = selectedEventIds.filter(id => id !== evtId).map(id => `event:${id}`);
            } else {
                newSelected = [...selectedEventIds.map(id => `event:${id}`), key];
            }
            if (newSelected.length === allEvents.length && allEvents.length > 0) {
                newSelected = [];
                current.push('event');
            }
            setFormData({ ...formData, applicable_to: [...current, ...newSelected].join(',') });
        }
    }

    function selectAllEvents() {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('event:') && x !== 'event');
        current.push('event');
        setFormData({ ...formData, applicable_to: current.join(',') });
    }

    function deselectAllEvents() {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('event:') && x !== 'event');
        setFormData({ ...formData, applicable_to: current.join(',') });
    }

    const filteredPickerEvents = (() => {
        const q = evtPickerSearch.toLowerCase();
        if (!q) return allEvents;
        const exact = [], prefix = [], contains = [];
        for (const e of allEvents) {
            const t = (e.title || '').toLowerCase();
            if (t === q) exact.push(e);
            else if (t.startsWith(q)) prefix.push(e);
            else if (t.includes(q)) contains.push(e);
        }
        return [...exact, ...prefix, ...contains];
    })();

    // Derive which packages are individually selected from applicable_to
    const selectedPackageIds = formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('package')
        ? [] // All selected — no need to track individually
        : formData.applicable_to.split(',').filter(t => t.startsWith('package:')).map(t => Number(t.split(':')[1]));

    // Whether the "All packages" checkbox for packages is checked
    const allPkgChecked = formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('package');

    function togglePackage(pkgId) {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('package:') && x !== 'package');
        
        if (allPkgChecked) {
            // Transition from "all" to explicit individual selections minus the toggled one
            const allIds = allPackages.map(p => p.id).filter(id => id !== pkgId);
            setFormData({ ...formData, applicable_to: [...current, ...allIds.map(id => `package:${id}`)].join(',') });
        } else {
            const key = `package:${pkgId}`;
            if (selectedPackageIds.includes(pkgId)) {
                current = [...current, ...selectedPackageIds.filter(id => id !== pkgId).map(id => `package:${id}`)];
            } else {
                current = [...current, ...selectedPackageIds.map(id => `package:${id}`), key];
            }
            // Optional: If this action causes ALL packages to be selected explicitly, we could auto-convert to 'package' token
            if (current.filter(c => c.startsWith('package:')).length === allPackages.length && allPackages.length > 0) {
                current = current.filter(c => !c.startsWith('package:'));
                current.push('package');
            }
            setFormData({ ...formData, applicable_to: current.join(',') });
        }
    }

    function selectAllPackages() {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('package:') && x !== 'package');
        current.push('package');
        setFormData({ ...formData, applicable_to: current.join(',') });
    }

    function deselectAllPackages() {
        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x && !x.startsWith('package:') && x !== 'package');
        setFormData({ ...formData, applicable_to: current.join(',') });
    }

    const filteredPickerPackages = (() => {
        const q = pkgPickerSearch.toLowerCase();
        if (!q) return allPackages;
        const exact = [], prefix = [], contains = [];
        for (const p of allPackages) {
            const t = (p.title || '').toLowerCase();
            if (t === q) exact.push(p);
            else if (t.startsWith(q)) prefix.push(p);
            else if (t.includes(q)) contains.push(p);
        }
        return [...exact, ...prefix, ...contains];
    })();

    // Preload assets to resolve names in usage history
    useEffect(() => {
        const preloadAssets = async () => {
            try {
                const res = await apiClient.get(endpoints.categories.assets.list(''));
                setAssets(res.data || []);

                // Fetch packages for filters
                const [cPackages, sPackages] = await Promise.all([
                    apiClient.get(endpoints.coaching.active),
                    apiClient.get(endpoints.coaching.simulatorPackagesActive)
                ]);
                setAllPackages([...(cPackages.data || []), ...(sPackages.data || [])]);

                // Fetch special events for coupon restriction picker
                try {
                    const evRes = await apiClient.get(endpoints.specialEvents.list);
                    setAllEvents(evRes.data?.results || evRes.data || []);
                } catch (_) { /* non-critical */ }
            } catch (err) {
                console.error('Failed to preload assets:', err);
            }
        };
        preloadAssets();
    }, []);

    useEffect(() => {
        if (activeTab === 'coupons') {
            fetchData();
        }
    }, [activeTab]);

    // Backend Search with Debounce for Usage History
    useEffect(() => {
        if (activeTab === 'usages') {
            const timer = setTimeout(() => {
                fetchData();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [usageFilters.user, usageFilters.coupon, usageFilters.label]);

    // Immediate fetch for Selects/Dates
    useEffect(() => {
        if (activeTab === 'usages') {
            fetchData();
        }
    }, [usageFilters.purpose, usageFilters.startDate, usageFilters.endDate, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'coupons') {
                const [couponRes, assetRes] = await Promise.all([
                    apiClient.get(endpoints.coupons.list),
                    apiClient.get(endpoints.categories.assets.list(''))
                ]);
                setCoupons(couponRes.data);
                setAssets(assetRes.data || []);
            } else {
                const params = {
                    user: usageFilters.user,
                    coupon: usageFilters.coupon,
                    purpose: usageFilters.purpose,
                    start_date: usageFilters.startDate,
                    end_date: usageFilters.endDate,
                    label: usageFilters.label
                };
                const res = await apiClient.get(endpoints.coupons.usages, { params });
                setUsages(res.data);
            }
        } catch (err) {
            showPopup('Failed to fetch data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showPopup = (message, type = 'success', options = {}) => {
        setPopup({
            show: true,
            message,
            type,
            title: options.title || '',
            showCancel: options.showCancel || false,
            onConfirm: options.onConfirm || null,
            confirmText: options.confirmText || 'OK'
        });

        // Auto-close toast messages (non-confirmation)
        if (!options.onConfirm && !options.showCancel) {
            setTimeout(() => setPopup(p => ({ ...p, show: false })), 3000);
        }
    };

    const handleOpenEditModal = (coupon = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                description: coupon.description || '',
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                applicable_to: coupon.applicable_to || 'all',
                max_uses: coupon.max_uses || '',
                per_user_limit: coupon.per_user_limit || '',
                valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : '',
                valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
                is_active: coupon.is_active
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                description: '',
                discount_type: 'percentage',
                discount_value: '',
                applicable_to: 'all',
                max_uses: '',
                per_user_limit: '1',
                valid_from: '',
                valid_until: '',
                is_active: true
            });
        }
        setIsEditModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clean data
        const payload = { ...formData };
        if (!payload.max_uses) payload.max_uses = null;
        if (!payload.per_user_limit) payload.per_user_limit = null;
        if (!payload.valid_from) payload.valid_from = null;
        if (!payload.valid_until) payload.valid_until = null;

        try {
            if (editingCoupon) {
                await apiClient.put(endpoints.coupons.detail(editingCoupon.id), payload);
                showPopup('Coupon updated successfully!');
            } else {
                await apiClient.post(endpoints.coupons.list, payload);
                showPopup('Coupon created successfully!');
            }
            setIsEditModalOpen(false);
            fetchData();
        } catch (err) {
            const msg = err.response?.data?.code?.[0] || err.response?.data?.error || 'Operation failed.';
            showPopup(msg, 'error');
        }
    };

    const handleDelete = (id) => {
        showPopup(
            'Are you sure you want to delete this coupon? This action cannot be undone.',
            'warning',
            {
                title: 'Delete Coupon',
                showCancel: true,
                confirmText: 'Delete',
                onConfirm: async () => {
                    try {
                        await apiClient.delete(endpoints.coupons.detail(id));
                        setPopup(p => ({ ...p, show: false }));
                        // Short delay to let the confirm modal close before showing success
                        setTimeout(() => showPopup('Coupon deleted successfully!'), 300);
                        fetchData();
                    } catch (err) {
                        showPopup('Failed to delete coupon.', 'error');
                    }
                }
            }
        );
    };

    const toggleStatus = async (coupon) => {
        try {
            await apiClient.put(endpoints.coupons.detail(coupon.id), { is_active: !coupon.is_active });
            fetchData();
        } catch (err) {
            showPopup('Failed to update status.', 'error');
        }
    };

    const filteredCoupons = coupons
        .filter(c =>
            c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const filteredUsages = usages;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-1 p-1 bg-surface border border-border rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('coupons')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'coupons'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Active Coupons
                    </button>
                    <button
                        onClick={() => setActiveTab('usages')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'usages'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Usage History
                    </button>
                </div>

                {activeTab === 'coupons' && (
                    <button
                        onClick={() => handleOpenEditModal()}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-white rounded-button hover:bg-primary-light transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Coupon</span>
                    </button>
                )}
            </div>

            {activeTab === 'coupons' ? (
                <div className="bg-surface rounded-card border border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-background/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:max-w-xs">
                            <input
                                type="text"
                                placeholder="Search coupons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-surface border border-border rounded-button text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-2 text-text-secondary hover:text-primary transition-colors"
                            title="Refresh"
                        >
                            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background/80 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Coupon Info</th>
                                    <th className="px-6 py-4">Discount</th>
                                    <th className="px-6 py-4">Usage</th>
                                    <th className="px-6 py-4">Validity</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && coupons.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                                            Loading coupons...
                                        </td>
                                    </tr>
                                ) : filteredCoupons.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-text-secondary">
                                            No coupons found.
                                        </td>
                                    </tr>
                                ) : filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-background/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                    <Ticket className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-text-primary uppercase">{coupon.code}</div>
                                                    <div className="text-xs text-text-secondary truncate max-w-[200px]">{coupon.description || 'No description'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit">
                                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `$${coupon.discount_value} OFF`}
                                                </span>
                                                <span className="text-[10px] font-semibold text-text-secondary uppercase">
                                                    {coupon.applicable_to === 'all' ? 'Global Coupon' :
                                                        coupon.applicable_to.split(',').map(t => {
                                                            const tok = t.trim();
                                                            // top-level generic tokens
                                                            if (tok === 'simulator') return 'Simulator';
                                                            if (tok === 'package') return 'All Packages';
                                                            if (tok === 'event') return 'All Events';
                                                            if (tok === 'asset') return 'All Assets';
                                                            // specific asset
                                                            if (tok.startsWith('asset:')) {
                                                                const aid = tok.split(':')[1];
                                                                const asset = assets.find(a => a.id.toString() === aid);
                                                                return asset ? `Asset: ${asset.name}` : `Asset #${aid}`;
                                                            }
                                                            // specific package
                                                            if (tok.startsWith('package:')) {
                                                                const pid = tok.split(':')[1];
                                                                const pkg = allPackages.find(p => p.id.toString() === pid);
                                                                return pkg ? `Pkg: ${pkg.title}` : `Package #${pid}`;
                                                            }
                                                            // specific event
                                                            if (tok.startsWith('event:')) {
                                                                const eid = tok.split(':')[1];
                                                                const evt = allEvents.find(e => e.id.toString() === eid);
                                                                return evt ? `Event: ${evt.title}` : `Event #${eid}`;
                                                            }
                                                            return tok;
                                                        }).join(' | ')
                                                    }
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-text-primary">
                                                {coupon.uses_count} / {coupon.max_uses || '∞'} uses
                                            </div>
                                            <div className="text-xs text-text-secondary mt-1">
                                                Limit: {coupon.per_user_limit ? `${coupon.per_user_limit} per user` : 'No limit per user'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-1">
                                                {coupon.valid_from && (
                                                    <div className="text-text-secondary">From: {new Date(coupon.valid_from).toLocaleDateString()}</div>
                                                )}
                                                {coupon.valid_until ? (
                                                    <div className={new Date(coupon.valid_until) < new Date() ? 'text-danger font-medium' : 'text-text-secondary'}>
                                                        Ends: {new Date(coupon.valid_until).toLocaleDateString()}
                                                    </div>
                                                ) : (
                                                    <div className="text-text-secondary italic">No expiration</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(coupon)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${coupon.is_active
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    }`}
                                            >
                                                {coupon.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {coupon.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(coupon)}
                                                    className="p-2 text-text-secondary hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coupon.id)}
                                                    className="p-2 text-text-secondary hover:text-danger transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-surface rounded-card border border-border p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">User</label>
                                <input
                                    type="text"
                                    placeholder="Search user..."
                                    value={usageFilters.user}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, user: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Coupon</label>
                                <input
                                    type="text"
                                    placeholder="Search code..."
                                    value={usageFilters.coupon}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, coupon: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Purpose</label>
                                <select
                                    value={usageFilters.purpose}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, purpose: e.target.value, label: '' })}
                                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">All Purposes</option>
                                    <option value="simulator">Simulator</option>
                                    <option value="package">Packages</option>
                                    <option value="event">Events</option>
                                    <option value="asset">Assets</option>
                                </select>
                            </div>
                            {usageFilters.purpose === 'package' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Package Type</label>
                                    <select
                                        value={usageFilters.label}
                                        onChange={(e) => setUsageFilters({ ...usageFilters, label: e.target.value })}
                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary font-medium"
                                    >
                                        <option value="">All Packages</option>
                                        {allPackages.map(pkg => (
                                            <option key={pkg.id} value={pkg.title}>{pkg.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={usageFilters.startDate}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, startDate: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={usageFilters.endDate}
                                    onChange={(e) => setUsageFilters({ ...usageFilters, endDate: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        {(usageFilters.user || usageFilters.coupon || usageFilters.purpose || usageFilters.startDate || usageFilters.endDate || usageFilters.label) && (
                            <button
                                onClick={() => setUsageFilters({ user: '', coupon: '', startDate: '', endDate: '', purpose: '', label: '' })}
                                className="mt-3 text-xs text-primary hover:underline font-medium"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>

                    <div className="bg-surface rounded-card border border-border overflow-hidden">
                        <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                            <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                Coupon Usage History
                                <span className="text-xs font-normal text-text-secondary ml-2">
                                    ({filteredUsages.length} records)
                                </span>
                            </h3>
                            <button
                                onClick={fetchData}
                                className="p-1 text-text-secondary hover:text-primary transition-colors"
                                title="Refresh"
                            >
                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-background/80 text-text-secondary text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Coupon</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Order Info</th>
                                        <th className="px-6 py-4">Savings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading && filteredUsages.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                                                Loading history...
                                            </td>
                                        </tr>
                                    ) : filteredUsages.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                                                No usage records match your filters.
                                            </td>
                                        </tr>
                                    ) : filteredUsages.map((usage) => (
                                        <tr key={usage.id} className="hover:bg-background/40">
                                            <td className="px-6 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                {new Date(usage.used_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-primary">
                                                {usage.coupon_code}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-background rounded-full flex items-center justify-center border border-border">
                                                        <Users className="w-3.5 h-3.5 text-text-secondary" />
                                                    </div>
                                                    <div className="text-sm text-text-primary font-medium">{usage.user_name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs uppercase text-text-secondary mb-1">
                                                    {(() => {
                                                        if (usage.item_label) return usage.item_label;
                                                        if (usage.payment_type?.startsWith('asset:')) {
                                                            const aid = usage.payment_type.split(':')[1];
                                                            const asset = assets.find(a => a.id.toString() === aid);
                                                            return asset ? `Asset: ${asset.name}` : `Asset #${aid}`;
                                                        }
                                                        const map = {
                                                            'package': 'Package Purchase',
                                                            'simulator': 'Simulator Booking',
                                                            'event': 'Event Registration',
                                                            'asset': 'Asset Booking'
                                                        };
                                                        return map[usage.payment_type?.toLowerCase()] || usage.payment_type;
                                                    })()}
                                                </div>
                                                <div className="text-sm font-medium">${usage.original_amount} → ${usage.final_amount}</div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-green-600">
                                                -${usage.discount_amount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Create Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface rounded-card shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-primary px-6 py-4 flex items-center justify-between">
                            <h2 className="text-white text-xl font-bold">
                                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-white/70 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Basic Information</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Coupon Code *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="SUMMER2026"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 font-bold tracking-widest"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
                                        <textarea
                                            rows="2"
                                            placeholder="Seasonal discount for simulator bookings..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">Coupon Purpose (Applicable To) *</label>
                                        <div className="space-y-3 p-4 bg-background border border-border rounded-button">
                                            <div className="flex items-center gap-3 pb-2 border-b border-border mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="all_services"
                                                    checked={formData.applicable_to === 'all'}
                                                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.checked ? 'all' : '' })}
                                                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                                />
                                                <label htmlFor="all_services" className="text-sm font-bold text-primary">Global (All Services)</label>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                                {[
                                                    { id: 'simulator', label: 'Simulator Bookings' },
                                                    { id: 'package', label: 'Package Purchases' },
                                                    { id: 'event', label: 'Special Events' },
                                                ].map((opt) => (
                                                    <div key={opt.id} className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                id={`purpose_${opt.id}`}
                                                                disabled={formData.applicable_to === 'all'}
                                                                checked={formData.applicable_to === 'all' || formData.applicable_to.split(',').includes(opt.id)}
                                                                onChange={(e) => {
                                                                    let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x);
                                                                    if (e.target.checked) {
                                                                        if (opt.id === 'package') {
                                                                            // Remove any individual package:ID tokens when checking "all packages"
                                                                            current = current.filter(k => !k.startsWith('package:'));
                                                                        }
                                                                        current.push(opt.id);
                                                                    } else {
                                                                        current = current.filter(k => k !== opt.id);
                                                                        if (opt.id === 'package') {
                                                                            // Also remove individual package:ID tokens
                                                                            current = current.filter(k => !k.startsWith('package:'));
                                                                        }
                                                                        if (opt.id === 'event') {
                                                                            // Also remove individual event:ID tokens
                                                                            current = current.filter(k => !k.startsWith('event:'));
                                                                        }
                                                                    }
                                                                    setFormData({ ...formData, applicable_to: current.join(',') });
                                                                }}
                                                                className="w-4 h-4 text-primary rounded border-border focus:ring-primary disabled:opacity-40"
                                                            />
                                                            <label
                                                                htmlFor={`purpose_${opt.id}`}
                                                                className={`text-sm ${formData.applicable_to === 'all' ? 'text-text-secondary opacity-60' : 'text-text-primary'}`}
                                                            >
                                                                {opt.label}
                                                            </label>
                                                        </div>

                                                        {/* "View Packages" button — only shown for the 'package' option */}

                                                        {opt.id === 'package' && formData.applicable_to !== 'all' && (
                                                            <div className="relative w-full mt-1" ref={opt.id === 'package' ? pkgPickerRef : null}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPkgPickerOpen(v => !v)}
                                                                    className="flex items-center justify-between w-full text-xs font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-md transition-all"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Package className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            {allPkgChecked
                                                                                ? `View (${allPackages.length})`
                                                                                : selectedPackageIds.length > 0
                                                                                    ? `View (${selectedPackageIds.length})`
                                                                                    : 'View'}
                                                                        </span>
                                                                    </div>
                                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${pkgPickerOpen ? 'rotate-90' : ''}`} />
                                                                </button>

                                                                {/* Package Picker Modal */}
                                                                {pkgPickerOpen && (
                                                                    <div
                                                                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                                                        onClick={() => setPkgPickerOpen(false)}
                                                                    >
                                                                        <div
                                                                            className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
                                                                            onClick={e => e.stopPropagation()}
                                                                            style={{ maxHeight: '80vh' }}
                                                                        >
                                                                            {/* Picker header */}
                                                                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                                                                                <span className="text-sm font-bold text-text-primary uppercase tracking-wide">Select Packages</span>
                                                                                <button type="button" onClick={() => setPkgPickerOpen(false)} className="text-text-secondary hover:text-text-primary">
                                                                                    <X className="w-5 h-5" />
                                                                                </button>
                                                                            </div>

                                                                            {/* Hint */}
                                                                            <div className="px-4 py-3 bg-surface">
                                                                                <p className="text-xs text-text-secondary leading-relaxed">
                                                                                    Check the <span className="font-semibold text-text-primary">"Package Purchases"</span> box in the main form to apply to all packages, or select individual ones below.
                                                                                </p>
                                                                            </div>

                                                                            {/* Search */}
                                                                            <div className="px-4 pb-3">
                                                                                <div className="relative">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                                                    <input
                                                                                        type="search"
                                                                                        placeholder="Search packages..."
                                                                                        value={pkgPickerSearch}
                                                                                        onChange={e => setPkgPickerSearch(e.target.value)}
                                                                                        className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* Select All Checkbox */}
                                                                            <div className="px-4 py-2 border-y border-border bg-background/50">
                                                                                <label className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={allPkgChecked || (filteredPickerPackages.length > 0 && filteredPickerPackages.every(p => selectedPackageIds.includes(p.id)))}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.checked) selectAllPackages();
                                                                                            else deselectAllPackages();
                                                                                        }}
                                                                                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                                                                    />
                                                                                    <span className="text-sm font-semibold text-text-primary">Select All</span>
                                                                                </label>
                                                                            </div>

                                                                            {/* Package list */}
                                                                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                                                                {filteredPickerPackages.length === 0 ? (
                                                                                    <div className="py-8 text-sm text-text-secondary text-center">No packages found.</div>
                                                                                ) : filteredPickerPackages.map(pkg => {
                                                                                    const isSelected = allPkgChecked || selectedPackageIds.includes(pkg.id);
                                                                                    return (
                                                                                        <label
                                                                                            key={pkg.id}
                                                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                                                                                isSelected ? 'bg-primary/5' : 'hover:bg-background'
                                                                                            }`}
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isSelected}
                                                                                                onChange={() => togglePackage(pkg.id)}
                                                                                                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                                                                            />
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="text-sm font-medium text-text-primary truncate">{pkg.title}</div>
                                                                                                {pkg.price && <div className="text-xs text-text-secondary mt-0.5">${pkg.price}</div>}
                                                                                            </div>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {/* Footer */}
                                                                            <div className="px-4 py-3 border-t border-border bg-background flex justify-between items-center">
                                                                                <div className="text-xs text-text-secondary font-medium">
                                                                                    {!allPkgChecked && selectedPackageIds.length > 0
                                                                                        ? <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">{selectedPackageIds.length} selected</span>
                                                                                        : 'No packages selected individually'}
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPkgPickerOpen(false)}
                                                                                    className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-hover transition-colors"
                                                                                >
                                                                                    Done
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* "View Events" button — only shown for the 'event' option */}

                                                        {opt.id === 'event' && formData.applicable_to !== 'all' && (
                                                            <div className="relative w-full mt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEvtPickerOpen(v => !v)}
                                                                    className="flex items-center justify-between w-full text-xs font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-md transition-all"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Calendar className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            {allEvtChecked
                                                                                ? `View (${allEvents.length})`
                                                                                : selectedEventIds.length > 0
                                                                                    ? `View (${selectedEventIds.length})`
                                                                                    : 'View'}
                                                                        </span>
                                                                    </div>
                                                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${evtPickerOpen ? 'rotate-90' : ''}`} />
                                                                </button>

                                                                {/* Event Picker Modal */}
                                                                {evtPickerOpen && (
                                                                    <div
                                                                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                                                        onClick={() => setEvtPickerOpen(false)}
                                                                    >
                                                                        <div
                                                                            className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
                                                                            onClick={e => e.stopPropagation()}
                                                                            style={{ maxHeight: '80vh' }}
                                                                        >
                                                                            {/* Header */}
                                                                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                                                                                <span className="text-sm font-bold text-text-primary uppercase tracking-wide">Select Special Events</span>
                                                                                <button type="button" onClick={() => setEvtPickerOpen(false)} className="text-text-secondary hover:text-text-primary">
                                                                                    <X className="w-5 h-5" />
                                                                                </button>
                                                                            </div>

                                                                            {/* Hint */}
                                                                            <div className="px-4 py-3 bg-surface">
                                                                                <p className="text-xs text-text-secondary leading-relaxed">
                                                                                    Check the <span className="font-semibold text-text-primary">"Special Events"</span> box in the main form to apply to all events, or select individual ones below.
                                                                                </p>
                                                                            </div>

                                                                            {/* Search */}
                                                                            <div className="px-4 pb-3">
                                                                                <div className="relative">
                                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                                                                    <input
                                                                                        type="search"
                                                                                        placeholder="Search events..."
                                                                                        value={evtPickerSearch}
                                                                                        onChange={e => setEvtPickerSearch(e.target.value)}
                                                                                        className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {/* Select All Checkbox */}
                                                                            <div className="px-4 py-2 border-y border-border bg-background/50">
                                                                                <label className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={allEvtChecked || (filteredPickerEvents.length > 0 && filteredPickerEvents.every(e => selectedEventIds.includes(e.id)))}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.checked) selectAllEvents();
                                                                                            else deselectAllEvents();
                                                                                        }}
                                                                                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                                                                    />
                                                                                    <span className="text-sm font-semibold text-text-primary">Select All</span>
                                                                                </label>
                                                                            </div>

                                                                            {/* Event list */}
                                                                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                                                                {filteredPickerEvents.length === 0 ? (
                                                                                    <div className="py-8 text-sm text-text-secondary text-center">No events found.</div>
                                                                                ) : filteredPickerEvents.map(evt => {
                                                                                    const isSelected = allEvtChecked || selectedEventIds.includes(evt.id);
                                                                                    return (
                                                                                        <label
                                                                                            key={evt.id}
                                                                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                                                                                isSelected ? 'bg-primary/5' : 'hover:bg-background'
                                                                                            }`}
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isSelected}
                                                                                                onChange={() => toggleEvent(evt.id)}
                                                                                                className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                                                                            />
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="text-sm font-medium text-text-primary truncate">{evt.title}</div>
                                                                                                {evt.price && <div className="text-xs text-text-secondary mt-0.5">${evt.price}</div>}
                                                                                            </div>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {/* Footer */}
                                                                            <div className="px-4 py-3 border-t border-border bg-background flex justify-between items-center">
                                                                                <div className="text-xs text-text-secondary font-medium">
                                                                                    {!allEvtChecked && selectedEventIds.length > 0
                                                                                        ? <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">{selectedEventIds.length} selected</span>
                                                                                        : 'No events selected individually'}
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEvtPickerOpen(false)}
                                                                                    className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary-hover transition-colors"
                                                                                >
                                                                                    Done
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                            </div>

                                            <div className="pt-3 border-t border-border/50">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id="purpose_asset"
                                                        disabled={formData.applicable_to === 'all'}
                                                        checked={formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('asset')}
                                                        onChange={(e) => {
                                                            let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x);
                                                            if (e.target.checked) {
                                                                current.push('asset');
                                                                current = current.filter(t => !t.startsWith('asset:'));
                                                            } else {
                                                                current = current.filter(k => k !== 'asset');
                                                            }
                                                            setFormData({ ...formData, applicable_to: current.join(',') });
                                                        }}
                                                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary disabled:opacity-40"
                                                    />
                                                    <label htmlFor="purpose_asset" className="text-sm font-bold text-text-primary">All Generic Assets</label>
                                                </div>

                                                {assets.filter(a => !a.needs_staff).length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2 pl-7">
                                                        {assets.filter(a => !a.needs_staff).map(asset => (
                                                            <div key={asset.id} className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`asset_${asset.id}`}
                                                                    disabled={formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('asset')}
                                                                    checked={formData.applicable_to === 'all' || formData.applicable_to.split(',').includes('asset') || formData.applicable_to.split(',').includes(`asset:${asset.id}`)}
                                                                    onChange={(e) => {
                                                                        let current = formData.applicable_to === 'all' ? [] : formData.applicable_to.split(',').filter(x => x);
                                                                        const key = `asset:${asset.id}`;
                                                                        if (e.target.checked) {
                                                                            current.push(key);
                                                                        } else {
                                                                            current = current.filter(k => k !== key);
                                                                        }
                                                                        setFormData({ ...formData, applicable_to: current.join(',') });
                                                                    }}
                                                                    className="w-3.5 h-3.5 text-primary rounded border-border focus:ring-primary disabled:opacity-40"
                                                                />
                                                                <label htmlFor={`asset_${asset.id}`} className="text-xs text-text-secondary truncate">{asset.name}</label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-background rounded-button border border-border">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                                        />
                                        <label htmlFor="is_active" className="text-sm font-medium text-text-primary">Coupon is Active</label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Discount & Limits</h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Discount Type</label>
                                            <select
                                                value={formData.discount_type}
                                                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                            >
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed Amount ($)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5 whitespace-nowrap">
                                                {formData.discount_type === 'percentage' ? 'Percent OFF' : 'Amount OFF'} *
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                min="0"
                                                placeholder={formData.discount_type === 'percentage' ? '20' : '15'}
                                                value={formData.discount_value}
                                                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Total Usage Limit</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                value={formData.max_uses}
                                                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <p className="text-[10px] text-text-secondary mt-1">Total times code can be used.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Per-User Limit</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                value={formData.per_user_limit}
                                                onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <p className="text-[10px] text-text-secondary mt-1">Times a single customer can use it.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.valid_from}
                                                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Expiry Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.valid_until}
                                                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-button border border-border text-text-primary font-medium hover:bg-background transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-button bg-primary text-white font-bold hover:bg-primary-light transition-colors shadow-lg"
                                >
                                    {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {popup.show && (
                <PopupMessage
                    open={popup.show}
                    message={popup.message}
                    type={popup.type}
                    title={popup.title}
                    showCancel={popup.showCancel}
                    confirmText={popup.confirmText}
                    onConfirm={popup.onConfirm}
                    onClose={() => setPopup(p => ({ ...p, show: false }))}
                />
            )}
        </div>
    );
}