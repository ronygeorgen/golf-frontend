/**
 * Unified Package Management Page
 *
 * Single page to create, edit, toggle, and delete packages for ALL categories.
 * The form adapts its field set based on the selected service category:
 *
 *   legacy_booking_type = 'simulator'  →  hours-based  (SimulatorPackage model)
 *   legacy_booking_type = 'coaching'   →  session-based (CoachingPackage model, combo supported)
 *   legacy_booking_type = null         →  session-based (CoachingPackage model, new sport)
 *
 * No embedded sub-components; all CRUD is handled here.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import Badge from './ui/Badge';
import Button from './ui/Button';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import { Edit2, Trash2, Power, PowerOff, X, Plus, Minus } from 'lucide-react';

// ─── field-set helpers ───────────────────────────────────────────────────────

/** Returns true when the chosen category produces a CoachingPackage (session-based). */
const isSessionBased = (cat) =>
    !cat || cat.legacy_booking_type !== 'simulator';

/** Returns true when the chosen category produces a SimulatorPackage. */
const isHoursBased = (cat) => cat?.legacy_booking_type === 'simulator';

// ─── empty form factories ────────────────────────────────────────────────────

const emptySession = {
    service_category: '',
    title: '',
    description: '',
    price: '',
    session_count: 5,
    session_duration_minutes: 60,
    simulator_hours: 0,
    staff_members: [],
    redirect_url: '',
    is_active: true,
    is_tpi_assessment: false,
};

const emptyHours = {
    service_category: '',
    title: '',
    description: '',
    price: '',
    hours: '',
    validity_days: '',
    time_restrictions: [],
    redirect_url: '',
    is_active: true,
};

// ─── API helpers ─────────────────────────────────────────────────────────────

function apiListUrl(cat) {
    return isHoursBased(cat)
        ? endpoints.admin.simulatorPackages.list
        : endpoints.admin.packages.list;
}

function apiDetailUrl(cat, id) {
    return isHoursBased(cat)
        ? endpoints.admin.simulatorPackages.detail(id)
        : endpoints.admin.packages.detail(id);
}

function apiToggleUrl(cat, id) {
    return isHoursBased(cat)
        ? endpoints.admin.simulatorPackages.toggleActive(id)
        : endpoints.admin.packages.toggleActive(id);
}

// Build the payload sent to the backend
function buildPayload(form, cat) {
    const common = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price) || 0,
        redirect_url: form.redirect_url || '',
        is_active: form.is_active,
        service_category: form.service_category || null,
    };

    if (isHoursBased(cat)) {
        return {
            ...common,
            hours: parseFloat(form.hours) || 0,
            validity_days: form.validity_days ? parseInt(form.validity_days, 10) : null,
            time_restrictions: form.time_restrictions || [],
        };
    }

    return {
        ...common,
        session_count: parseInt(form.session_count, 10) || 1,
        session_duration_minutes: parseInt(form.session_duration_minutes, 10) || 60,
        simulator_hours: parseFloat(form.simulator_hours) || 0,
        staff_members: form.staff_members || [],
        ...(cat?.legacy_booking_type === 'coaching' ? { is_tpi_assessment: form.is_tpi_assessment } : {}),
    };
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FieldRow({ label, hint, children }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">{label}</label>
            {hint && <p className="text-xs text-text-secondary">{hint}</p>}
            {children}
        </div>
    );
}

