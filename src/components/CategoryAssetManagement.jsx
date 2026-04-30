/**
 * CategoryAssetManagement
 *
 * Admin page for managing the physical assets of a single ServiceCategory.
 * URL: /admin/categories/:categoryId/assets
 *
 * Availability scheduling UI is intentionally identical to SimulatorAvailability
 * (inline table + "Add Availability" panel — no custom modal).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Edit, Trash2, Power, PowerOff, Clock } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

const DAY_LABEL = Object.fromEntries(DAYS_OF_WEEK.map(d => [d.value, d.label]));

const emptyAssetForm = () => ({
    name: '',
    price_per_hour: '',
    needs_staff: false,
    description: '',
});

const emptyAvailForm = () => ({
    day_of_week: '',
    start_time: '09:00',
    end_time: '17:00',
});

// ─── Availability modal (SimulatorAvailability pattern inside a modal) ───────

function AssetAvailabilityModal({ asset, onClose }) {
    const { popup, openPopup, closePopup } = usePopup();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAvail, setNewAvail] = useState(emptyAvailForm());

    const load = useCallback(() => {
        setLoading(true);
        apiClient.get(endpoints.categories.assets.availability(asset.id))
            .then(r => {
                const rows = (r.data || []).map(w => ({
                    ...w,
                    start_time: w.start_time?.length > 5 ? w.start_time.slice(0, 5) : (w.start_time || '09:00'),
                    end_time: w.end_time?.length > 5 ? w.end_time.slice(0, 5) : (w.end_time || '17:00'),
                }));
                setSchedule(rows);
            })
            .catch(() => setSchedule([]))
            .finally(() => setLoading(false));
    }, [asset.id]);

    useEffect(() => { load(); }, [load]);

    const sorted = [...schedule].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return (a.start_time || '').localeCompare(b.start_time || '');
    });

    // Inline save helper — sends the full updated list to the backend
    const save = async (updatedList) => {
        setSaving(true);
        try {
            const res = await apiClient.put(
                endpoints.categories.assets.availability(asset.id),
                updatedList,
            );
            const rows = (res.data || []).map(w => ({
                ...w,
                start_time: w.start_time?.length > 5 ? w.start_time.slice(0, 5) : (w.start_time || '09:00'),
                end_time: w.end_time?.length > 5 ? w.end_time.slice(0, 5) : (w.end_time || '17:00'),
            }));
            setSchedule(rows);
        } catch {
            // revert on error
            load();
        } finally {
            setSaving(false);
        }
    };

    const handleAdd = () => {
        if (newAvail.day_of_week === '') {
            openPopup({
                type: 'warning',
                title: 'Select a day',
                message: 'Please choose a day of the week before adding availability.',
            });
            return;
        }
        const exists = schedule.some(
            w => w.day_of_week === parseInt(newAvail.day_of_week) && w.start_time === newAvail.start_time,
        );
        if (exists) {
            openPopup({
                type: 'warning',
                title: 'Slot already exists',
                message: 'This day and start time already exists. Choose a different time.',
            });
            return;
        }
        const updated = [
            ...schedule,
            { day_of_week: parseInt(newAvail.day_of_week), start_time: newAvail.start_time, end_time: newAvail.end_time },
        ];
        save(updated);
        setNewAvail(emptyAvailForm());
        setShowAddForm(false);
    };

    const handleUpdate = (id, field, value) => {
        const updated = schedule.map(w =>
            w.id === id ? { ...w, [field]: field === 'day_of_week' ? parseInt(value) : value } : w,
        );
        setSchedule(updated);   // optimistic local update
        save(updated);
    };

    const handleDelete = (avail) => {
        openPopup({
            type: 'warning',
            title: 'Delete availability?',
            message: 'This will remove the selected time window for this asset.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                const updated = schedule.filter(w => w.id !== avail.id);
                await save(updated);
            },
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Weekly Recurring Availability
                        </h2>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{asset.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Time windows repeat every week. Slots are generated in 30-minute intervals within each window.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition p-1"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="mt-4">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Availability
                    </button>
                </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6">

            {/* Add Availability Form */}
            {showAddForm && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Weekly Availability</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
                            <select
                                value={newAvail.day_of_week}
                                onChange={e => setNewAvail(p => ({ ...p, day_of_week: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                            >
                                <option value="">Select day</option>
                                {DAYS_OF_WEEK.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                            <input
                                type="time"
                                value={newAvail.start_time}
                                onChange={e => setNewAvail(p => ({ ...p, start_time: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                            <input
                                type="time"
                                value={newAvail.end_time}
                                onChange={e => setNewAvail(p => ({ ...p, end_time: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleAdd}
                                disabled={saving}
                                className="flex-1 bg-primary hover:bg-primary-light disabled:bg-primary/50 text-white font-semibold py-2 px-4 rounded-lg transition"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setNewAvail(emptyAvailForm()); }}
                                className="flex-1 bg-white border border-primary text-primary hover:bg-primary/10 font-semibold py-2 px-4 rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Availability Table */}
            {loading ? (
                <TableSkeleton rows={4} cols={4} />
            ) : sorted.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-4">
                        No availability set yet. Add time windows that will repeat every week.
                    </p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                        <Plus className="w-5 h-5" />
                        Add First Availability
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Day of Week', 'Start Time', 'End Time', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sorted.map(avail => (
                                <tr key={avail.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <select
                                            value={avail.day_of_week}
                                            onChange={e => handleUpdate(avail.id, 'day_of_week', e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                        >
                                            {DAYS_OF_WEEK.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <input
                                            type="time"
                                            value={avail.start_time || '09:00'}
                                            onChange={e => handleUpdate(avail.id, 'start_time', e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <input
                                            type="time"
                                            value={avail.end_time || '17:00'}
                                            onChange={e => handleUpdate(avail.id, 'end_time', e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleDelete(avail)}
                                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            <span className="text-sm">Delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            </div> {/* end scrollable body */}
            </div> {/* end modal card */}

            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => { const fn = popup.onConfirm; closePopup(); if (fn) await fn(); } : closePopup}
                onClose={closePopup}
            />
        </div>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function CategoryAssetManagement() {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const [category, setCategory] = useState(null);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add single-asset inline form
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState(emptyAssetForm());
    const [addSubmitting, setAddSubmitting] = useState(false);

    // Edit asset
    const [editingAsset, setEditingAsset] = useState(null);
    const [editForm, setEditForm] = useState(emptyAssetForm());
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Availability modal
    const [availAsset, setAvailAsset] = useState(null);

    const loadAssets = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, assetsRes] = await Promise.all([
                apiClient.get(endpoints.categories.admin.detail(categoryId)),
                apiClient.get(endpoints.categories.assets.list(categoryId)),
            ]);
            setCategory(catRes.data);
            setAssets(assetsRes.data || []);
        } catch {
            showError('Failed to load assets.');
        } finally {
            setLoading(false);
        }
    }, [categoryId, showError]);

    useEffect(() => { loadAssets(); }, [loadAssets]);

    // ── Add asset ────────────────────────────────────────────────────────── //
    const handleAddSave = async () => {
        if (!addForm.name.trim()) { showError('Name is required.'); return; }
        setAddSubmitting(true);
        try {
            await apiClient.post(endpoints.categories.assets.create, {
                category: categoryId,
                name: addForm.name.trim(),
                price_per_hour: addForm.price_per_hour || null,
                needs_staff: addForm.needs_staff,
                description: addForm.description,
            });
            showSuccess('Asset added.');
            setAddForm(emptyAssetForm());
            setShowAddForm(false);
            loadAssets();
        } catch {
            showError('Failed to add asset.');
        } finally {
            setAddSubmitting(false);
        }
    };

    // ── Edit asset ───────────────────────────────────────────────────────── //
    const handleEditOpen = (asset) => {
        setEditingAsset(asset);
        setEditForm({
            name: asset.name,
            price_per_hour: asset.price_per_hour ?? '',
            needs_staff: asset.needs_staff,
            description: asset.description || '',
        });
    };

    const handleEditSave = async () => {
        if (!editForm.name.trim()) { showError('Name is required.'); return; }
        setEditSubmitting(true);
        try {
            await apiClient.patch(endpoints.categories.assets.detail(editingAsset.id), {
                name: editForm.name.trim(),
                price_per_hour: editForm.price_per_hour || null,
                needs_staff: editForm.needs_staff,
                description: editForm.description,
            });
            showSuccess('Asset updated.');
            setEditingAsset(null);
            loadAssets();
        } catch {
            showError('Failed to update asset.');
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Toggle / Delete ──────────────────────────────────────────────────── //
    const handleToggle = async (asset) => {
        try {
            await apiClient.patch(endpoints.categories.assets.toggleActive(asset.id));
            loadAssets();
        } catch {
            showError('Failed to toggle asset status.');
        }
    };

    const handleDelete = (asset) => {
        openPopup({
            type: 'warning',
            title: 'Delete Asset?',
            message: `"${asset.name}" will be permanently deleted. Existing bookings for this asset will keep their records.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(endpoints.categories.assets.detail(asset.id));
                    showSuccess('Asset deleted.');
                    if (availAsset?.id === asset.id) setAvailAsset(null);
                    loadAssets();
                } catch {
                    showError('Failed to delete asset.');
                }
            },
        });
    };

    // ─────────────────────────────────────────────────────────────────────── //

    return (
        <div>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/categories')}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Categories</span>
                    </button>
                </div>
                <div className="mt-3">
                    <h2 className="text-xl font-bold text-gray-900">
                        {category ? `Assets — ${category.name}` : 'Loading…'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage the bookable physical assets for this category.
                    </p>
                </div>
            </div>

            {/* Assets list + add form */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Assets</h3>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
                        >
                            <Plus className="w-4 h-4" />
                            Add Asset
                        </button>
                    )}
                </div>

                {/* Inline add form */}
                {showAddForm && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">New Asset</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                                <input
                                    type="text"
                                    value={addForm.name}
                                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Table Tennis Table 1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Price / Hour ($)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={addForm.price_per_hour}
                                    onChange={e => setAddForm(f => ({ ...f, price_per_hour: e.target.value }))}
                                    placeholder="e.g. 25.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={addForm.description}
                                    onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-2 cursor-pointer mt-0 md:mt-6">
                                    <input
                                        type="checkbox"
                                        checked={addForm.needs_staff}
                                        onChange={e => setAddForm(f => ({ ...f, needs_staff: e.target.checked }))}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">Needs Staff</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <button
                                onClick={handleAddSave}
                                disabled={addSubmitting}
                                className="bg-primary hover:bg-primary-light disabled:bg-primary/50 text-white font-semibold py-2 px-5 rounded-lg text-sm transition"
                            >
                                {addSubmitting ? 'Saving…' : 'Save Asset'}
                            </button>
                            <button
                                onClick={() => { setShowAddForm(false); setAddForm(emptyAssetForm()); }}
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-5 rounded-lg text-sm transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Asset table */}
                {loading ? (
                    <TableSkeleton rows={4} cols={5} />
                ) : assets.length === 0 && !showAddForm ? (
                    <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        No assets yet. Click <strong>Add Asset</strong> above to create the first one.
                    </div>
                ) : assets.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Name', 'Price/hr', 'Type', 'Status', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {assets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-gray-900 text-sm">{asset.name}</div>
                                            {asset.description && <div className="text-xs text-gray-500 mt-0.5">{asset.description}</div>}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700">
                                            {asset.price_per_hour ? `$${parseFloat(asset.price_per_hour).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {asset.needs_staff ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Needs Staff</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">Asset Only</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${asset.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {asset.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {/* Availability — only for asset-only assets */}
                                                {!asset.needs_staff && (
                                                    <button
                                                        onClick={() => setAvailAsset(asset)}
                                                        title="Manage Schedule"
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition"
                                                    >
                                                        <Clock className="w-4 h-4" /> Set Schedule
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditOpen(asset)} title="Edit" className="text-gray-500 hover:text-blue-600 transition">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleToggle(asset)} title={asset.is_active ? 'Deactivate' : 'Activate'} className="text-gray-500 hover:text-yellow-600 transition">
                                                    {asset.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => handleDelete(asset)} title="Delete" className="text-gray-500 hover:text-red-600 transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            {/* Availability modal */}
            {availAsset && (
                <AssetAvailabilityModal
                    key={availAsset.id}
                    asset={availAsset}
                    onClose={() => { setAvailAsset(null); loadAssets(); }}
                />
            )}

            {/* Edit modal */}
            {editingAsset && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">Edit Asset</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Hour ($)</label>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={editForm.price_per_hour}
                                    onChange={e => setEditForm(f => ({ ...f, price_per_hour: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editForm.needs_staff}
                                    onChange={e => setEditForm(f => ({ ...f, needs_staff: e.target.checked }))}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Needs Staff (availability driven by staff schedule)</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingAsset(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={editSubmitting}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium"
                            >
                                {editSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => { const fn = popup.onConfirm; closePopup(); if (fn) await fn(); } : closePopup}
                onClose={closePopup}
            />
            {toast && <Toast {...toast} onClose={hideToast} />}
        </div>
    );
}

export default CategoryAssetManagement;
