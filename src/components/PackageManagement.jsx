import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getPackages, createPackage, updatePackage, deletePackage } from '../store/slices/adminSlice';
import { getStaff } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import Badge from './ui/Badge';

function PackageManagement() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: packages, loading: packagesLoading } = useAppSelector((state) => state.admin.packages);
    const { list: staff } = useAppSelector((state) => state.admin.staff);
    const modalRef = useRef(null);
    
    const [showForm, setShowForm] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const emptyForm = {
        title: '',
        description: '',
        price: '',
        staff_members: [],
        session_count: 5,
        session_duration_minutes: 60,
        redirect_url: '',
        is_active: true
    };
    const [formData, setFormData] = useState(emptyForm);
    const [submitLoading, setSubmitLoading] = useState(false);
    const handlePopupConfirm = async () => {
        const action = popup.onConfirm;
        closePopup();
        if (action) {
            await action();
        }
    };

    useEffect(() => {
        dispatch(getPackages());
        dispatch(getStaff());
    }, [dispatch]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Filter out null, undefined, or invalid staff member IDs
        const cleanedStaffMembers = formData.staff_members.filter(
            id => id !== null && id !== undefined && !isNaN(id)
        );
        
        const cleanedFormData = {
            ...formData,
            staff_members: cleanedStaffMembers
        };

        setSubmitLoading(true);
        try {
            if (editingPackage) {
                await dispatch(updatePackage({ id: editingPackage.id, packageData: cleanedFormData }));
            } else {
                await dispatch(createPackage(cleanedFormData));
            }
            setShowForm(false);
            setEditingPackage(null);
            setFormData(emptyForm);
            // No need to refetch - Redux already updates the state optimistically
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (pkg) => {
        setEditingPackage(pkg);
        // Safely extract staff member IDs from staff_members_details (full objects) or staff_members (IDs)
        const staffMembers = pkg.staff_members_details || pkg.staff_members || [];
        const staffMemberIds = staffMembers
            .map(staff => {
                // If staff is an object, get the id, otherwise it's already an ID
                return typeof staff === 'object' ? staff?.id : staff;
            })
            .filter(id => id !== null && id !== undefined && !isNaN(id));
        
        setFormData({
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            staff_members: staffMemberIds,
            session_count: pkg.session_count || 1,
            session_duration_minutes: pkg.session_duration_minutes || 60,
            redirect_url: pkg.redirect_url || '',
            is_active: pkg.is_active
        });
        setShowForm(true);
    };

    const handleStaffSelection = (staffId) => {
        const updatedStaff = formData.staff_members.includes(staffId)
            ? formData.staff_members.filter(id => id !== staffId)
            : [...formData.staff_members, staffId];
        
        setFormData({...formData, staff_members: updatedStaff});
    };

    const handleToggleActive = async (packageId, isActive) => {
        await dispatch(updatePackage({ id: packageId, packageData: { is_active: !isActive } }));
        // No need to refetch - Redux already updates the state optimistically
    };

    const handleDelete = async (packageId) => {
        openPopup({
            type: 'warning',
            title: 'Delete package?',
            message: 'This will remove the package and its assigned staff.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                await dispatch(deletePackage(packageId));
            },
        });
    };

    const truncateUrl = (url, maxLength = 15) => {
        try {
          // Remove protocol (http:// or https://)
          const noProtocol = url.replace(/^https?:\/\//, '');
      
          // If noProtocol is shorter than maxLength, just return it
          if (noProtocol.length <= maxLength) return noProtocol;
      
          // Truncate with ellipsis, preserving start and some of the path
          return noProtocol.slice(0, maxLength - 3) + '...';
        } catch {
          return url;
        }
      }
      

    return (
        <>
        <div className="max-w-7xl mx-auto">
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <Button 
                            onClick={() => setShowForm(true)}
                            variant="primary"
                        >
                            Add Package
                        </Button>
                    </div>
                </div>

                {/* Package Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingPackage(null);
                        setFormData(emptyForm);
                    }}>
                        <div ref={modalRef} className="bg-surface rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-text-primary mb-6">
                                    {editingPackage ? 'Edit Package' : 'Add Package'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Package Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                                            rows="4"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Sessions Included
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.session_count}
                                                onChange={(e) => setFormData({...formData, session_count: parseInt(e.target.value, 10) || 1})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-2">
                                                Session Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="15"
                                                step="15"
                                                value={formData.session_duration_minutes}
                                                onChange={(e) => setFormData({...formData, session_duration_minutes: parseInt(e.target.value, 10) || 60})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Redirect URL (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.redirect_url}
                                            onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                                            placeholder="https://example.com/redirect"
                                        />
                                        <p className="mt-1 text-xs text-text-secondary">
                                            URL to redirect users to after purchasing this package
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Assigned Staff
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border rounded-lg p-4">
                                            {staff.map(staffMember => (
                                                <label key={staffMember.id} className="flex items-center space-x-2 cursor-pointer hover:bg-background p-2 rounded transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.staff_members.includes(staffMember.id)}
                                                        onChange={() => handleStaffSelection(staffMember.id)}
                                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-text-primary">
                                                        {staffMember.first_name} {staffMember.last_name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
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
                                    <div className="flex gap-4 pt-4">
                                        <Button 
                                            type="submit" 
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading
                                                ? (editingPackage ? 'Updating...' : 'Creating...')
                                                : `${editingPackage ? 'Update' : 'Create'} Package`}
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingPackage(null);
                                                setFormData(emptyForm);
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

                {/* Packages List */}
                {packagesLoading ? (
                    <TableSkeleton rows={5} cols={6} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {packages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No packages found. Add your first package.</p>
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
                                                Sessions
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Session Length
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Redirect URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Staff Members
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
                                                <td className="px-4 py-4 text-sm text-text-secondary max-w-xs truncate">
                                                    {pkg.description}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-accent">
                                                    ${pkg.price}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.session_count}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {pkg.session_duration_minutes} min
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-primary max-w-xs truncate">
                                                    {pkg.redirect_url ? (
                                                        <a 
                                                            href={pkg.redirect_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary-light underline transition-colors"
                                                        >
                                                            {truncateUrl(pkg.redirect_url, 20)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-text-secondary">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {pkg.staff_members_details?.map(staff => (
                                                            <Badge key={staff.id} status="pending">
                                                                {staff.first_name} {staff.last_name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={pkg.is_active ? 'confirmed' : 'cancelled'}>
                                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            className="text-primary hover:text-primary-light transition-colors"
                                                            onClick={() => handleEdit(pkg)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className={`${
                                                                pkg.is_active 
                                                                    ? 'text-accent hover:text-accent-dark' 
                                                                    : 'text-status-confirmed-text hover:text-status-confirmed-text/80'
                                                            } transition-colors`}
                                                            onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                                                        >
                                                            {pkg.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button 
                                                            className="text-danger hover:text-danger-light transition-colors"
                                                            onClick={() => handleDelete(pkg.id)}
                                                        >
                                                            Delete
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
            </div>
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
        </>
    );
}

export default PackageManagement;