function TextInput({ value, onChange, type = 'text', required, placeholder, min, step, className = '' }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            min={min}
            step={step}
            className={`w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
        />
    );
}

function TimeRestrictionRow({ restriction, index, onChange, onRemove }) {
    const DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return (
        <div className="border border-border rounded-button p-3 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Restriction {index + 1}</span>
                <button type="button" onClick={onRemove} className="text-error hover:text-error/80">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Type</label>
                    <select
                        value={restriction.is_recurring ? 'recurring' : 'specific'}
                        onChange={(e) => {
                            const recurring = e.target.value === 'recurring';
                            onChange(index, 'is_recurring', recurring);
                            if (recurring) onChange(index, 'date', '');
                            else onChange(index, 'day_of_week', null);
                        }}
                        className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    >
                        <option value="recurring">Weekly</option>
                        <option value="specific">Specific date</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-text-secondary">
                        {restriction.is_recurring ? 'Day of week' : 'Date'}
                    </label>
                    {restriction.is_recurring ? (
                        <select
                            value={restriction.day_of_week ?? ''}
                            onChange={(e) => onChange(index, 'day_of_week', e.target.value === '' ? null : Number(e.target.value))}
                            className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                        >
                            <option value="">Any</option>
                            {DOW.map((d, i) => <option key={d} value={i}>{d}</option>)}
                        </select>
                    ) : (
                        <input
                            type="date"
                            value={restriction.date || ''}
                            onChange={(e) => onChange(index, 'date', e.target.value)}
                            className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                        />
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-text-secondary">From</label>
                    <input
                        type="time"
                        value={restriction.start_time || ''}
                        onChange={(e) => onChange(index, 'start_time', e.target.value)}
                        className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-text-secondary">To</label>
                    <input
                        type="time"
                        value={restriction.end_time || ''}
                        onChange={(e) => onChange(index, 'end_time', e.target.value)}
                        className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    />
                </div>
                <div className="space-y-1 col-span-2">
                    <label className="text-xs text-text-secondary">Max hours allowed in this window</label>
                    <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={restriction.limit_hours ?? 1}
                        onChange={(e) => onChange(index, 'limit_hours', parseFloat(e.target.value))}
                        className="w-full rounded-button border border-border bg-background px-2 py-1 text-xs text-text-primary"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function UnifiedPackagesPage() {
    const { toast, showSuccess, showError, hideToast } = useToast();

    // Data
    const [categories, setCategories] = useState([]);
    const [staff, setStaff] = useState([]);
    const [coachingPkgs, setCoachingPkgs] = useState([]);
    const [simPkgs, setSimPkgs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter bar
    const [filterCatId, setFilterCatId] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // null = create mode
    const [formData, setFormData] = useState(emptySession);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const modalRef = useRef(null);

    // Action loading state
    const [toggling, setToggling] = useState({});
    const [deleting, setDeleting] = useState({});

    // ── load everything ──────────────────────────────────────────────────────

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, staffRes, cpRes, spRes] = await Promise.all([
                apiClient.get(endpoints.categories.admin.list),
                apiClient.get(endpoints.admin.staff.list),
                apiClient.get(endpoints.admin.packages.list),
                apiClient.get(endpoints.admin.simulatorPackages.list),
            ]);
            setCategories(Array.isArray(catRes.data) ? catRes.data : []);
            setStaff(Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.results || []);
            const cp = Array.isArray(cpRes.data) ? cpRes.data : cpRes.data?.results || [];
            const sp = Array.isArray(spRes.data) ? spRes.data : spRes.data?.results || [];
            setCoachingPkgs(cp.map((p) => ({ ...p, _kind: 'coaching' })));
            setSimPkgs(sp.map((p) => ({ ...p, _kind: 'simulator' })));
        } catch {
            showError('Failed to load packages');
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadAll(); }, [loadAll]);

    // Close modal on outside click
    useEffect(() => {
        if (!modalOpen) return;
        const handler = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) closeModal();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [modalOpen]);

    // ── derived ──────────────────────────────────────────────────────────────

    const allItems = useMemo(() => {
        const all = [...coachingPkgs, ...simPkgs];

        return all
            .filter((item) => {
                if (filterCatId) {
                    const catId = Number(filterCatId);
                    const match =
                        item.service_category_id === catId ||
                        item.service_category === catId;
                    if (!match) return false;
                }
                if (filterStatus === 'active' && !item.is_active) return false;
                if (filterStatus === 'inactive' && item.is_active) return false;
                if (search) {
                    const q = search.toLowerCase();
                    if (
                        !item.title.toLowerCase().includes(q) &&
                        !(item.service_category_name || '').toLowerCase().includes(q)
                    )
                        return false;
                }
                return true;
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    }, [coachingPkgs, simPkgs, filterCatId, filterStatus, search]);

    const selectedCategory = useMemo(() => {
        const id = Number(formData.service_category);
        return categories.find((c) => c.id === id) || null;
    }, [formData.service_category, categories]);

    // ── modal helpers ────────────────────────────────────────────────────────

    function openCreate() {
        setEditingItem(null);
        setFormData(emptySession);
        setFormError('');
        setModalOpen(true);
    }

    function openEdit(item) {
        setEditingItem(item);
        setFormError('');

        // Find the category for this item
        const catId = item.service_category_id ?? item.service_category ?? '';

        if (item._kind === 'simulator') {
            const timeRestrictions = (item.time_restrictions || []).map((r) => ({
                ...r,
                limit_hours:
                    r.limit_hours !== undefined ? parseFloat(r.limit_hours) : parseFloat(r.limit_count ?? 1),
            }));
            setFormData({
                ...emptyHours,
                service_category: catId,
                title: item.title || '',
                description: item.description || '',
                price: item.price ?? '',
                hours: item.hours ?? '',
                validity_days: item.validity_days || '',
                time_restrictions: timeRestrictions,
                redirect_url: item.redirect_url || '',
                is_active: item.is_active !== undefined ? item.is_active : true,
            });
        } else {
            const staffIds = (item.staff_members_details || item.staff_members || []).map((s) =>
                typeof s === 'object' ? s.id : s
            );
            setFormData({
                ...emptySession,
                service_category: catId,
                title: item.title || '',
                description: item.description || '',
                price: item.price ?? '',
                session_count: item.session_count || 5,
                session_duration_minutes: item.session_duration_minutes || 60,
                simulator_hours: item.simulator_hours ?? 0,
                staff_members: staffIds,
                redirect_url: item.redirect_url || '',
                is_active: item.is_active !== undefined ? item.is_active : true,
                is_tpi_assessment: item.is_tpi_assessment || false,
            });
        }
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingItem(null);
        setFormError('');
    }

    // When category changes in the form, reset type-specific fields
    function handleCategoryChange(newCatId) {
        const newCat = categories.find((c) => c.id === Number(newCatId)) || null;
        const wasHours = isHoursBased(selectedCategory);
        const nowHours = isHoursBased(newCat);

        if (wasHours !== nowHours) {
            // Switching between hours-based and session-based — reset all fields except common
            const base = nowHours ? emptyHours : emptySession;
            setFormData((prev) => ({
                ...base,
                service_category: newCatId,
                title: prev.title,
                description: prev.description,
                price: prev.price,
                redirect_url: prev.redirect_url,
                is_active: prev.is_active,
            }));
        } else {
            setFormData((prev) => ({ ...prev, service_category: newCatId }));
        }
    }

    // ── save ─────────────────────────────────────────────────────────────────

    async function handleSave(e) {
        e.preventDefault();
        setFormError('');

        if (!formData.service_category) {
            setFormError('Please select a service category.');
            return;
        }

        const payload = buildPayload(formData, selectedCategory);
        setSaving(true);
        try {
            if (editingItem) {
                await apiClient.patch(apiDetailUrl(selectedCategory, editingItem.id), payload);
                showSuccess('Package updated successfully');
            } else {
                await apiClient.post(apiListUrl(selectedCategory), payload);
                showSuccess('Package created successfully');
            }
            closeModal();
            await loadAll();
        } catch (err) {
            const detail = err?.response?.data;
            if (typeof detail === 'string') setFormError(detail);
            else if (detail && typeof detail === 'object')
                setFormError(Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
            else setFormError('Failed to save package. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    // ── toggle active ─────────────────────────────────────────────────────────

    async function handleToggle(item) {
        const key = `${item._kind}-${item.id}`;
        setToggling((prev) => ({ ...prev, [key]: true }));
        const cat = categories.find(
            (c) =>
                c.id === (item.service_category_id ?? item.service_category) ||
                (item._kind === 'simulator' && c.legacy_booking_type === 'simulator') ||
                (item._kind === 'coaching' && c.legacy_booking_type === 'coaching')
        ) || (item._kind === 'simulator' ? { legacy_booking_type: 'simulator' } : { legacy_booking_type: 'coaching' });

        try {
            await apiClient.post(apiToggleUrl(cat, item.id));
            showSuccess(`Package ${item.is_active ? 'deactivated' : 'activated'}`);
            await loadAll();
        } catch {
            showError('Failed to toggle package status');
        } finally {
            setToggling((prev) => ({ ...prev, [key]: false }));
        }
    }

    // ── delete ────────────────────────────────────────────────────────────────

    async function handleDelete(item) {
        if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

        const key = `${item._kind}-${item.id}`;
        setDeleting((prev) => ({ ...prev, [key]: true }));
        const cat = item._kind === 'simulator'
            ? { legacy_booking_type: 'simulator' }
            : { legacy_booking_type: 'coaching' };

        try {
            await apiClient.delete(apiDetailUrl(cat, item.id));
            showSuccess('Package deleted');
            await loadAll();
        } catch {
            showError('Failed to delete package');
        } finally {
            setDeleting((prev) => ({ ...prev, [key]: false }));
        }
    }

    // ── time restriction helpers ──────────────────────────────────────────────

    const addTimeRestriction = () =>
        setFormData((prev) => ({
            ...prev,
            time_restrictions: [
                ...prev.time_restrictions,
                { is_recurring: true, day_of_week: null, date: '', start_time: '', end_time: '', limit_hours: 1.0 },
            ],
        }));

    const updateTimeRestriction = (index, field, value) => {
        const updated = [...formData.time_restrictions];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({ ...prev, time_restrictions: updated }));
    };

    const removeTimeRestriction = (index) =>
        setFormData((prev) => ({
            ...prev,
            time_restrictions: prev.time_restrictions.filter((_, i) => i !== index),
        }));

    // ── staff toggle ──────────────────────────────────────────────────────────

    const toggleStaff = (id) =>
        setFormData((prev) => ({
            ...prev,
            staff_members: prev.staff_members.includes(id)
                ? prev.staff_members.filter((s) => s !== id)
                : [...prev.staff_members, id],
        }));

    // ── type badge ────────────────────────────────────────────────────────────

    const kindBadge = (item) => {
        if (item._kind === 'simulator') return <Badge status="personal">Simulator</Badge>;
        if (item.simulator_hours > 0) return <Badge status="no_show">Combo</Badge>;
        return <Badge status="confirmed">Coaching</Badge>;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-text-secondary">
                    Create and manage packages for every service category in one place.
                </p>
                <Button onClick={openCreate} variant="primary" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Package
                </Button>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-surface rounded-card shadow-card p-4 flex flex-wrap gap-3 items-center">
                <input
                    type="search"
                    placeholder="Search packages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[180px] flex-1"
                />
                <select
                    value={filterCatId}
                    onChange={(e) => setFilterCatId(e.target.value)}
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    <option value="all">All statuses</option>
                    <option value="active">Active only</option>
                    <option value="inactive">Inactive only</option>
                </select>
            </div>

            {/* ── Table ── */}
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={6} cols={6} />
                ) : allItems.length === 0 ? (
                    <div className="p-12 text-center text-text-secondary">
                        No packages found.{' '}
                        <button className="text-primary underline" onClick={openCreate}>
                            Create the first one.
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-background border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Title</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Category</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Price</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Details</th>
                                    <th className="px-4 py-3 text-left font-semibold text-text-primary">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold text-text-primary">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {allItems.map((item) => {
                                    const key = `${item._kind}-${item.id}`;
                                    return (
                                        <tr key={key} className="hover:bg-background/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate">
                                                {item.title}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary text-xs">
                                                {item.service_category_name || '—'}
                                            </td>
                                            <td className="px-4 py-3">{kindBadge(item)}</td>
                                            <td className="px-4 py-3 text-text-secondary">${item.price}</td>
                                            <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                                                {item._kind === 'simulator'
                                                    ? `${item.hours} hrs`
                                                    : `${item.session_count} sessions × ${item.session_duration_minutes} min`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge status={item.is_active ? 'confirmed' : 'cancelled'}>
                                                    {item.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Edit */}
                                                    <button
                                                        title="Edit package"
                                                        onClick={() => openEdit(item)}
                                                        className="p-1.5 rounded-button text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {/* Toggle active */}
                                                    <button
                                                        title={item.is_active ? 'Deactivate' : 'Activate'}
                                                        onClick={() => handleToggle(item)}
                                                        disabled={!!toggling[key]}
                                                        className={`p-1.5 rounded-button transition-colors ${item.is_active
                                                            ? 'text-status-confirmed-text hover:bg-status-confirmed-bg'
                                                            : 'text-text-secondary hover:bg-background'
                                                            }`}
                                                    >
                                                        {toggling[key] ? (
                                                            <span className="text-xs">…</span>
                                                        ) : item.is_active ? (
                                                            <PowerOff className="w-4 h-4" />
                                                        ) : (
                                                            <Power className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        title="Delete package"
                                                        onClick={() => handleDelete(item)}
                                                        disabled={!!deleting[key]}
                                                        className="p-1.5 rounded-button text-error hover:bg-error/10 transition-colors"
                                                    >
                                                        {deleting[key] ? (
                                                            <span className="text-xs">…</span>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
                    onClick={closeModal}
                >
                    <div
                        ref={modalRef}
                        className="bg-surface rounded-card shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-lg font-bold text-text-primary">
                                {editingItem ? 'Edit Package' : 'Add Package'}
                            </h3>
                            <button onClick={closeModal} className="text-text-secondary hover:text-text-primary transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            {/* ── Service Category (always first) ── */}
                            <FieldRow
                                label="Service Category *"
                                hint="The category determines which fields are shown and which booking flow this package belongs to."
                            >
                                <select
                                    required
                                    value={formData.service_category ?? ''}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="">— Select a category —</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                            {cat.legacy_booking_type
                                                ? ` · ${cat.legacy_booking_type}`
                                                : ' · new category'}
                                        </option>
                                    ))}
                                </select>
                                {selectedCategory && (
                                    <p className="text-xs text-text-secondary mt-1">
                                        {isHoursBased(selectedCategory)
                                            ? 'Simulator-type package: clients purchase hours, not sessions.'
                                            : 'Session-type package: clients book individual sessions using this package.'}
                                    </p>
                                )}
                            </FieldRow>

                            {/* ── Title ── */}
                            <FieldRow label="Package Title *">
                                <TextInput
                                    value={formData.title}
                                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                                    required
                                    placeholder="e.g. Fitness Starter Pack"
                                />
                            </FieldRow>

                            {/* ── Description ── */}
                            <FieldRow label="Description *">
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                                    placeholder="What does this package include?"
                                />
                            </FieldRow>

                            {/* ── Price ── */}
                            <FieldRow label="Price ($) *">
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </FieldRow>

                            {/* ══ SESSION-BASED FIELDS ══════════════════════════════════════════════ */}
                            {!isHoursBased(selectedCategory) && selectedCategory && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldRow label="Sessions Included *">
                                            <TextInput
                                                type="number"
                                                min="1"
                                                required
                                                value={formData.session_count}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, session_count: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                        <FieldRow label="Session Duration (min) *">
                                            <TextInput
                                                type="number"
                                                min="15"
                                                step="15"
                                                required
                                                value={formData.session_duration_minutes}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, session_duration_minutes: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                    </div>

                                    {/* Simulator hours (combo — only for legacy coaching) */}
                                    {selectedCategory?.legacy_booking_type === 'coaching' && (
                                        <FieldRow
                                            label="Simulator Hours Included"
                                            hint="Set > 0 to create a Combo package that also includes simulator hours."
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={formData.simulator_hours}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, simulator_hours: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                    )}

                                    {/* Assigned staff */}
                                    <FieldRow
                                        label="Assigned Staff"
                                        hint="Only staff assigned here can be booked for sessions from this package. Leave empty to allow any staff assigned to the category."
                                    >
                                        {staff.length === 0 ? (
                                            <p className="text-xs text-text-secondary">No staff found.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-border rounded-button p-3">
                                                {staff.map((s) => (
                                                    <label
                                                        key={s.id}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-background rounded px-1 py-1 transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.staff_members.includes(s.id)}
                                                            onChange={() => toggleStaff(s.id)}
                                                            className="w-3.5 h-3.5 rounded border-border text-primary"
                                                        />
                                                        <span className="text-sm text-text-primary">
                                                            {s.first_name} {s.last_name}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </FieldRow>

                                    {/* TPI assessment — only legacy coaching */}
                                    {selectedCategory?.legacy_booking_type === 'coaching' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_tpi_assessment}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, is_tpi_assessment: e.target.checked }))
                                                }
                                                className="w-4 h-4 rounded border-border text-primary"
                                            />
                                            <span className="text-sm text-text-primary">
                                                TPI Assessment package
                                                <span className="text-xs text-text-secondary ml-1">(non-transferable, personal use only)</span>
                                            </span>
                                        </label>
                                    )}
                                </>
                            )}

                            {/* ══ HOURS-BASED FIELDS ═══════════════════════════════════════════════ */}
                            {isHoursBased(selectedCategory) && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldRow label="Total Hours *">
                                            <TextInput
                                                type="number"
                                                min="0.5"
                                                step="0.5"
                                                required
                                                value={formData.hours}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, hours: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                        <FieldRow label="Validity (days)" hint="Leave blank for no expiry">
                                            <TextInput
                                                type="number"
                                                min="1"
                                                value={formData.validity_days}
                                                onChange={(e) =>
                                                    setFormData((p) => ({ ...p, validity_days: e.target.value }))
                                                }
                                                placeholder="e.g. 365"
                                            />
                                        </FieldRow>
                                    </div>

                                    {/* Time restrictions */}
                                    <FieldRow
                                        label="Time Restrictions"
                                        hint="Optionally limit how many hours can be used in specific windows."
                                    >
                                        <div className="space-y-2">
                                            {formData.time_restrictions.map((r, i) => (
                                                <TimeRestrictionRow
                                                    key={i}
                                                    restriction={r}
                                                    index={i}
                                                    onChange={updateTimeRestriction}
                                                    onRemove={() => removeTimeRestriction(i)}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                onClick={addTimeRestriction}
                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add time restriction
                                            </button>
                                        </div>
                                    </FieldRow>
                                </>
                            )}

                            {/* ══ COMMON FIELDS (always shown at bottom) ═══════════════════════════ */}

                            {/* Redirect URL - Hidden as per request to prioritize Square payments
                            <FieldRow
                                label="Redirect URL (optional)"
                                hint="Users are redirected here after purchasing. Used for external payment pages."
                            >
                                <TextInput
                                    type="url"
                                    value={formData.redirect_url}
                                    onChange={(e) => setFormData((p) => ({ ...p, redirect_url: e.target.value }))}
                                    placeholder="https://example.com/checkout"
                                />
                            </FieldRow>
                            */}

                            {/* Active */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                                    className="w-4 h-4 rounded border-border text-primary"
                                />
                                <span className="text-sm text-text-primary font-medium">Active</span>
                                <span className="text-xs text-text-secondary">(inactive packages are hidden from customers)</span>
                            </label>

                            {/* Error */}
                            {formError && (
                                <div className="rounded-button bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                                    {formError}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button type="submit" variant="primary" disabled={saving} className="flex-1">
                                    {saving
                                        ? editingItem ? 'Updating…' : 'Creating…'
                                        : editingItem ? 'Update Package' : 'Create Package'}
                                </Button>
                                <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast message={toast.message} type={toast.type} duration={toast.duration} onClose={hideToast} />
                </div>
            )}
        </div>
    );
}
