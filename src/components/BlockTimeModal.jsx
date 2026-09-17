import React, { useEffect, useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import Button from './ui/Button';
import DateInput from './ui/DateInput';

const REFUND_LABELS = {
    session: 'Refund 1 session',
    category_hours: 'Refund category hours',
    simulator_hours: 'Refund sim hours',
    simulator_credit_restore: 'Restore sim credit',
    simulator_credit_issue: 'Issue sim credit',
    none: 'No package refund',
};

/**
 * Admin calendar "Block time" modal — staff, simulator bay, or category asset.
 * Step 1: choose resource/time → preview affected bookings
 * Step 2: confirm → create block + cancel + email
 */
export default function BlockTimeModal({ isOpen, onClose, onSaved, defaultDate }) {
    const [resourceType, setResourceType] = useState('staff');
    const [resources, setResources] = useState([]);
    const [resourceId, setResourceId] = useState('');
    const [date, setDate] = useState(defaultDate || '');
    const [fullDay, setFullDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:00');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState('form'); // form | preview
    const [preview, setPreview] = useState(null);

    const resetPreview = () => {
        setStep('form');
        setPreview(null);
    };

    useEffect(() => {
        if (!isOpen) return;
        setDate(defaultDate || '');
        setError(null);
        setStep('form');
        setPreview(null);
        setReason('');
        setFullDay(true);
    }, [isOpen, defaultDate]);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setResourceId('');
            resetPreview();
            try {
                if (resourceType === 'staff') {
                    const res = await apiClient.get(endpoints.admin.staff.list);
                    const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
                    setResources(
                        list
                            .filter((s) => ['staff', 'admin', 'superadmin'].includes(s.role) || s.is_superuser)
                            .map((s) => {
                                const name =
                                    `${s.first_name || ''} ${s.last_name || ''}`.trim() ||
                                    s.username ||
                                    s.email;
                                const roleTag =
                                    s.role === 'admin' || s.is_superuser
                                        ? 'Admin'
                                        : s.role === 'superadmin'
                                          ? 'Superadmin'
                                          : null;
                                return {
                                    id: s.id,
                                    label: roleTag ? `${name} (${roleTag})` : name,
                                };
                            })
                    );
                } else if (resourceType === 'simulator') {
                    const res = await apiClient.get(endpoints.admin.simulators.list);
                    const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
                    setResources(
                        list
                            .filter((s) => s.is_active !== false)
                            .map((s) => ({
                                id: s.id,
                                label: `Bay ${s.bay_number} — ${s.name}`,
                            }))
                    );
                } else {
                    const res = await apiClient.get('/admin/category-assets/');
                    const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
                    setResources(
                        list
                            .filter((a) => a.is_active !== false)
                            .map((a) => ({
                                id: a.id,
                                label: a.name + (a.category_name ? ` (${a.category_name})` : ''),
                            }))
                    );
                }
            } catch (e) {
                console.error(e);
                setResources([]);
            }
        };
        load();
    }, [isOpen, resourceType]);

    if (!isOpen) return null;

    const buildBody = (withPreview) => {
        const body = {
            resource_type: resourceType,
            resource_id: parseInt(resourceId, 10),
            date,
            reason,
        };
        if (!fullDay) {
            body.start_time = startTime;
            body.end_time = endTime;
        }
        if (withPreview) body.preview = true;
        return body;
    };

    const handlePreview = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.post(endpoints.admin.calendarBlocks, buildBody(true));
            setPreview(res.data);
            setStep('preview');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to preview affected bookings.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.post(endpoints.admin.calendarBlocks, buildBody(false));
            onSaved?.(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create block.');
        } finally {
            setLoading(false);
        }
    };

    const windowLabel = fullDay
        ? `${date} (full day)`
        : `${date} · ${startTime} – ${endTime}`;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface rounded-card shadow-card w-full max-w-lg border border-border max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {step === 'preview' ? 'Confirm block' : 'Block time'}
                    </h2>
                    <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {step === 'form' ? (
                    <form onSubmit={handlePreview} className="p-4 space-y-4 overflow-y-auto">
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'staff', label: 'Coach' },
                                { id: 'simulator', label: 'Bay' },
                                { id: 'asset', label: 'Asset' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setResourceType(opt.id)}
                                    className={`px-2 py-2 rounded-lg text-sm border ${
                                        resourceType === opt.id ? 'bg-primary text-white border-primary' : 'border-border'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <div>
                            <label className="text-sm font-medium text-text-secondary">Resource</label>
                            <select
                                required
                                value={resourceId}
                                onChange={(e) => setResourceId(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                            >
                                <option value="">Select…</option>
                                {resources.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-text-secondary">Date</label>
                            <DateInput
                                required
                                value={date}
                                onChange={(v) => setDate(v)}
                                className="w-full mt-1"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-text-primary">
                            <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} />
                            Full day
                        </label>

                        {!fullDay && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-text-secondary">Start</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
                                        required={!fullDay}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-text-secondary">End</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
                                        required={!fullDay}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-sm text-text-secondary">Reason (optional)</label>
                            <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full mt-1 px-3 py-2 border border-border rounded-lg"
                                placeholder="Maintenance, private event…"
                            />
                        </div>

                        <Button type="submit" disabled={loading || !resourceId || !date} className="w-full">
                            {loading ? 'Checking…' : 'Review affected bookings'}
                        </Button>
                    </form>
                ) : (
                    <div className="p-4 space-y-4 overflow-y-auto flex-1">
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                        <div className="text-sm text-text-secondary space-y-1">
                            <div>
                                <span className="font-medium text-text-primary">{preview?.resource_label}</span>
                            </div>
                            <div>{windowLabel}</div>
                            {reason ? <div>Reason: {reason}</div> : null}
                        </div>

                        {(preview?.count || 0) === 0 ? (
                            <div className="bg-green-50 text-green-800 border border-green-200 rounded-lg p-3 text-sm">
                                No overlapping confirmed bookings. Safe to block — nothing will be cancelled.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    {preview.count} booking{preview.count === 1 ? '' : 's'} will be cancelled.
                                    Credits refunded where applicable; clients with email will be notified.
                                </p>
                                <ul className="divide-y divide-border border border-border rounded-lg max-h-64 overflow-auto">
                                    {preview.bookings.map((b) => (
                                        <li key={b.id} className="px-3 py-2.5 text-sm">
                                            <div className="font-medium text-text-primary">{b.client_name}</div>
                                            <div className="text-xs text-text-secondary mt-0.5">
                                                {b.start_time?.display} – {b.end_time?.display}
                                                {b.booking_type ? ` · ${b.booking_type}` : ''}
                                                {b.simulator_name ? ` · ${b.simulator_name}` : ''}
                                                {b.asset_name ? ` · ${b.asset_name}` : ''}
                                            </div>
                                            <div className="text-xs text-text-muted mt-0.5">
                                                {REFUND_LABELS[b.refund_kind] || REFUND_LABELS.none}
                                                {b.will_email
                                                    ? ` · email ${b.client_email}`
                                                    : ' · no email on file'}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={resetPreview}
                                disabled={loading}
                                className="flex items-center gap-1.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirm}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading
                                    ? 'Blocking…'
                                    : preview?.count > 0
                                      ? `Confirm — cancel ${preview.count} & block`
                                      : 'Confirm block'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
