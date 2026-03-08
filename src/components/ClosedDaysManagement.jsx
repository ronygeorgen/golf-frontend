import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import Badge from './ui/Badge';
import { Edit, Trash2, CalendarOff } from 'lucide-react';
import { formatLocalDate, formatLocalTime } from '../utils/timezoneUtils';

const RECURRENCE_TYPES = [
    { value: 'one_time', label: 'One Time (Specific Date Only)' },
    { value: 'weekly', label: 'Weekly Recurring' },
    { value: 'yearly', label: 'Yearly Recurring' },
];

function ClosedDaysManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { locationTimezone, locationId } = useAppSelector((state) => state.auth);
    const tz = locationTimezone || 'America/Halifax'; // DST-aware IANA timezone
    const modalRef = useRef(null);

    const [closedDays, setClosedDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingClosedDay, setEditingClosedDay] = useState(null);

    const emptyForm = {
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        recurrence: 'one_time',
        is_active: true,
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [fullDayClosure, setFullDayClosure] = useState(true);

    // Conflict modal (when creating closed day has conflicts)
    const [conflictModalOpen, setConflictModalOpen] = useState(false);
    const [conflictMessage, setConflictMessage] = useState('');
    const [conflictSubmitData, setConflictSubmitData] = useState(null);
    const [conflictPreviewData, setConflictPreviewData] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [showDetailedView, setShowDetailedView] = useState(false);
    const [showSimulatorBookings, setShowSimulatorBookings] = useState(true);
    const [showCoachingBookings, setShowCoachingBookings] = useState(true);

    useEffect(() => {
        fetchClosedDays();
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingClosedDay(null);
                setFormData(emptyForm);
                setFullDayClosure(true);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const fetchClosedDays = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoints.admin.closedDays.list);
            // Guard against paginated responses ({count, results:[...]}) vs plain arrays
            const data = response.data;
            setClosedDays(Array.isArray(data) ? data : data?.results || []);
        } catch (error) {
            console.error('Error fetching closed days:', error);
            showError('Failed to load closed days');
        } finally {
            setLoading(false);
        }
    };

    /**
     * ClosedDay stores date + time as LOCAL wall-clock (center's timezone).
     * We send local values to the backend - NO conversion. The backend interprets
     * these as center-local times and converts to UTC only when comparing with bookings.
     */
    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        const submitData = {
            ...formData,
            start_date: formData.start_date,
            end_date: formData.end_date || formData.start_date,
            // Always send location_id so backend uses correct timezone for UTC conversion
            location_id: locationId || undefined,
        };

        if (!fullDayClosure && formData.start_time && formData.end_time) {
            submitData.start_time = formData.start_time;
            submitData.end_time = formData.end_time;
        } else {
            submitData.start_time = null;
            submitData.end_time = null;
        }

        await processSubmission(submitData);
    };

    const processSubmission = async (data) => {
        setSubmitLoading(true);
        try {
            if (editingClosedDay) {
                await axios.patch(endpoints.admin.closedDays.update(editingClosedDay.id), data);
            } else {
                await axios.post(endpoints.admin.closedDays.create, data);
            }
            setShowForm(false);
            setEditingClosedDay(null);
            setFormData(emptyForm);
            setFullDayClosure(true);
            await fetchClosedDays();
            showSuccess(editingClosedDay ? 'Closed day updated successfully' : 'Closed day created successfully');
            closePopup(); // Ensure any open popups are closed
        } catch (error) {
            console.error('Error saving closed day:', error);
            // Check for detailed conflict message
            const conflictMessage = error.response?.data?.start_date?.[0] ||
                error.response?.data?.end_date?.[0] ||
                error.response?.data?.error ||
                error.response?.data?.date?.[0] ||
                error.response?.data?.start_time?.[0] ||
                error.response?.data?.end_time?.[0] ||
                'Failed to save closed day';

            const hasConflicts = error.response?.data?.conflicts === true ||
                (Array.isArray(error.response?.data?.conflicts) && (error.response?.data?.conflicts[0] === true || error.response?.data?.conflicts[0] === 'True'));

            // Show conflict modal if it's a detailed conflict message (with Force Override option)
            if (hasConflicts || conflictMessage.includes('\n') || conflictMessage.includes('•')) {
                setConflictMessage(conflictMessage);
                setConflictSubmitData(data);
                setConflictPreviewData(null);
                setShowDetailedView(false);
                setShowSimulatorBookings(true);
                setShowCoachingBookings(true);
                setConflictModalOpen(true);
            } else {
                showError(conflictMessage);
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (closedDay) => {
        setEditingClosedDay(closedDay);

        // Backend returns LOCAL wall-clock date/time (center's timezone) - use as-is
        const startDateLocal = closedDay.start_date || '';
        const endDateLocal = closedDay.end_date || closedDay.start_date || '';
        let startTimeLocal = closedDay.start_time ? String(closedDay.start_time).slice(0, 5) : '';
        let endTimeLocal = closedDay.end_time ? String(closedDay.end_time).slice(0, 5) : '';
        let isFullDay = true;

        if (closedDay.start_time && closedDay.end_time) {
            isFullDay = false;
        }

        setFullDayClosure(isFullDay);

        setFormData({
            title: closedDay.title || '',
            description: closedDay.description || '',
            start_date: startDateLocal,
            end_date: endDateLocal,
            start_time: startTimeLocal,
            end_time: endTimeLocal,
            recurrence: closedDay.recurrence || 'one_time',
            is_active: closedDay.is_active !== undefined ? closedDay.is_active : true,
        });
        setShowForm(true);
    };

    const handleDelete = (closedDay) => {
        openPopup({
            type: 'warning',
            title: 'Confirm Delete',
            message: `Are you sure you want to delete "${closedDay.title}"?`,
            showCancel: true,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await axios.delete(endpoints.admin.closedDays.delete(closedDay.id));
                    fetchClosedDays();
                    showSuccess('Closed day deleted successfully');
                } catch (error) {
                    console.error('Error deleting closed day:', error);
                    showError('Failed to delete closed day');
                }
            },
        });
    };

    /**
     * Format UTC date to display
     * For date-only fields (full day closures), display as-is
     * For dates with times, the date has already been adjusted to UTC during conversion
     */
    const formatDate = (utcDateString) => {
        if (!utcDateString) return '';
        const [year, month, day] = utcDateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatRecurrence = (recurrence) => {
        const type = RECURRENCE_TYPES.find(t => t.value === recurrence);
        return type ? type.label : recurrence;
    };

    const fetchConflictPreview = async () => {
        if (!conflictSubmitData) return;
        setLoadingPreview(true);
        try {
            const payload = {
                start_date: conflictSubmitData.start_date,
                end_date: conflictSubmitData.end_date || conflictSubmitData.start_date,
                // Send closure times only when it's a partial closure
                start_time: conflictSubmitData.start_time || null,
                end_time: conflictSubmitData.end_time || null,
                // Always include location_id for correct timezone resolution
                location_id: conflictSubmitData.location_id || locationId || undefined,
            };
            const res = await axios.post(endpoints.admin.closedDays.previewCancellations, payload);
            setConflictPreviewData(res.data);
            setShowDetailedView(true);
        } catch (err) {
            console.error('Failed to fetch conflict preview:', err);
            showError('Failed to load booking details');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleForceOverride = () => {
        setConflictModalOpen(false);
        if (conflictSubmitData) {
            processSubmission({ ...conflictSubmitData, force_override: true });
        }
    };

    const closeConflictModal = () => {
        setConflictModalOpen(false);
        setConflictMessage('');
        setConflictSubmitData(null);
        setConflictPreviewData(null);
        setShowDetailedView(false);
    };

    if (loading) {
        return <TableSkeleton />;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Manage Closed Days</h1>
                <Button
                    onClick={() => {
                        setEditingClosedDay(null);
                        setFormData(emptyForm);
                        setFullDayClosure(true);
                        setShowForm(true);
                    }}
                    variant="primary"
                >
                    Add Closed Day
                </Button>
            </div>

            {/* Closed Days Table */}
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Time Range</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Recurrence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {closedDays.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-text-secondary">
                                        No closed days configured
                                    </td>
                                </tr>
                            ) : (
                                closedDays.map((closedDay) => {
                                    const startDate = closedDay.start_date || '';
                                    const endDate = closedDay.end_date || closedDay.start_date || '';
                                    const startTime = closedDay.start_time ? String(closedDay.start_time).slice(0, 5) : '';
                                    const endTime = closedDay.end_time ? String(closedDay.end_time).slice(0, 5) : '';
                                    const isFullDay = !startTime || !endTime;

                                    return (
                                        <tr key={closedDay.id} className="hover:bg-background transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-text-primary">{closedDay.title}</div>
                                                {closedDay.description && (
                                                    <div className="text-xs text-text-secondary mt-1">{closedDay.description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">
                                                    {formatLocalDate(new Date(`${startDate}T12:00:00`), tz)}
                                                    {startDate !== endDate && (
                                                        <> - {formatLocalDate(new Date(`${endDate}T12:00:00`), tz)}</>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">
                                                    {isFullDay ? (
                                                        <span className="text-text-secondary">Full Day</span>
                                                    ) : (
                                                        <>{startTime} - {endTime}</>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-text-primary">{formatRecurrence(closedDay.recurrence)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge
                                                    variant={closedDay.is_active ? 'danger' : 'secondary'}
                                                >
                                                    {closedDay.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(closedDay)}
                                                        className="text-primary hover:text-primary-light transition-colors p-1 rounded-md hover:bg-background"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(closedDay)}
                                                        className="text-danger hover:text-danger-dark transition-colors p-1 rounded-md hover:bg-background"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        ref={modalRef}
                        className="bg-surface rounded-card shadow-card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-text-primary">
                                {editingClosedDay ? 'Edit Closed Day' : 'Add Closed Day'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Title <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    placeholder="e.g., Holiday, Maintenance, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows="3"
                                    placeholder="Additional details about the closure"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        Start Date <span className="text-danger">*</span>
                                    </label>
                                    <DateInput
                                        value={formData.start_date}
                                        onChange={(val) => setFormData({ ...formData, start_date: val })}
                                        placeholder="Start date"
                                        className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        End Date <span className="text-danger">*</span>
                                    </label>
                                    <DateInput
                                        value={formData.end_date}
                                        onChange={(val) => setFormData({ ...formData, end_date: val })}
                                        placeholder="End date"
                                        className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                    <p className="text-xs text-text-secondary mt-1">Same as start date for single day</p>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={fullDayClosure}
                                        onChange={(e) => {
                                            setFullDayClosure(e.target.checked);
                                            if (e.target.checked) {
                                                setFormData({ ...formData, start_time: '', end_time: '' });
                                            }
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-text-primary">Full Day Closure</span>
                                </label>
                            </div>

                            {!fullDayClosure && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Recurrence <span className="text-danger">*</span>
                                </label>
                                <select
                                    value={formData.recurrence}
                                    onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                >
                                    {RECURRENCE_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-secondary mt-1">
                                    {formData.recurrence === 'one_time' && 'Closure applies only to the specified date(s)'}
                                    {formData.recurrence === 'weekly' && 'Closure repeats every week on the same day of week'}
                                    {formData.recurrence === 'yearly' && 'Closure repeats every year on the same date'}
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="text-sm font-medium text-text-primary">Active</span>
                                </label>
                                <p className="text-xs text-text-secondary mt-1">Inactive closures won't block bookings</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingClosedDay(null);
                                        setFormData(emptyForm);
                                        setFullDayClosure(true);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={submitLoading}
                                >
                                    {submitLoading ? 'Saving...' : editingClosedDay ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Conflict Modal (Force Override + Detailed View) */}
            {conflictModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40" onClick={closeConflictModal} />
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-surface shadow-2xl">
                        <div className="p-6 border-b border-border flex-shrink-0">
                            <h3 className="text-lg font-semibold text-text-primary">Conflicts Detected</h3>
                            <p className="mt-2 text-sm text-text-secondary whitespace-pre-line">{conflictMessage}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={fetchConflictPreview}
                                    disabled={loadingPreview}
                                >
                                    {loadingPreview ? 'Loading...' : 'Detailed View'}
                                </Button>
                            </div>
                        </div>

                        {showDetailedView && conflictPreviewData?.bookings_by_date && (
                            <div className="flex-1 overflow-y-auto p-6 border-t border-border space-y-4">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showSimulatorBookings}
                                            onChange={(e) => setShowSimulatorBookings(e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-text-primary">Simulator Bookings</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showCoachingBookings}
                                            onChange={(e) => setShowCoachingBookings(e.target.checked)}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm font-medium text-text-primary">Coaching Sessions</span>
                                    </label>
                                </div>

                                {Object.entries(conflictPreviewData.bookings_by_date)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([dateStr, types]) => {
                                        const simList = types.simulator || [];
                                        const coachList = types.coaching || [];
                                        const hasAny = (showSimulatorBookings && simList.length) || (showCoachingBookings && coachList.length);
                                        if (!hasAny) return null;

                                        return (
                                            <div key={dateStr} className="border border-border rounded-lg overflow-hidden">
                                                <div className="bg-background px-4 py-2 font-medium text-text-primary">
                                                    {formatLocalDate(new Date(`${dateStr}T12:00:00`), tz)}
                                                </div>
                                                <div className="divide-y divide-border">
                                                    {showSimulatorBookings && simList.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-2 bg-background/50 text-xs font-medium text-text-secondary uppercase">
                                                                Simulator ({simList.length})
                                                            </div>
                                                            {simList.map((b) => (
                                                                <div key={b.id} className="px-4 py-2 flex justify-between items-center text-sm">
                                                                    <span className="text-text-primary">{b.client_name}</span>
                                                                    <span className="text-text-secondary">
                                                                        {formatLocalTime(b.start_time, tz, { hour12: false })} - {formatLocalTime(b.end_time, tz, { hour12: false })}
                                                                        {b.simulator_name && ` • ${b.simulator_name}`}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                    {showCoachingBookings && coachList.length > 0 && (
                                                        <>
                                                            <div className="px-4 py-2 bg-background/50 text-xs font-medium text-text-secondary uppercase">
                                                                Coaching ({coachList.length})
                                                            </div>
                                                            {coachList.map((b) => (
                                                                <div key={b.id} className="px-4 py-2 flex justify-between items-center text-sm">
                                                                    <span className="text-text-primary">{b.client_name}</span>
                                                                    <span className="text-text-secondary">
                                                                        {formatLocalTime(b.start_time, tz, { hour12: false })} - {formatLocalTime(b.end_time, tz, { hour12: false })}
                                                                        {b.coach_name && ` • ${b.coach_name}`}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                {Object.keys(conflictPreviewData.bookings_by_date).length === 0 && (
                                    <p className="text-sm text-text-secondary">No bookings would be cancelled.</p>
                                )}
                            </div>
                        )}

                        <div className="p-6 border-t border-border flex justify-end gap-3 flex-shrink-0">
                            <Button variant="secondary" onClick={closeConflictModal}>
                                Cancel
                            </Button>
                            <Button variant="accent" onClick={handleForceOverride}>
                                Force Override
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <PopupMessage {...popup} onClose={closePopup} />
            {toast && <Toast {...toast} onClose={hideToast} />}
        </div>
    );
}

export default ClosedDaysManagement;

