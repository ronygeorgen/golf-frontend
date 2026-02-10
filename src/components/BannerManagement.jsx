import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { endpoints } from '../api/endpoints';
import { Trash2, Edit2, Plus, GripVertical, AlertCircle, Info, Megaphone } from 'lucide-react';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import { TableSkeleton } from './skeletons/SkeletonLoader';

function BannerManagement() {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentBanner, setCurrentBanner] = useState(null);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const { toast, showSuccess, showError, hideToast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        text: '',
        color: 'blue',
        is_active: true
    });

    const colors = [
        { value: 'red', label: 'Red (Emergency)', class: 'bg-red-100 text-red-900 border-red-300' },
        { value: 'yellow', label: 'Yellow (Alert)', class: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
        { value: 'blue', label: 'Blue (Information)', class: 'bg-blue-100 text-blue-900 border-blue-300' },
    ];

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await axios.get(endpoints.admin.banners.list);
            setBanners(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching banners:', err);
            setError('Failed to load banners');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (banner = null) => {
        if (banner) {
            setCurrentBanner(banner);
            setFormData({
                text: banner.text,
                color: banner.color,
                is_active: banner.is_active
            });
        } else {
            setCurrentBanner(null);
            setFormData({
                text: '',
                color: 'blue',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentBanner(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (currentBanner) {
                await axios.put(endpoints.admin.banners.update(currentBanner.id), formData);
                showSuccess('Banner updated successfully');
            } else {
                await axios.post(endpoints.admin.banners.create, formData);
                showSuccess('Banner created successfully');
            }
            fetchBanners();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving banner:', err);
            showError('Failed to save banner');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleOpenDeleteModal = (banner) => {
        setBannerToDelete(banner);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setBannerToDelete(null);
    };

    const confirmDelete = async () => {
        if (!bannerToDelete) return;

        try {
            await axios.delete(endpoints.admin.banners.delete(bannerToDelete.id));
            showSuccess('Banner deleted successfully');
            fetchBanners();
            handleCloseDeleteModal();
        } catch (err) {
            console.error('Error deleting banner:', err);
            showError('Failed to delete banner');
        }
    };

    const getPreviewClass = (color) => {
        const colorObj = colors.find(c => c.value === color);
        return colorObj ? colorObj.class : '';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-text-secondary mt-1">Create and manage announcement banners. Only one banner can be active at a time.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add New Banner</span>
                </button>
            </div>

            {loading ? (
                <TableSkeleton rows={5} cols={4} />
            ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
            ) : banners.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-lg border border-border">
                    <Megaphone className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-text-primary">No Banners Found</h3>
                    <p className="text-text-secondary mt-1 max-w-sm mx-auto">
                        Get started by creating your first announcement banner.
                    </p>
                </div>
            ) : (
                <div className="bg-surface rounded-lg border border-border overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Preview</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {banners.map((banner) => (
                                <tr key={banner.id} className="hover:bg-background-secondary/50">
                                    <td className="px-6 py-4">
                                        <div className={`inline-block px-4 py-1 rounded text-sm font-medium ${getPreviewClass(banner.color)}`}>
                                            {banner.text}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${banner.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {banner.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {new Date(banner.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleOpenModal(banner)}
                                            className="text-primary hover:text-primary-dark mr-4"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenDeleteModal(banner)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
                        <h3 className="text-lg font-bold text-text-primary mb-4">
                            {currentBanner ? 'Edit Banner' : 'Create New Banner'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Banner Text
                                </label>
                                <input
                                    type="text"
                                    value={formData.text}
                                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                                    placeholder="Enter announcement text..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Urgency / Color
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {colors.map((colorOption) => (
                                        <label
                                            key={colorOption.value}
                                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${formData.color === colorOption.value
                                                ? 'border-primary ring-1 ring-primary bg-primary/5'
                                                : 'border-border hover:bg-background-secondary'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="color"
                                                value={colorOption.value}
                                                checked={formData.color === colorOption.value}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded-full mr-3 ${colorOption.value === 'red' ? 'bg-red-500' :
                                                colorOption.value === 'yellow' ? 'bg-yellow-500' : 'bg-blue-500'
                                                }`} />
                                            <span className="text-sm font-medium text-text-primary">
                                                {colorOption.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                                />
                                <label htmlFor="is_active" className="ml-2 block text-sm text-text-primary">
                                    Set as Active Banner
                                </label>
                            </div>
                            <p className="text-xs text-text-secondary ml-6">
                                Note: Activating this banner will automatically deactivate any other active banner.
                            </p>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background-secondary rounded-lg transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : (currentBanner ? 'Update Banner' : 'Create Banner')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-bold text-text-primary">Delete Banner</h3>
                        </div>

                        <p className="text-text-secondary mb-6">
                            Are you sure you want to delete this banner? This action cannot be undone.
                        </p>

                        {bannerToDelete && (
                            <div className="mb-6 p-3 bg-background-secondary rounded-lg border border-border">
                                <p className="text-sm font-medium text-text-primary">{bannerToDelete.text}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCloseDeleteModal}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background-secondary rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Delete Banner
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

export default BannerManagement;
