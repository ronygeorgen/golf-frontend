import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import DateInput from './ui/DateInput';
import Badge from './ui/Badge';
import { Edit, Power, PowerOff, Trash2, X, FileText, Plus, Calendar, Clock, CalendarDays } from 'lucide-react';

function SimulatorPackageManagement() {
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const modalRef = useRef(null);
    
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [serviceCategories, setServiceCategories] = useState([]);

    const emptyForm = {
        title: '',
        description: '',
        price: '',
        hours: '',
        redirect_url: '',
        is_active: true,
        validity_days: '',
        time_restrictions: [],
        service_category: '',
        is_membership: false,
        monthly_hours: '',
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [togglingActive, setTogglingActive] = useState({});
    const [deleting, setDeleting] = useState({});
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [selectedDescription, setSelectedDescription] = useState('');
    const [selectedPackageTitle, setSelectedPackageTitle] = useState('');

    useEffect(() => {
        fetchPackages();
        apiClient.get(endpoints.categories.active).then(({ data }) => {
            if (Array.isArray(data)) setServiceCategories(data);
        }).catch(() => {});
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingPackage(null);
                setFormData(emptyForm);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoints.admin.simulatorPackages.list);
            setPackages(response.data);
        } catch (error) {
            console.error('Error fetching simulator packages:', error);
            showError('Failed to load simulator packages');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const submitData = {
            ...formData,
            price: parseFloat(formData.price),
            hours: parseFloat(formData.hours),
            validity_days: formData.validity_days ? parseInt(formData.validity_days) : null,
            time_restrictions: formData.time_restrictions || [],
            monthly_hours: formData.is_membership ? parseFloat(formData.monthly_hours) : null,
        };

        setSubmitLoading(true);
        try {
            if (editingPackage) {
                await axios.patch(endpoints.admin.simulatorPackages.detail(editingPackage.id), submitData);
            } else {
                await axios.post(endpoints.admin.simulatorPackages.list, submitData);
            }
            setShowForm(false);
            setEditingPackage(null);
            setFormData(emptyForm);
            await fetchPackages();
            showSuccess(editingPackage ? 'Simulator package updated successfully' : 'Simulator package created successfully');
        } catch (error) {
            console.error('Error saving simulator package:', error);
            showError(error.response?.data?.error || 'Failed to save simulator package');
        } finally {
            setSubmitLoading(false);
        }
    };

    const addTimeRestriction = () => {
        setFormData({
            ...formData,
            time_restrictions: [
                ...formData.time_restrictions,
                {
                    is_recurring: true,
                    day_of_week: null,
                    date: '',
                    start_time: '',
                    end_time: '',
                    limit_hours: 1.0
                }
            ]
        });
    };

    const updateTimeRestriction = (index, field, value) => {
        const updated = [...formData.time_restrictions];
        updated[index] = { ...updated[index], [field]: value };
        // Clear conflicting fields
        if (field === 'is_recurring') {
            if (value) {
                updated[index].date = '';
            } else {
                updated[index].day_of_week = null;
            }
        }
        setFormData({ ...formData, time_restrictions: updated });
    };

    const removeTimeRestriction = (index) => {
        const updated = formData.time_restrictions.filter((_, i) => i !== index);
        setFormData({ ...formData, time_restrictions: updated });
    };

    const handleEdit = (pkg) => {
        setEditingPackage(pkg);
        // Convert time restrictions to use limit_hours (handle old limit_count field)
        const time_restrictions = (pkg.time_restrictions || []).map(restriction => ({
            ...restriction,
            limit_hours: restriction.limit_hours !== undefined ? parseFloat(restriction.limit_hours) : 
                        (restriction.limit_count !== undefined ? parseFloat(restriction.limit_count) : 1.0)
        }));
        
        setFormData({
            title: pkg.title || '',
            description: pkg.description || '',
            price: pkg.price !== null && pkg.price !== undefined ? parseFloat(pkg.price) : '',
            hours: pkg.hours !== null && pkg.hours !== undefined ? parseFloat(pkg.hours) : '',
            redirect_url: pkg.redirect_url || '',
            is_active: pkg.is_active !== undefined ? pkg.is_active : true,
            validity_days: pkg.validity_days || '',
            time_restrictions: time_restrictions,
            service_category: pkg.service_category_id ?? pkg.service_category ?? '',
            is_membership: pkg.is_membership || false,
            monthly_hours: pkg.monthly_hours !== null && pkg.monthly_hours !== undefined ? parseFloat(pkg.monthly_hours) : '',
        });
        setShowForm(true);
    };

    const handleToggleActive = async (packageId, isActive) => {
        setTogglingActive({ ...togglingActive, [packageId]: true });
        try {
            await axios.post(endpoints.admin.simulatorPackages.toggleActive(packageId));
            await fetchPackages();
            showSuccess(`Simulator package ${!isActive ? 'activated' : 'deactivated'} successfully`);
        } catch (error) {
            console.error('Error toggling package status:', error);
            showError('Failed to update package status');
        } finally {
            setTogglingActive({ ...togglingActive, [packageId]: false });
        }
    };

    const handleDelete = async (packageId) => {
        openPopup({
            type: 'warning',
            title: 'Delete Simulator Package?',
            message: 'This will permanently delete the simulator package. This action cannot be undone.',
            showCancel: true,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                setDeleting({ ...deleting, [packageId]: true });
                try {
                    await axios.delete(endpoints.admin.simulatorPackages.detail(packageId));
                    await fetchPackages();
                    showSuccess('Simulator package deleted successfully');
                } catch (error) {
                    console.error('Error deleting package:', error);
                    showError('Failed to delete simulator package');
                } finally {
                    setDeleting({ ...deleting, [packageId]: false });
                }
            },
        });
    };

    return (
        <>
            <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button 
                            onClick={() => {
                                setEditingPackage(null);
                                setFormData(emptyForm);
                                setShowForm(true);
                            }}
                            loading={submitLoading}
                            className="flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>Add Simulator Only Package</span>
                        </Button>
                    </div>
                </div>

                {/* Packages List */}
                {loading ? (
                    <TableSkeleton rows={5} cols={6} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {packages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No simulator packages found. Add your first package.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Hours
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Redirect URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {packages.map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-background transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    {pkg.title}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary max-w-xs">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDescription(pkg.description || 'No description available');
                                                            setSelectedPackageTitle(pkg.title);
                                                            setShowDescriptionModal(true);
                                                        }}
                                                        className="text-text-secondary hover:text-primary transition-colors cursor-pointer text-left truncate block w-full"
                                                        title="Click to view full description"
                                                    >
                                                        {pkg.description || <span className="text-text-secondary italic">No description</span>}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-accent">
                                                    ${pkg.price}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                    {pkg.is_membership ? (
                                                        <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded text-xs font-bold uppercase">
                                                            <span className="text-[10px]">🔁</span> Membership
                                                        </span>
                                                    ) : (
                                                        <span className="text-text-secondary">Standard</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.is_membership ? (
                                                        <span>{pkg.monthly_hours} hrs<span className="text-xs text-text-secondary">/mo</span></span>
                                                    ) : (
                                                        `${pkg.hours} hrs`
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-primary max-w-xs truncate">
                                                    {pkg.redirect_url ? (
                                                        <a 
                                                            href={pkg.redirect_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary-light underline transition-colors"
                                                        >
                                                            {pkg.redirect_url.length > 20 ? pkg.redirect_url.substring(0, 20) + '...' : pkg.redirect_url}
                                                        </a>
                                                    ) : (
                                                        <span className="text-text-secondary">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={pkg.is_active ? 'confirmed' : 'cancelled'}>
                                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            className="text-primary hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => handleEdit(pkg)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            className={`${
                                                                pkg.is_active 
                                                                    ? 'text-accent hover:text-accent-dark' 
                                                                    : 'text-status-confirmed-text hover:text-status-confirmed-text/80'
                                                            } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title={pkg.is_active ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {togglingActive[pkg.id] ? (
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : pkg.is_active ? (
                                                                <PowerOff className="w-4 h-4" />
                                                            ) : (
                                                                <Power className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button 
                                                            className="text-danger hover:text-danger-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={() => handleDelete(pkg.id)}
                                                            disabled={togglingActive[pkg.id] || deleting[pkg.id]}
                                                            title="Delete"
                                                        >
                                                            {deleting[pkg.id] ? (
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
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
                )}

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div ref={modalRef} className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold text-text-primary mb-4">
                                {editingPackage ? 'Edit Simulator Only Package' : 'Add New Simulator Only Package'}
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Package Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            required
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Service Category
                                        </label>
                                        <select
                                            value={formData.service_category ?? ''}
                                            onChange={(e) => setFormData({ ...formData, service_category: e.target.value ? Number(e.target.value) : '' })}
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        >
                                            <option value="">— None / legacy simulator —</option>
                                            {serviceCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                    {cat.legacy_booking_type ? ` (${cat.legacy_booking_type})` : ' (new category)'}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-text-secondary">
                                            Link this package to a service category so it appears in the correct booking flow.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Description *
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            rows="4"
                                            required
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                Price ($) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.price}
                                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                                required
                                                className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                            />
                                            {formData.is_membership && (
                                                <p className="text-xs text-primary mt-1">This will be billed monthly via Square.</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                Initial Total Hours *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                value={formData.hours}
                                                onChange={(e) => setFormData({...formData, hours: e.target.value})}
                                                required
                                                className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                            />
                                            {formData.is_membership && (
                                                <p className="text-xs text-text-secondary mt-1">First month's hours.</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    id="is_membership"
                                                    checked={formData.is_membership}
                                                    onChange={(e) => setFormData({...formData, is_membership: e.target.checked})}
                                                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="is_membership" className="font-bold text-primary">
                                                    Make this a Recurring Membership
                                                </label>
                                                <p className="text-text-secondary">Clients will be subscribed in Square and billed monthly. Hours reset each billing cycle.</p>
                                            </div>
                                        </div>
                                        
                                        {formData.is_membership && (
                                            <div>
                                                <label className="block text-sm font-medium text-text-primary mb-1">
                                                    Monthly Reset Hours *
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    value={formData.monthly_hours}
                                                    onChange={(e) => setFormData({...formData, monthly_hours: e.target.value})}
                                                    required={formData.is_membership}
                                                    className="w-full px-3 py-2 border border-primary/30 rounded-button bg-background text-text-primary focus:border-primary"
                                                    placeholder="e.g. 10"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">Hours will reset to this amount each time the membership renews. Unused hours do not carry over.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Redirect URL (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.redirect_url}
                                            onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                                            placeholder="https://example.com/redirect"
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Validity Period (Days) (Optional)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={formData.validity_days}
                                            onChange={(e) => setFormData({...formData, validity_days: e.target.value})}
                                            placeholder="e.g., 30"
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                        />
                                        <p className="text-xs text-text-secondary mt-1">Number of days from purchase date that this package is valid. Package expires after this period.</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-text-primary">
                                                Time Restrictions (Optional)
                                            </label>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={addTimeRestriction}
                                                className="text-xs flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Add Restriction</span>
                                            </Button>
                                        </div>
                                        <p className="text-xs text-text-secondary mb-3">Set specific days/times when this package can be used</p>
                                        {formData.time_restrictions.map((restriction, index) => (
                                            <div key={index} className="mb-4 p-4 border border-border rounded-button bg-background">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-medium text-text-primary">Restriction {index + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTimeRestriction(index)}
                                                        className="text-danger hover:text-danger-light transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={restriction.is_recurring}
                                                            onChange={(e) => updateTimeRestriction(index, 'is_recurring', e.target.checked)}
                                                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                                        />
                                                        <label className="ml-2 text-sm font-medium text-text-primary">
                                                            Recurring (Day of Week)
                                                        </label>
                                                    </div>
                                                    {restriction.is_recurring ? (
                                                        <div>
                                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                                Day of Week *
                                                            </label>
                                                            <select
                                                                value={restriction.day_of_week ?? ''}
                                                                onChange={(e) => updateTimeRestriction(index, 'day_of_week', e.target.value ? parseInt(e.target.value) : null)}
                                                                required
                                                                className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                                            >
                                                                <option value="">Select day</option>
                                                                <option value="0">Monday</option>
                                                                <option value="1">Tuesday</option>
                                                                <option value="2">Wednesday</option>
                                                                <option value="3">Thursday</option>
                                                                <option value="4">Friday</option>
                                                                <option value="5">Saturday</option>
                                                                <option value="6">Sunday</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                                Specific Date *
                                                            </label>
                                                            <DateInput
                                                                value={restriction.date || ''}
                                                                onChange={(val) => updateTimeRestriction(index, 'date', val)}
                                                                required
                                                                placeholder="Select date"
                                                                className="px-3 py-2 border border-border rounded-button bg-background"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                                Start Time *
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={restriction.start_time}
                                                                onChange={(e) => updateTimeRestriction(index, 'start_time', e.target.value)}
                                                                required
                                                                className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                                End Time *
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={restriction.end_time}
                                                                onChange={(e) => updateTimeRestriction(index, 'end_time', e.target.value)}
                                                                required
                                                                className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                                            Set Usage Hour Limit *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            min="0.5"
                                                            value={restriction.limit_hours}
                                                            onChange={(e) => updateTimeRestriction(index, 'limit_hours', parseFloat(e.target.value) || 1.0)}
                                                            required
                                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary"
                                                        />
                                                        <p className="text-xs text-text-secondary mt-1">Maximum hours that can be used on this day/date within the time window</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {formData.time_restrictions.length === 0 && (
                                            <div className="text-center py-4 text-text-secondary text-sm border border-border rounded-button bg-background">
                                                No time restrictions. Package can be used anytime.
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                        />
                                        <label className="ml-2 text-sm font-medium text-text-primary">
                                            Active
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditingPackage(null);
                                            setFormData(emptyForm);
                                        }}
                                        loading={submitLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={submitLoading}>
                                        {editingPackage ? 'Update' : 'Create'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Description Modal */}
                {showDescriptionModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDescriptionModal(false)}>
                        <div className="bg-surface rounded-card shadow-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Package Description
                                </h2>
                                <button
                                    onClick={() => setShowDescriptionModal(false)}
                                    className="text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm font-medium text-text-secondary mb-1">Package:</p>
                                <p className="text-lg font-semibold text-text-primary">{selectedPackageTitle}</p>
                            </div>
                            <div className="bg-background rounded-button border border-border p-4">
                                <p className="text-text-primary whitespace-pre-wrap break-words">
                                    {selectedDescription}
                                </p>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowDescriptionModal(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <PopupMessage
                open={popup.open}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                confirmText={popup.confirmText}
                cancelText={popup.cancelText}
                showCancel={popup.showCancel}
                onConfirm={popup.onConfirm ? async () => {
                    const action = popup.onConfirm;
                    closePopup();
                    if (action) {
                        await action();
                    }
                } : closePopup}
                onClose={closePopup}
            />
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={hideToast}
                />
            )}
        </>
    );
}

export default SimulatorPackageManagement;

