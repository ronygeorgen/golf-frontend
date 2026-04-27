import React, { useState, useEffect } from 'react';
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
    Activity
} from 'lucide-react';
import PopupMessage from './PopupMessage';

export default function CouponManagement() {
    const [coupons, setCoupons] = useState([]);
    const [usages, setUsages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('coupons'); // 'coupons' | 'usages'
    const [popup, setPopup] = useState({ show: false, message: '', type: 'success' });

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

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'coupons') {
                const res = await apiClient.get(endpoints.coupons.list);
                setCoupons(res.data);
            } else {
                const res = await apiClient.get(endpoints.coupons.usages);
                setUsages(res.data);
            }
        } catch (err) {
            showPopup('Failed to fetch data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showPopup = (message, type = 'success') => {
        setPopup({ show: true, message, type });
        setTimeout(() => setPopup({ ...popup, show: false }), 3000);
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

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;
        try {
            await apiClient.delete(endpoints.coupons.detail(id));
            showPopup('Coupon deleted.');
            fetchData();
        } catch (err) {
            showPopup('Failed to delete coupon.', 'error');
        }
    };

    const toggleStatus = async (coupon) => {
        try {
            await apiClient.put(endpoints.coupons.detail(coupon.id), { is_active: !coupon.is_active });
            fetchData();
        } catch (err) {
            showPopup('Failed to update status.', 'error');
        }
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search coupons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-button text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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
                                                    {coupon.applicable_to === 'all' ? 'Global Coupon' : `${coupon.applicable_to} only`}
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
                <div className="bg-surface rounded-card border border-border overflow-hidden">
                    <div className="p-4 border-b border-border bg-background/50">
                        <h3 className="font-semibold text-text-primary flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Recent Coupon Applications
                        </h3>
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
                                {loading && usages.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                                            Loading history...
                                        </td>
                                    </tr>
                                ) : usages.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-text-secondary">
                                            No usage records found.
                                        </td>
                                    </tr>
                                ) : usages.map((usage) => (
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
                                            <div className="text-xs uppercase text-text-secondary mb-1">{usage.payment_type}</div>
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
            )}

            {/* Edit/Create Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface rounded-card shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
                                        <label className="block text-sm font-medium text-text-primary mb-1.5">Coupon Purpose (Applicable To) *</label>
                                        <select
                                            value={formData.applicable_to}
                                            onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value })}
                                            className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="all">Global (All Services)</option>
                                            <option value="simulator">Simulator Bookings Only</option>
                                            <option value="package">Package Purchases Only</option>
                                            <option value="event">Special Event Registrations Only</option>
                                        </select>
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Discount Type</label>
                                            <select
                                                value={formData.discount_type}
                                                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed Amount ($)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">
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
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Total Usage Limit</label>
                                            <input
                                                type="number"
                                                placeholder="Unlimited"
                                                value={formData.max_uses}
                                                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
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
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <p className="text-[10px] text-text-secondary mt-1">Times a single customer can use it.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.valid_from}
                                                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">Expiry Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.valid_until}
                                                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                                className="w-full px-4 py-2 bg-background border border-border rounded-button outline-none focus:ring-2 focus:ring-primary/20 text-sm"
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
                    onClose={() => setPopup({ ...popup, show: false })}
                />
            )}
        </div>
    );
}
