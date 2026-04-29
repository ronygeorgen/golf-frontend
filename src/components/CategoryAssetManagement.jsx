/**
 * CategoryAssetManagement
 *
 * Admin page for managing the physical assets of a single ServiceCategory.
 *
 * URL: /admin/categories/:categoryId/assets
 *
 * Features:
 *   • Lists all assets for the category with name, price, needs_staff, status
 *   • "Add Assets" flow: specify a count N → N inline forms appear
 *   • Edit / Toggle active / Delete per asset row
 *   • Per-asset availability scheduling (weekly recurring, Mon–Sun)
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

const emptyAssetForm = () => ({ name: '', price_per_hour: '', needs_staff: false, description: '' });

function AvailabilityModal({ asset, onClose }) {
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast, showSuccess, showError, hideToast } = useToast();

    useEffect(() => {
        apiClient.get(endpoints.categories.assets.availability(asset.id))
            .then(r => setSchedule(r.data || []))
            .catch(() => setSchedule([]))
            .finally(() => setLoading(false));
    }, [asset.id]);

    const addWindow = () => {
        setSchedule(prev => [...prev, { day_of_week: 0, start_time: '09:00', end_time: '17:00' }]);
    };

    const removeWindow = (idx) => {
        setSchedule(prev => {
            const updated = [...prev];
            if (updated[idx].id) {
                updated[idx] = { ...updated[idx], deleted: true };
            } else {
                updated.splice(idx, 1);
            }
            return updated;
        });
    };

    const updateWindow = (idx, field, value) => {
        setSchedule(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put(endpoints.categories.assets.availability(asset.id), schedule);
            showSuccess('Availability saved.');
            setTimeout(onClose, 1200);
        } catch {
            showError('Failed to save availability.');
        } finally {
            setSaving(false);
        }
    };

    const visible = schedule.filter(w => !w.deleted);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        Availability — {asset.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Set the weekly recurring time windows during which this asset is bookable.
                    </p>
                </div>
                <div className="p-6">
                    {loading ? (
                        <TableSkeleton rows={3} cols={3} />
                    ) : (
                        <>
                            {visible.length === 0 && (
                                <p className="text-center text-gray-400 py-6">No schedule set — this asset is currently not bookable. Add a window below.</p>
                            )}
                            <div className="space-y-3">
                                {schedule.map((w, idx) => w.deleted ? null : (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <select
                                            value={w.day_of_week}
                                            onChange={e => updateWindow(idx, 'day_of_week', parseInt(e.target.value))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        >
                                            {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                        </select>
                                        <input
                                            type="time"
                                            value={w.start_time}
                                            onChange={e => updateWindow(idx, 'start_time', e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <span className="text-gray-400">–</span>
                                        <input
                                            type="time"
                                            value={w.end_time}
                                            onChange={e => updateWindow(idx, 'end_time', e.target.value)}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button onClick={() => removeWindow(idx)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={addWindow}
                                className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" /> Add Time Window
                            </button>
                        </>
                    )}
                </div>
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                        {saving ? 'Saving…' : 'Save Schedule'}
                    </button>
                </div>
            </div>
            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}

function CategoryAssetManagement() {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();

    const [category, setCategory] = useState(null);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add-many flow
    const [addCount, setAddCount] = useState('');
    const [addForms, setAddForms] = useState([]);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Edit single asset
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

    // Build N empty forms when count changes
    const handleCountSubmit = () => {
        const n = parseInt(addCount);
        if (!n || n < 1 || n > 20) {
            showError('Enter a number between 1 and 20.');
            return;
        }
        setAddForms(Array.from({ length: n }, emptyAssetForm));
        setShowAddPanel(true);
    };

    const updateAddForm = (idx, field, value) => {
        setAddForms(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
    };

    const handleBulkSave = async () => {
        if (addForms.some(f => !f.name.trim())) {
            showError('All assets must have a name.');
            return;
        }
        setSubmitting(true);
        try {
            await Promise.all(addForms.map(f =>
                apiClient.post(endpoints.categories.assets.create, {
                    category: categoryId,
                    name: f.name.trim(),
                    price_per_hour: f.price_per_hour || null,
                    needs_staff: f.needs_staff,
                    description: f.description,
                })
            ));
            showSuccess(`${addForms.length} asset(s) created.`);
            setShowAddPanel(false);
            setAddForms([]);
            setAddCount('');
            loadAssets();
        } catch {
            showError('Failed to save assets.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditOpen = (asset) => {
        setEditingAsset(asset);
        setEditForm({
            name: asset.name,
            price_per_hour: asset.price_per_hour ?? '',
            needs_staff: asset.needs_staff,
            description: asset.description,
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
            message: `"${asset.name}" will be permanently deleted. Any existing bookings for this asset will keep their records.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await apiClient.delete(endpoints.categories.assets.detail(asset.id));
                    showSuccess('Asset deleted.');
                    loadAssets();
                } catch {
                    showError('Failed to delete asset.');
                }
            },
        });
    };

    return (
        <div>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/categories')}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        title="Back to Categories"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {category ? `Assets — ${category.name}` : 'Loading…'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Manage the bookable physical assets for this category.
                        </p>
                    </div>
                </div>
            </div>

            {/* Add assets panel */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                <h3 className="text-base font-semibold text-gray-800 mb-3">Add New Assets</h3>
                {!showAddPanel ? (
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600">How many assets to add?</label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={addCount}
                            onChange={e => setAddCount(e.target.value)}
                            placeholder="e.g. 3"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                            onClick={handleCountSubmit}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition"
                        >
                            <Plus className="w-4 h-4" /> Set Up Forms
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="space-y-3">
                            {addForms.map((f, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Asset {idx + 1} Name *</label>
                                        <input
                                            type="text"
                                            value={f.name}
                                            onChange={e => updateAddForm(idx, 'name', e.target.value)}
                                            placeholder="e.g. Table Tennis Table 1"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Price / Hour ($)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={f.price_per_hour}
                                            onChange={e => updateAddForm(idx, 'price_per_hour', e.target.value)}
                                            placeholder="e.g. 25.00"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={f.description}
                                            onChange={e => updateAddForm(idx, 'description', e.target.value)}
                                            placeholder="Optional"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-2 cursor-pointer mt-4">
                                            <input
                                                type="checkbox"
                                                checked={f.needs_staff}
                                                onChange={e => updateAddForm(idx, 'needs_staff', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="text-sm text-gray-700">Needs Staff</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <button
                                onClick={handleBulkSave}
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-5 rounded-lg text-sm transition"
                            >
                                {submitting ? 'Saving…' : `Save ${addForms.length} Asset(s)`}
                            </button>
                            <button
                                onClick={() => { setShowAddPanel(false); setAddForms([]); setAddCount(''); }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-5 rounded-lg text-sm transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Assets table */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Current Assets</h3>
                {loading ? (
                    <TableSkeleton rows={4} cols={5} />
                ) : assets.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        No assets yet. Add some above.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Name', 'Price/hr', 'Type', 'Schedule', 'Status', 'Actions'].map(h => (
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
                                            {!asset.needs_staff ? (
                                                <button
                                                    onClick={() => setAvailAsset(asset)}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                    {asset.availabilities?.length > 0 ? `${asset.availabilities.length} window(s)` : 'Set schedule'}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">Via staff availability</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${asset.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {asset.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
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
                )}
            </div>

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
                                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price / Hour ($)</label>
                                <input type="number" min={0} step={0.01} value={editForm.price_per_hour} onChange={e => setEditForm(f => ({ ...f, price_per_hour: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input type="text" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editForm.needs_staff} onChange={e => setEditForm(f => ({ ...f, needs_staff: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700">Needs Staff (availability driven by staff schedule)</span>
                            </label>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button onClick={() => setEditingAsset(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
                            <button onClick={handleEditSave} disabled={editSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium">
                                {editSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Availability modal */}
            {availAsset && <AvailabilityModal asset={availAsset} onClose={() => { setAvailAsset(null); loadAssets(); }} />}

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
            <Toast toast={toast} onClose={hideToast} />
        </div>
    );
}

export default CategoryAssetManagement;
