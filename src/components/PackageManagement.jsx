import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getPackages, createPackage, updatePackage, deletePackage } from '../store/slices/adminSlice';
import { getStaff } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';

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
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <button 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                            onClick={() => setShowForm(true)}
                        >
                            Add Package
                        </button>
                    </div>
                </div>

                {/* Package Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }} onClick={() => {
                        setShowForm(false);
                        setEditingPackage(null);
                        setFormData(emptyForm);
                    }}>
                        <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {editingPackage ? 'Edit Package' : 'Add Package'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Package Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            rows="4"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.price}
                                            onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Sessions Included
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.session_count}
                                                onChange={(e) => setFormData({...formData, session_count: parseInt(e.target.value, 10) || 1})}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Session Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="15"
                                                step="15"
                                                value={formData.session_duration_minutes}
                                                onChange={(e) => setFormData({...formData, session_duration_minutes: parseInt(e.target.value, 10) || 60})}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Redirect URL (Optional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.redirect_url}
                                            onChange={(e) => setFormData({...formData, redirect_url: e.target.value})}
                                            placeholder="https://example.com/redirect"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            URL to redirect users to after purchasing this package
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assigned Staff
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-4">
                                            {staff.map(staffMember => (
                                                <label key={staffMember.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.staff_members.includes(staffMember.id)}
                                                        onChange={() => handleStaffSelection(staffMember.id)}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">
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
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <label className="ml-2 text-sm font-medium text-gray-700">
                                            Active
                                        </label>
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="submit" 
                                            disabled={submitLoading}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                                        >
                                            {submitLoading
                                                ? (editingPackage ? 'Updating...' : 'Creating...')
                                                : `${editingPackage ? 'Update' : 'Create'} Package`}
                                        </button>
                                        <button 
                                            type="button" 
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditingPackage(null);
                                                setFormData(emptyForm);
                                            }}
                                        >
                                            Cancel
                                        </button>
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
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {packages.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No packages found. Add your first package.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sessions
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Session Length
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Redirect URL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Staff Members
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {packages.map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {pkg.title}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {pkg.description}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${pkg.price}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {pkg.session_count}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {pkg.session_duration_minutes} min
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">
                                                    {pkg.redirect_url ? (
                                                        <a 
                                                            href={pkg.redirect_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 underline"
                                                        >
                                                            {truncateUrl(pkg.redirect_url, 20)}
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {pkg.staff_members_details?.map(staff => (
                                                            <span key={staff.id} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                                {staff.first_name} {staff.last_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        pkg.is_active 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {pkg.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            className="text-blue-600 hover:text-blue-900"
                                                            onClick={() => handleEdit(pkg)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className={`${
                                                                pkg.is_active 
                                                                    ? 'text-orange-600 hover:text-orange-900' 
                                                                    : 'text-green-600 hover:text-green-900'
                                                            }`}
                                                            onClick={() => handleToggleActive(pkg.id, pkg.is_active)}
                                                        >
                                                            {pkg.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button 
                                                            className="text-red-600 hover:text-red-900"
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
