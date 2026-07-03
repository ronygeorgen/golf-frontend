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
import { Edit2, Trash2, Power, PowerOff, X, Plus, Minus, UserPlus, CheckSquare, Square, ChevronDown } from 'lucide-react';

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
    category_hours: 0,
    staff_members: [],
    redirect_url: '',
    is_active: true,
    is_tpi_assessment: false,
    is_membership: false,
    monthly_sessions: 0,
    monthly_simulator_hours: 0,
    monthly_category_hours: 0,
    hide_price_on_card: false,
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
    is_membership: false,
    monthly_hours: 0,
    hide_price_on_card: false,
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
        is_membership: form.is_membership || false,
        hide_price_on_card: form.hide_price_on_card || false,
    };

    if (isHoursBased(cat)) {
        return {
            ...common,
            hours: parseFloat(form.hours) || 0,
            validity_days: form.validity_days ? parseInt(form.validity_days, 10) : null,
            time_restrictions: form.time_restrictions || [],
            monthly_hours: parseFloat(form.monthly_hours) || 0,
        };
    }

    return {
        ...common,
        session_count: parseInt(form.session_count, 10) || 1,
        session_duration_minutes: parseInt(form.session_duration_minutes, 10) || 60,
        simulator_hours: parseFloat(form.simulator_hours) || 0,
        category_hours: parseFloat(form.category_hours) || 0,
        staff_members: form.staff_members || [],
        monthly_sessions: parseInt(form.monthly_sessions, 10) || 0,
        monthly_simulator_hours: parseFloat(form.monthly_simulator_hours) || 0,
        monthly_category_hours: parseFloat(form.monthly_category_hours) || 0,
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

    // ── Quick Coach Assignment modal state ───────────────────────────────────
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignStaffId, setAssignStaffId] = useState('');
    const [assignSelectedPkgs, setAssignSelectedPkgs] = useState([]);
    const [assignSaving, setAssignSaving] = useState(false);
    const [assignError, setAssignError] = useState('');
    const [assignStaffSearch, setAssignStaffSearch] = useState('');
    const [assignPkgSearch, setAssignPkgSearch] = useState('');
    const [assignCatFilter, setAssignCatFilter] = useState('');
    const assignModalRef = useRef(null);

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
                is_membership: item.is_membership || false,
                monthly_hours: item.monthly_hours ?? 0,
                hide_price_on_card: item.hide_price_on_card || false,
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
                category_hours: item.category_hours ?? 0,
                staff_members: staffIds,
                redirect_url: item.redirect_url || '',
                is_active: item.is_active !== undefined ? item.is_active : true,
                is_tpi_assessment: item.is_tpi_assessment || false,
                is_membership: item.is_membership || false,
                monthly_sessions: item.monthly_sessions ?? 0,
                monthly_simulator_hours: item.monthly_simulator_hours ?? 0,
                monthly_category_hours: item.monthly_category_hours ?? 0,
                hide_price_on_card: item.hide_price_on_card || false,
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
                hide_price_on_card: prev.hide_price_on_card,
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

    // ── Quick Coach Assignment helpers ────────────────────────────────────────

    /** All coaching packages (session-based) — these are the ones that can have staff assigned. */
    const assignablePackages = useMemo(
        () => coachingPkgs.filter((p) => p._kind === 'coaching'),
        [coachingPkgs]
    );

    const filteredAssignablePackages = useMemo(() => {
        return assignablePackages.filter(p => {
            if (assignCatFilter && p.service_category !== Number(assignCatFilter) && p.service_category_id !== Number(assignCatFilter)) return false;
            if (assignPkgSearch) {
                const q = assignPkgSearch.toLowerCase();
                if (!p.title.toLowerCase().includes(q) && !(p.service_category_name || '').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [assignablePackages, assignCatFilter, assignPkgSearch]);

    const filteredStaffForAssign = useMemo(() => {
        if (!assignStaffSearch) return staff;
        const lower = assignStaffSearch.toLowerCase();
        return staff.filter(s => 
            s.first_name?.toLowerCase().includes(lower) || 
            s.last_name?.toLowerCase().includes(lower) || 
            s.email?.toLowerCase().includes(lower)
        );
    }, [staff, assignStaffSearch]);

    function openAssignModal() {
        setAssignStaffId('');
        setAssignSelectedPkgs([]);
        setAssignError('');
        setAssignStaffSearch('');
        setAssignPkgSearch('');
        setAssignCatFilter('');
        setAssignModalOpen(true);
    }

    function closeAssignModal() {
        setAssignModalOpen(false);
        setAssignError('');
    }

    /** When a staff is picked, pre-select packages NOT already assigned to that coach. */
    function handleAssignStaffChange(staffId) {
        setAssignStaffId(staffId);
        if (!staffId) {
            setAssignSelectedPkgs([]);
            return;
        }
        const sid = Number(staffId);
        // Pre-select packages that do NOT yet have this staff member assigned
        const toSelect = assignablePackages
            .filter((p) => {
                const ids = (p.staff_members_details || p.staff_members || []).map((s) =>
                    typeof s === 'object' ? s.id : s
                );
                return !ids.includes(sid);
            })
            .map((p) => p.id);
        setAssignSelectedPkgs(toSelect);
    }

    function toggleAssignPkg(pkgId) {
        setAssignSelectedPkgs((prev) =>
            prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
        );
    }

    function handleSelectAllAssign() {
        let visibleIds = filteredAssignablePackages.map(p => p.id);
        
        if (assignStaffId) {
            const sid = Number(assignStaffId);
            visibleIds = filteredAssignablePackages.filter(p => {
                const ids = (p.staff_members_details || p.staff_members || []).map((s) => typeof s === 'object' ? s.id : s);
                return !ids.includes(sid);
            }).map(p => p.id);
        }

        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => assignSelectedPkgs.includes(id));
        
        if (allVisibleSelected) {
            setAssignSelectedPkgs(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setAssignSelectedPkgs(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    }

    async function handleAssignSave() {
        if (!assignStaffId) {
            setAssignError('Please select a coach / staff member.');
            return;
        }
        if (assignSelectedPkgs.length === 0) {
            setAssignError('Please select at least one package.');
            return;
        }
        setAssignError('');
        setAssignSaving(true);
        const sid = Number(assignStaffId);
        try {
            await Promise.all(
                assignSelectedPkgs.map((pkgId) => {
                    const pkg = assignablePackages.find((p) => p.id === pkgId);
                    const existingIds = (pkg?.staff_members_details || pkg?.staff_members || []).map((s) =>
                        typeof s === 'object' ? s.id : s
                    );
                    const newIds = Array.from(new Set([...existingIds, sid]));
                    return apiClient.patch(endpoints.admin.packages.detail(pkgId), {
                        staff_members: newIds,
                    });
                })
            );
            showSuccess(`Coach assigned to ${assignSelectedPkgs.length} package${assignSelectedPkgs.length !== 1 ? 's' : ''} successfully.`);
            closeAssignModal();
            await loadAll();
        } catch (err) {
            const detail = err?.response?.data;
            if (typeof detail === 'string') setAssignError(detail);
            else if (detail && typeof detail === 'object')
                setAssignError(Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '));
            else setAssignError('Failed to assign coach. Please try again.');
        } finally {
            setAssignSaving(false);
        }
    }

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
        if ((item.simulator_hours > 0) || (item.category_hours > 0)) return <Badge status="no_show">Combo</Badge>;
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
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Coach Assignment */}
                    <button
                        id="quick-assign-coach-btn"
                        onClick={openAssignModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-button border border-primary text-primary bg-primary/5 hover:bg-primary/15 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Quickly assign a coach to multiple coaching packages at once"
                    >
                        <UserPlus className="w-4 h-4" />
                        Assign Coach to Packages
                    </button>
                    <Button onClick={openCreate} variant="primary" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Package
                    </Button>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="bg-surface rounded-card shadow-card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <input
                    type="search"
                    placeholder="Search packages…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:flex-[2] rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <select
                    value={filterCatId}
                    onChange={(e) => setFilterCatId(e.target.value)}
                    className="w-full md:flex-1 rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                    className="w-full md:flex-1 rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                                            <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate flex items-center gap-2">
                                                <span className="truncate">{item.title}</span>
                                                {item.is_membership && (
                                                    <Badge status="info" className="py-0 px-1.5 text-[10px] flex-shrink-0">
                                                        Membership
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-text-secondary text-xs">
                                                {item.service_category_name || '—'}
                                            </td>
                                            <td className="px-4 py-3">{kindBadge(item)}</td>
                                            <td className="px-4 py-3 text-text-secondary">${item.price}</td>
                                            <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                                                {item._kind === 'simulator' ? (
                                                    `${item.is_membership ? item.monthly_hours : item.hours} hrs${item.is_membership ? '/mo' : ''}`
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <div>
                                                            {item.is_membership ? item.monthly_sessions : item.session_count} sessions{item.is_membership ? '/mo' : ''} × {item.session_duration_minutes} min
                                                        </div>
                                                        {((item.is_membership && parseFloat(item.monthly_simulator_hours) > 0) || (!item.is_membership && parseFloat(item.simulator_hours) > 0)) && (
                                                            <div className="text-accent font-medium">
                                                                + {item.is_membership ? item.monthly_simulator_hours : item.simulator_hours} sim hrs{item.is_membership ? '/mo' : ''}
                                                            </div>
                                                        )}
                                                        {((item.is_membership && parseFloat(item.monthly_category_hours) > 0) || (!item.is_membership && parseFloat(item.category_hours) > 0)) && (
                                                            <div className="text-warning font-medium">
                                                                + {item.is_membership ? item.monthly_category_hours : item.category_hours} cat hrs{item.is_membership ? '/mo' : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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

                            {/* ── Membership Toggle ── */}
                            <div className="flex items-center p-3 border border-primary/20 bg-primary/5 rounded-button mb-4">
                                <input
                                    type="checkbox"
                                    id="is_membership"
                                    checked={formData.is_membership}
                                    onChange={(e) => setFormData((p) => ({ ...p, is_membership: e.target.checked }))}
                                    className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                                />
                                <div className="ml-3">
                                    <label htmlFor="is_membership" className="text-sm font-bold text-primary cursor-pointer">
                                        Make this a Monthly Membership
                                    </label>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        Clients will be billed monthly via Square. Sessions/hours reset each billing cycle.
                                    </p>
                                </div>
                            </div>

                            {/* ══ SESSION-BASED FIELDS ══════════════════════════════════════════════ */}
                            {!isHoursBased(selectedCategory) && selectedCategory && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FieldRow label={formData.is_membership ? "Monthly Sessions Included *" : "Initial Sessions Included *"}>
                                            <TextInput
                                                type="number"
                                                min={formData.is_membership ? "0" : "1"}
                                                required
                                                value={formData.is_membership ? formData.monthly_sessions : formData.session_count}
                                                onChange={(e) =>
                                                    setFormData((p) => (formData.is_membership ? { ...p, monthly_sessions: e.target.value } : { ...p, session_count: e.target.value }))
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
                                            label={formData.is_membership ? "Monthly Simulator Hours Included" : "Initial Simulator Hours Included"}
                                            hint="Set > 0 to create a Combo package that also includes simulator hours."
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={formData.is_membership ? formData.monthly_simulator_hours : formData.simulator_hours}
                                                onChange={(e) =>
                                                    setFormData((p) => (formData.is_membership ? { ...p, monthly_simulator_hours: e.target.value } : { ...p, simulator_hours: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                    )}

                                    {/* Category asset hours (combo — only for dynamic categories) */}
                                    {selectedCategory && !selectedCategory.legacy_booking_type && (
                                        <FieldRow
                                            label={formData.is_membership ? "Monthly Category Asset Hours Included" : "Initial Category Asset Hours Included"}
                                            hint="Set > 0 to include asset-booking hours (e.g. table time). Users can redeem these for asset-only bookings in this category. Creates a Combo package."
                                        >
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={formData.is_membership ? formData.monthly_category_hours : formData.category_hours}
                                                onChange={(e) =>
                                                    setFormData((p) => (formData.is_membership ? { ...p, monthly_category_hours: e.target.value } : { ...p, category_hours: e.target.value }))
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
                                        <FieldRow label={formData.is_membership ? "Monthly Hours *" : "Total Hours *"}>
                                            <TextInput
                                                type="number"
                                                min="0.5"
                                                step="0.5"
                                                required
                                                value={formData.is_membership ? formData.monthly_hours : formData.hours}
                                                onChange={(e) =>
                                                    setFormData((p) => (formData.is_membership ? { ...p, monthly_hours: e.target.value } : { ...p, hours: e.target.value }))
                                                }
                                            />
                                        </FieldRow>
                                        {!formData.is_membership && (
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
                                        )}
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

                            {/* Hide Price on Card */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.hide_price_on_card}
                                    onChange={(e) => setFormData((p) => ({ ...p, hide_price_on_card: e.target.checked }))}
                                    className="w-4 h-4 rounded border-border text-primary"
                                />
                                <span className="text-sm text-text-primary font-medium">Hide Price on Card</span>
                                <span className="text-xs text-text-secondary">(shows 'Price on select' instead of amount on main cards)</span>
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

            {/* ── Quick Coach Assignment Modal ── */}
            {assignModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)' }}
                    onClick={closeAssignModal}
                >
                    <div
                        ref={assignModalRef}
                        className="bg-surface rounded-card shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10 rounded-t-card">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">Assign Coach to Packages</h3>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        Select a coach and the coaching packages to assign them to — all at once.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeAssignModal}
                                className="text-text-secondary hover:text-text-primary transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* Staff / Coach picker */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-text-primary">
                                    Select Coach / Staff Member <span className="text-error">*</span>
                                </label>
                                <p className="text-xs text-text-secondary">
                                    After selecting a coach, packages they are not yet assigned to will be pre-selected below.
                                </p>
                                <div className="flex flex-col md:flex-row gap-2 items-start mt-1 relative">
                                    <div className="relative w-full md:flex-1">
                                        <input
                                            type="search"
                                            placeholder="Search staff..."
                                            value={assignStaffSearch}
                                            onChange={(e) => setAssignStaffSearch(e.target.value)}
                                            className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                        {assignStaffSearch && filteredStaffForAssign.length > 0 && (
                                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-button shadow-lg max-h-48 overflow-y-auto">
                                                {filteredStaffForAssign.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleAssignStaffChange(s.id.toString());
                                                            setAssignStaffSearch('');
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-background transition-colors text-text-primary border-b border-border last:border-0"
                                                    >
                                                        <span className="font-medium">{s.first_name} {s.last_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {assignStaffSearch && filteredStaffForAssign.length === 0 && (
                                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-button shadow-lg p-3 text-sm text-text-secondary text-center">
                                                No coaches found.
                                            </div>
                                        )}
                                    </div>
                                    <select
                                        id="assign-coach-select"
                                        value={assignStaffId}
                                        onChange={(e) => {
                                            handleAssignStaffChange(e.target.value);
                                            setAssignStaffSearch('');
                                        }}
                                        className="w-full md:w-auto md:flex-[2] rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    >
                                        <option value="">— Select a coach —</option>
                                        {staff.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Package Filters */}
                            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                                <input
                                    type="search"
                                    placeholder="Search packages..."
                                    value={assignPkgSearch}
                                    onChange={(e) => setAssignPkgSearch(e.target.value)}
                                    className="w-full md:flex-[2] rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                                <select
                                    value={assignCatFilter}
                                    onChange={(e) => setAssignCatFilter(e.target.value)}
                                    className="w-full md:flex-1 rounded-button border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="">All categories</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Package list */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-text-primary">
                                        Coaching Packages
                                        <span className="ml-2 text-xs font-normal text-text-secondary">
                                            ({assignSelectedPkgs.length} selected, {filteredAssignablePackages.length} shown)
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        id="select-all-assign-btn"
                                        onClick={handleSelectAllAssign}
                                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-light transition-colors px-2 py-1 rounded hover:bg-primary/5"
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        Toggle All Visible
                                    </button>
                                </div>

                                {filteredAssignablePackages.length === 0 ? (
                                    <div className="text-center py-8 text-text-secondary text-sm">
                                        No coaching packages match your filters.
                                    </div>
                                ) : (
                                    <div className="border border-border rounded-card overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                                        {[...filteredAssignablePackages]
                                            .sort((a, b) => {
                                                const sid = Number(assignStaffId);
                                                if (!sid) return 0;
                                                const aIds = (a.staff_members_details || a.staff_members || []).map((s) => typeof s === 'object' ? s.id : s);
                                                const bIds = (b.staff_members_details || b.staff_members || []).map((s) => typeof s === 'object' ? s.id : s);
                                                const aAssigned = aIds.includes(sid);
                                                const bAssigned = bIds.includes(sid);
                                                if (aAssigned === bAssigned) return 0;
                                                return aAssigned ? 1 : -1;
                                            })
                                            .map((pkg) => {
                                            const isChecked = assignSelectedPkgs.includes(pkg.id);
                                            const currentStaffIds = (pkg.staff_members_details || pkg.staff_members || []).map((s) =>
                                                typeof s === 'object' ? s.id : s
                                            );
                                            const selectedStaff = staff.find((s) => s.id === Number(assignStaffId));
                                            const alreadyAssigned = selectedStaff && currentStaffIds.includes(selectedStaff.id);

                                            return (
                                                <label
                                                    key={pkg.id}
                                                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                                                        alreadyAssigned
                                                            ? 'bg-surface opacity-75 cursor-default'
                                                            : isChecked
                                                                ? 'bg-primary/5 hover:bg-primary/10 cursor-pointer'
                                                                : 'bg-surface hover:bg-background cursor-pointer'
                                                    }`}
                                                >
                                                    {!alreadyAssigned ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleAssignPkg(pkg.id)}
                                                            className="w-4 h-4 rounded border-border text-primary mt-0.5 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-medium text-text-primary truncate">
                                                                {pkg.title}
                                                            </span>
                                                            {pkg.is_membership && (
                                                                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                    Membership
                                                                </span>
                                                            )}
                                                            {alreadyAssigned && (
                                                                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                    Already assigned
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-text-secondary">
                                                            ${pkg.price} &bull;
                                                            {pkg.is_membership
                                                                ? ` ${pkg.monthly_sessions} sessions/mo`
                                                                : ` ${pkg.session_count} sessions`}
                                                            {pkg.service_category_name ? ` · ${pkg.service_category_name}` : ''}
                                                        </div>
                                                        {currentStaffIds.length > 0 && (
                                                            <div className="mt-1 text-xs text-text-secondary">
                                                                Currently assigned:
                                                                {(pkg.staff_members_details || []).slice(0, 3).map((s, i) => (
                                                                    <span key={typeof s === 'object' ? s.id : s} className="ml-1 font-medium text-text-primary">
                                                                        {typeof s === 'object' ? `${s.first_name} ${s.last_name}` : `#${s}`}{i < Math.min((pkg.staff_members_details || []).length, 3) - 1 ? ',' : ''}
                                                                    </span>
                                                                ))}
                                                                {(pkg.staff_members_details || []).length > 3 && (
                                                                    <span className="ml-1 text-text-secondary">+{(pkg.staff_members_details || []).length - 3} more</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Error */}
                            {assignError && (
                                <div className="rounded-button bg-error/10 border border-error/20 px-3 py-2 text-sm text-error flex items-center gap-2">
                                    <X className="w-4 h-4 flex-shrink-0" />
                                    {assignError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border px-6 py-4 flex gap-3 bg-surface rounded-b-card flex-shrink-0">
                            <Button
                                type="button"
                                variant="primary"
                                disabled={assignSaving || !assignStaffId || assignSelectedPkgs.length === 0}
                                onClick={handleAssignSave}
                                className="flex-1"
                            >
                                {assignSaving
                                    ? 'Assigning…'
                                    : `Assign to ${assignSelectedPkgs.length} Package${assignSelectedPkgs.length !== 1 ? 's' : ''}`}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={closeAssignModal}
                                className="flex-shrink-0"
                            >
                                Cancel
                            </Button>
                        </div>
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
