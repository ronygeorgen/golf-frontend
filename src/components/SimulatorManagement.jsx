import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getSimulators, createSimulator, updateSimulator, deleteSimulator } from '../store/slices/adminSlice';
import { Clock, Edit, Trash2, Power, PowerOff, Calendar } from 'lucide-react';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';

function SimulatorManagement() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { list: simulators, loading } = useAppSelector((state) => state.admin.simulators);
    const modalRef = useRef(null);
    
    const [showForm, setShowForm] = useState(false);
    const [editingSimulator, setEditingSimulator] = useState(null);
    const defaultFormState = {
        name: '',
        bay_number: '',
        is_active: true,
        is_coaching_bay: false,
        description: '',
        hourly_price: '',
        redirect_url: ''
    };
    const [formData, setFormData] = useState(defaultFormState);
    const [submitLoading, setSubmitLoading] = useState(false);
    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        dispatch(getSimulators());
    }, [dispatch]);

    useEffect(() => {
        if (formData.is_coaching_bay && formData.hourly_price) {
            setFormData((prev) => ({ ...prev, hourly_price: '' }));
        }
    }, [formData.is_coaching_bay]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setShowForm(false);
                setEditingSimulator(null);
                setFormData(defaultFormState);
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            let result;
            if (editingSimulator) {
                result = await dispatch(updateSimulator({ id: editingSimulator.id, simulatorData: formData }));
            } else {
                result = await dispatch(createSimulator(formData));
            }
            
            // Check if the action was successful or failed
            if (editingSimulator) {
                if (updateSimulator.fulfilled.match(result)) {
                    setShowForm(false);
                    setEditingSimulator(null);
                    setFormData(defaultFormState);
                    showSuccess('Simulator updated successfully');
                } else if (updateSimulator.rejected.match(result)) {
                    // Extract error message from DRF validation errors
                    const payload = result.payload || {};
                    let errorMessage = 'Failed to update simulator';
                    
                    if (typeof payload === 'string') {
                        errorMessage = payload;
                    } else if (payload.error) {
                        errorMessage = payload.error;
                    } else if (payload.message) {
                        errorMessage = payload.message;
                    } else if (payload.detail) {
                        errorMessage = payload.detail;
                    } else if (payload.non_field_errors) {
                        errorMessage = Array.isArray(payload.non_field_errors) 
                            ? payload.non_field_errors[0] 
                            : payload.non_field_errors;
                    } else {
                        // Check for field-specific errors (e.g., bay_number, name, etc.)
                        const fieldErrors = Object.keys(payload).find(key => 
                            Array.isArray(payload[key]) && payload[key].length > 0
                        );
                        if (fieldErrors) {
                            errorMessage = `${fieldErrors}: ${payload[fieldErrors][0]}`;
                        } else if (Object.keys(payload).length > 0) {
                            // Try to get first error value
                            const firstKey = Object.keys(payload)[0];
                            const firstValue = payload[firstKey];
                            errorMessage = Array.isArray(firstValue) ? firstValue[0] : String(firstValue);
                        }
                    }
                    
                    showError(errorMessage);
                }
            } else {
                if (createSimulator.fulfilled.match(result)) {
                    setShowForm(false);
                    setEditingSimulator(null);
                    setFormData(defaultFormState);
                    showSuccess('Simulator created successfully');
                } else if (createSimulator.rejected.match(result)) {
                    // Extract error message from DRF validation errors
                    const payload = result.payload || {};
                    let errorMessage = 'Failed to create simulator';
                    
                    if (typeof payload === 'string') {
                        errorMessage = payload;
                    } else if (payload.error) {
                        errorMessage = payload.error;
                    } else if (payload.message) {
                        errorMessage = payload.message;
                    } else if (payload.detail) {
                        errorMessage = payload.detail;
                    } else if (payload.non_field_errors) {
                        errorMessage = Array.isArray(payload.non_field_errors) 
                            ? payload.non_field_errors[0] 
                            : payload.non_field_errors;
                    } else {
                        // Check for field-specific errors (e.g., bay_number, name, etc.)
                        const fieldErrors = Object.keys(payload).find(key => 
                            Array.isArray(payload[key]) && payload[key].length > 0
                        );
                        if (fieldErrors) {
                            errorMessage = `${fieldErrors}: ${payload[fieldErrors][0]}`;
                        } else if (Object.keys(payload).length > 0) {
                            // Try to get first error value
                            const firstKey = Object.keys(payload)[0];
                            const firstValue = payload[firstKey];
                            errorMessage = Array.isArray(firstValue) ? firstValue[0] : String(firstValue);
                        }
                    }
                    
                    showError(errorMessage);
                }
            }
        } catch (error) {
            showError('An unexpected error occurred. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (simulator) => {
        setEditingSimulator(simulator);
        setFormData({
            name: simulator.name,
            bay_number: simulator.bay_number,
            is_active: simulator.is_active,
            is_coaching_bay: simulator.is_coaching_bay,
            description: simulator.description || '',
            hourly_price: simulator.hourly_price || '',
            redirect_url: simulator.redirect_url || ''
        });
        setShowForm(true);
    };

    const handleToggleActive = async (simulatorId, isActive) => {
        const result = await dispatch(updateSimulator({ id: simulatorId, simulatorData: { is_active: !isActive } }));
        if (updateSimulator.rejected.match(result)) {
            const payload = result.payload || {};
            let errorMessage = 'Failed to update simulator status';
            
            if (typeof payload === 'string') {
                errorMessage = payload;
            } else if (payload.error) {
                errorMessage = payload.error;
            } else if (payload.message) {
                errorMessage = payload.message;
            } else if (payload.detail) {
                errorMessage = payload.detail;
            } else if (payload.non_field_errors) {
                errorMessage = Array.isArray(payload.non_field_errors) 
                    ? payload.non_field_errors[0] 
                    : payload.non_field_errors;
            }
            
            showError(errorMessage);
        }
    };

    const handleDelete = async (simulatorId) => {
        openPopup({
            type: 'warning',
            title: 'Delete simulator?',
            message: 'This action will remove the simulator and its availability schedule.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                const result = await dispatch(deleteSimulator(simulatorId));
                if (deleteSimulator.rejected.match(result)) {
                    const payload = result.payload || {};
                    let errorMessage = 'Failed to delete simulator';
                    
                    if (typeof payload === 'string') {
                        errorMessage = payload;
                    } else if (payload.error) {
                        errorMessage = payload.error;
                    } else if (payload.message) {
                        errorMessage = payload.message;
                    } else if (payload.detail) {
                        errorMessage = payload.detail;
                    } else if (payload.non_field_errors) {
                        errorMessage = Array.isArray(payload.non_field_errors) 
                            ? payload.non_field_errors[0] 
                            : payload.non_field_errors;
                    }
                    
                    showError(errorMessage);
                } else if (deleteSimulator.fulfilled.match(result)) {
                    showSuccess('Simulator deleted successfully');
                }
            },
        });
    };

    return (
        <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button 
                            onClick={() => setShowForm(true)}
                            variant="primary"
                        >
                            Add Simulator
                        </Button>
                    </div>
                </div>

                {/* Simulator Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingSimulator(null);
                        setFormData(defaultFormState);
                    }}>
                        <div ref={modalRef} className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-text-primary mb-6">
                                    {editingSimulator ? 'Edit Simulator' : 'Add Simulator'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Simulator Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Bay Number
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.bay_number}
                                            onChange={(e) => setFormData({...formData, bay_number: parseInt(e.target.value)})}
                                            min="1"
                                            max="6"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            rows="3"
                                        />
                                    </div>
                                    <div className="flex gap-6">
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
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_coaching_bay}
                                                onChange={(e) => setFormData({...formData, is_coaching_bay: e.target.checked})}
                                                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                            />
                                            <label className="ml-2 text-sm font-medium text-text-primary">
                                                Coaching Bay
                                            </label>
                                        </div>
                                    </div>
                                    {!formData.is_coaching_bay && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-text-primary mb-2">
                                                    Hourly Price (CAD)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.hourly_price}
                                                    onChange={(e) => setFormData({...formData, hourly_price: e.target.value})}
                                                    required
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    Charge per hour for normal simulator bookings.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-text-primary mb-2">
                                                    Redirect URL (Optional)
                                                </label>
                                                <input
                                                    type="url"
                                                    value={formData.redirect_url}
                                                    onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                                                    placeholder="https://example.com/payment"
                                                />
                                                <p className="text-xs text-text-secondary mt-1">
                                                    URL to redirect users to after paying for a simulator booking. Required for paid simulator bookings.
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex gap-4 pt-4">
                                        <Button 
                                            type="submit" 
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading
                                                ? (editingSimulator ? 'Updating...' : 'Creating...')
                                                : `${editingSimulator ? 'Update' : 'Create'} Simulator`}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingSimulator(null);
                                                setFormData(defaultFormState);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Simulators List */}
                {loading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {simulators.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No simulators found. Add your first simulator.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Bay #
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Hourly Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Redirect URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Type
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
                                        {simulators.map(simulator => (
                                            <tr key={simulator.id} className="hover:bg-background transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    Bay {simulator.bay_number}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {simulator.name}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {simulator.is_coaching_bay ? '—' : `$${Number(simulator.hourly_price || 0).toFixed(2)}`}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-primary">
                                                    {simulator.is_coaching_bay ? (
                                                        <span className="text-text-secondary">—</span>
                                                    ) : simulator.redirect_url ? (
                                                        <a 
                                                            href={simulator.redirect_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary-light underline truncate block max-w-xs"
                                                            title={simulator.redirect_url}
                                                        >
                                                            {simulator.redirect_url}
                                                        </a>
                                                    ) : (
                                                        <span className="text-text-secondary italic">Not set</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={simulator.is_coaching_bay ? 'personal' : 'pending'}>
                                                        {simulator.is_coaching_bay ? 'Coaching Bay' : 'Simulator Bay'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={simulator.is_active ? 'confirmed' : 'cancelled'}>
                                                        {simulator.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2 flex-wrap">
                                                        <div className="relative group">
                                                            <button 
                                                                className="text-primary hover:text-primary-light transition-colors p-1 rounded-md hover:bg-background"
                                                                onClick={() => handleEdit(simulator)}
                                                                aria-label="Edit Simulator"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                                Edit
                                                            </span>
                                                        </div>
                                                        {!simulator.is_coaching_bay && (
                                                            <div className="relative group">
                                                                <button 
                                                                    className="text-status-personal-text hover:text-status-personal-text/80 transition-colors p-1 rounded-md hover:bg-background"
                                                                    onClick={() => navigate(`/admin/simulators/${simulator.id}/availability`)}
                                                                    aria-label="View Availability"
                                                                >
                                                                    <Calendar className="w-5 h-5" />
                                                                </button>
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                                    Availability
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="relative group">
                                                            <button 
                                                                className={`${
                                                                    simulator.is_active 
                                                                        ? 'text-accent hover:text-accent-dark' 
                                                                        : 'text-status-confirmed-text hover:text-status-confirmed-text/80'
                                                                } transition-colors p-1 rounded-md hover:bg-background`}
                                                                onClick={() => handleToggleActive(simulator.id, simulator.is_active)}
                                                                aria-label={simulator.is_active ? 'Deactivate' : 'Activate'}
                                                            >
                                                                {simulator.is_active ? (
                                                                    <PowerOff className="w-5 h-5" />
                                                                ) : (
                                                                    <Power className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                                {simulator.is_active ? 'Deactivate' : 'Activate'}
                                                            </span>
                                                        </div>
                                                        <div className="relative group">
                                                            <button 
                                                                className="text-danger hover:text-danger-light transition-colors p-1 rounded-md hover:bg-background"
                                                                onClick={() => handleDelete(simulator.id)}
                                                                aria-label="Delete Simulator"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                                                Delete
                                                            </span>
                                                        </div>
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
                <PopupMessage
                    open={popup.open}
                    type={popup.type}
                    title={popup.title}
                    message={popup.message}
                    confirmText={popup.confirmText}
                    cancelText={popup.cancelText}
                    showCancel={popup.showCancel}
                    onConfirm={popup.onConfirm ? handlePopupConfirm : closePopup}
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
            </div>
    );
}

export default SimulatorManagement;
