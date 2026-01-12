import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Edit, Trash2, CalendarOff } from 'lucide-react';

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
            setClosedDays(response.data);
        } catch (error) {
            console.error('Error fetching closed days:', error);
            showError('Failed to load closed days');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // If full day closure, don't send time fields
        const submitData = {
            ...formData,
            start_date: formData.start_date,
            end_date: formData.end_date || formData.start_date, // If end_date not set, use start_date
        };

        // Only include time fields if not full day closure
        if (!fullDayClosure) {
            submitData.start_time = formData.start_time || null;
            submitData.end_time = formData.end_time || null;
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

            // Show error in a popup if it's a detailed conflict message (contains newlines) or a conflict flag
            if (hasConflicts || conflictMessage.includes('\n') || conflictMessage.includes('•')) {
                openPopup({
                    type: hasConflicts ? 'warning' : 'error',
                    title: hasConflicts ? 'Conflicts Detected' : 'Cannot Create Closed Day',
                    message: conflictMessage,
                    showCancel: hasConflicts,
                    confirmText: hasConflicts ? 'Force Override' : 'OK',
                    cancelText: 'Cancel',
                    onConfirm: hasConflicts ? () => {
                        // Retry with force_override
                        closePopup();
                        processSubmission({ ...data, force_override: true });
                    } : closePopup,
                });
            } else {
                showError(conflictMessage);
            }
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (closedDay) => {
        setEditingClosedDay(closedDay);
        const isFullDay = !closedDay.start_time && !closedDay.end_time;
        setFullDayClosure(isFullDay);
        setFormData({
            title: closedDay.title || '',
            description: closedDay.description || '',
            start_date: closedDay.start_date || '',
            end_date: closedDay.end_date || closedDay.start_date || '',
            start_time: closedDay.start_time || '',
            end_time: closedDay.end_time || '',
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

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatRecurrence = (recurrence) => {
        const type = RECURRENCE_TYPES.find(t => t.value === recurrence);
        return type ? type.label : recurrence;
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
                                closedDays.map((closedDay) => (
                                    <tr key={closedDay.id} className="hover:bg-background transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-text-primary">{closedDay.title}</div>
                                            {closedDay.description && (
                                                <div className="text-xs text-text-secondary mt-1">{closedDay.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {formatDate(closedDay.start_date)}
                                                {closedDay.end_date && closedDay.end_date !== closedDay.start_date && (
                                                    <> - {formatDate(closedDay.end_date)}</>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-text-primary">
                                                {closedDay.start_time && closedDay.end_time ? (
                                                    <>
                                                        {closedDay.start_time.substring(0, 5)} - {closedDay.end_time.substring(0, 5)}
                                                    </>
                                                ) : (
                                                    <span className="text-text-secondary">Full Day</span>
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
                                ))
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
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        End Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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

            <PopupMessage {...popup} />
            {toast && <Toast {...toast} onClose={hideToast} />}
        </div>
    );
}

export default ClosedDaysManagement;

