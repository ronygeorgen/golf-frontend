import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Edit, Trash2, Power, PowerOff, Plus, Layers } from 'lucide-react';

const LEGACY_TYPE_LABELS = {
    simulator: 'Simulator (legacy)',
    coaching: 'Coaching (legacy)',
};

const emptyForm = {
    name: '',
    slug: '',
    customer_label: '',
    description: '',
    sort_order: 0,
    is_active: true,
    legacy_booking_type: '',
};

function toSlug(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

function CategoryManagement() {
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const modalRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [slugAutoGen, setSlugAutoGen] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                closeForm();
            }
        };
        if (showForm) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showForm]);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(endpoints.categories.admin.list);
            setCategories(Array.isArray(data) ? data : data?.results || []);
        } catch {
            showError('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingCategory(null);
        setFormData(emptyForm);
        setSlugAutoGen(true);
    };

    const handleEdit = (cat) => {
        setEditingCategory(cat);
        setFormData({
            name: cat.name,
            slug: cat.slug,
            customer_label: cat.customer_label,
            description: cat.description || '',
            sort_order: cat.sort_order ?? 0,
            is_active: cat.is_active,
            legacy_booking_type: cat.legacy_booking_type || '',
        });
        setSlugAutoGen(false);
        setShowForm(true);
    };

    const handleNameChange = (e) => {
        const val = e.target.value;
        setFormData((prev) => ({
            ...prev,
            name: val,
            ...(slugAutoGen ? { slug: toSlug(val) } : {}),
        }));
    };

    const handleSlugChange = (e) => {
        setSlugAutoGen(false);
        setFormData((prev) => ({ ...prev, slug: e.target.value }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showError('Category name is required.');
            return;
        }
        const payload = {
            ...formData,
            legacy_booking_type: formData.legacy_booking_type || null,
            sort_order: Number(formData.sort_order) || 0,
        };
        setSubmitLoading(true);
        try {
            if (editingCategory) {
                await apiClient.put(endpoints.categories.admin.detail(editingCategory.id), payload);
                showSuccess('Category updated successfully');
            } else {
                await apiClient.post(endpoints.categories.admin.list, payload);
                showSuccess('Category created successfully');
            }
            closeForm();
            fetchCategories();
        } catch (err) {
            const detail = err.response?.data;
            if (detail && typeof detail === 'object') {
                const msgs = Object.values(detail).flat().join(' ');
                showError(msgs || 'Failed to save category');
            } else {
                showError('Failed to save category');
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleToggleActive = async (cat) => {
        setTogglingId(cat.id);
        try {
            const { data } = await apiClient.patch(
                endpoints.categories.admin.toggleActive(cat.id)
            );
            setCategories((prev) =>
                prev.map((c) => (c.id === cat.id ? { ...c, is_active: data.is_active } : c))
            );
            showSuccess(`Category ${data.is_active ? 'activated' : 'deactivated'}`);
        } catch {
            showError('Failed to toggle category');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = (cat) => {
        openPopup({
            title: 'Delete Category',
            message: `Delete "${cat.name}"? This cannot be undone. Existing bookings and packages are not affected, but the category will no longer appear in the booking UI.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger',
            onConfirm: async () => {
                setDeletingId(cat.id);
                try {
                    await apiClient.delete(endpoints.categories.admin.detail(cat.id));
                    showSuccess('Category deleted');
                    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                } catch {
                    showError('Failed to delete category');
                } finally {
                    setDeletingId(null);
                }
            },
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                    Define the types of sessions available for booking (e.g. Simulator, Coaching, Fitness).
                </p>
                <Button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData(emptyForm);
                        setSlugAutoGen(true);
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Category
                </Button>
            </div>

            {/* Table */}
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={4} cols={5} />
                ) : categories.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary">
                        No categories found. Create one to get started.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-background border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Name</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Customer Label</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Slug</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Booking Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Order</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Staff</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold text-text-primary">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-text-primary">{cat.name}</td>
                                        <td className="px-4 py-3 text-text-secondary">{cat.customer_label || '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{cat.slug}</td>
                                        <td className="px-4 py-3">
                                            {cat.legacy_booking_type ? (
                                                <Badge status="personal">
                                                    {LEGACY_TYPE_LABELS[cat.legacy_booking_type] || cat.legacy_booking_type}
                                                </Badge>
                                            ) : (
                                                <span className="text-text-secondary text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-text-secondary">{cat.sort_order}</td>
                                        <td className="px-4 py-3 text-text-secondary text-sm">
                                            {cat.staff_count ?? 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge status={cat.is_active ? 'confirmed' : 'cancelled'}>
                                                {cat.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {(!cat.legacy_booking_type || cat.legacy_booking_type === 'simulator') && (
                                                    <button
                                                        title="Manage Assets"
                                                        onClick={() =>
                                                            cat.legacy_booking_type === 'simulator'
                                                                ? navigate('/admin/simulators')
                                                                : navigate(`/admin/categories/${cat.id}/assets`)
                                                        }
                                                        className="p-1.5 rounded hover:bg-teal-100 text-text-secondary hover:text-teal-700 transition-colors"
                                                    >
                                                        <Layers className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    title="Edit"
                                                    onClick={() => handleEdit(cat)}
                                                    className="p-1.5 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    title={cat.is_active ? 'Deactivate' : 'Activate'}
                                                    disabled={togglingId === cat.id}
                                                    onClick={() => handleToggleActive(cat)}
                                                    className="p-1.5 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors disabled:opacity-40"
                                                >
                                                    {cat.is_active ? (
                                                        <PowerOff className="w-4 h-4" />
                                                    ) : (
                                                        <Power className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    title="Delete"
                                                    disabled={deletingId === cat.id}
                                                    onClick={() => handleDelete(cat)}
                                                    className="p-1.5 rounded hover:bg-status-cancelled-bg text-text-secondary hover:text-status-cancelled-text transition-colors disabled:opacity-40"
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
                )}
            </div>

            {/* Create / Edit modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        ref={modalRef}
                        className="bg-surface rounded-card shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary">
                                {editingCategory ? 'Edit Category' : 'Add Category'}
                            </h3>
                            <button
                                onClick={closeForm}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    required
                                    placeholder="e.g. Fitness, Table Tennis, Golf Simulator"
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>

                            {/* Customer label */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                    Customer Label
                                </label>
                                <input
                                    type="text"
                                    name="customer_label"
                                    value={formData.customer_label}
                                    onChange={handleChange}
                                    placeholder="Shown in booking dropdown, e.g. Book Fitness"
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    The label shown to customers when selecting a session type.
                                </p>
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={handleSlugChange}
                                    placeholder="auto-generated from name"
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    URL-safe key. Auto-generated if left blank. Cannot be changed after bookings exist.
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Optional internal description"
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                />
                            </div>

                            {/* Sort order */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-1">
                                    Display order
                                </label>
                                <input
                                    type="number"
                                    name="sort_order"
                                    value={formData.sort_order}
                                    onChange={handleChange}
                                    min={0}
                                    className="w-28 rounded-button border border-border bg-background px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Sets the position of this category in the customer booking dropdown.
                                    <strong> 1</strong> appears first, <strong>2</strong> second, and so on.
                                    Use this to control which category customers see at the top.
                                </p>
                            </div>

                            {/* Is active */}
                            <div className="flex items-center gap-3">
                                <input
                                    id="cat-active"
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="w-4 h-4 accent-primary"
                                />
                                <label htmlFor="cat-active" className="text-sm font-medium text-text-primary">
                                    Active (visible to customers)
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="flex-1"
                                >
                                    {submitLoading
                                        ? 'Saving…'
                                        : editingCategory
                                        ? 'Update Category'
                                        : 'Create Category'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeForm}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm popup (delete) */}
            {popup && (
                <PopupMessage
                    {...popup}
                    onConfirm={async () => {
                        const fn = popup.onConfirm;
                        closePopup();
                        if (fn) await fn();
                    }}
                    onCancel={closePopup}
                />
            )}

            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={hideToast}
                    />
                </div>
            )}
        </div>
    );
}

export default CategoryManagement;
