import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import useToast from '../hooks/useToast';
import Toast from './ui/Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Edit, Trash2, Plus, X, Bold, Italic, Type, Loader2, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

function LiabilityWaiverManagement() {
    const { popup, openPopup, closePopup } = usePopup();
    const { toast, showSuccess, showError, hideToast } = useToast();
    const { user } = useAppSelector((state) => state.auth);
    const modalRef = useRef(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.is_superuser === true;

    const [waivers, setWaivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingWaiver, setEditingWaiver] = useState(null);
    const [formData, setFormData] = useState({
        content: [{ type: 'paragraph', text: '', bold: false, italic: false }],
        is_active: true,
    });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedWaiver, setSelectedWaiver] = useState(null);
    const [showContentModal, setShowContentModal] = useState(false);
    const [acceptances, setAcceptances] = useState([]);
    const [acceptancesLoading, setAcceptancesLoading] = useState(false);
    const [acceptancesPage, setAcceptancesPage] = useState(1);
    const [acceptancesTotalPages, setAcceptancesTotalPages] = useState(1);
    const [acceptancesCount, setAcceptancesCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        fetchWaivers();
    }, []);

    // Auto-select active waiver when waivers are loaded
    useEffect(() => {
        if (waivers.length > 0 && !selectedWaiver) {
            const activeWaiver = waivers.find(w => w.is_active);
            if (activeWaiver) {
                setSelectedWaiver(activeWaiver);
                setSearchInput('');
                setSearchQuery('');
                setAcceptancesPage(1);
                fetchAcceptances(activeWaiver.id, 1, '');
            } else if (waivers.length > 0) {
                // If no active waiver, select the most recent one
                const mostRecent = waivers[0];
                setSelectedWaiver(mostRecent);
                setSearchInput('');
                setSearchQuery('');
                setAcceptancesPage(1);
                fetchAcceptances(mostRecent.id, 1, '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waivers]);

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                handleClose();
            }
        };

        if (showForm) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showForm]);

    const fetchWaivers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(endpoints.admin.liabilityWaiver.list);
            setWaivers(response.data);
        } catch (error) {
            console.error('Error fetching waivers:', error);
            showError('Failed to load liability waivers');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowForm(false);
        setEditingWaiver(null);
        setFormData({
            content: [{ type: 'paragraph', text: '', bold: false, italic: false }],
            is_active: true,
        });
    };

    const handleAddContentItem = () => {
        setFormData({
            ...formData,
            content: [...formData.content, { type: 'paragraph', text: '', bold: false, italic: false }]
        });
    };

    const handleRemoveContentItem = (index) => {
        if (formData.content.length > 1) {
            const newContent = formData.content.filter((_, i) => i !== index);
            setFormData({ ...formData, content: newContent });
        }
    };

    const handleContentChange = (index, field, value) => {
        const newContent = [...formData.content];
        newContent[index] = { ...newContent[index], [field]: value };
        setFormData({ ...formData, content: newContent });
    };

    const handleToggleFormat = (index, format) => {
        const newContent = [...formData.content];
        newContent[index] = { ...newContent[index], [format]: !newContent[index][format] };
        setFormData({ ...formData, content: newContent });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate content
        const hasContent = formData.content.some(item => item.text.trim() !== '');
        if (!hasContent) {
            showError('Please add at least one content item with text');
            return;
        }

        // Filter out empty content items
        const filteredContent = formData.content.filter(item => item.text.trim() !== '');

        setSubmitLoading(true);
        try {
            const submitData = {
                content: filteredContent,
                is_active: formData.is_active,
            };

            if (editingWaiver) {
                await apiClient.patch(endpoints.admin.liabilityWaiver.update(editingWaiver.id), submitData);
                showSuccess('Waiver updated successfully');
            } else {
                await apiClient.post(endpoints.admin.liabilityWaiver.create, submitData);
                showSuccess('Waiver created successfully');
            }
            
            handleClose();
            await fetchWaivers();
        } catch (error) {
            console.error('Error saving waiver:', error);
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.is_active?.[0] ||
                                'Failed to save waiver';
            showError(errorMessage);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEdit = (waiver) => {
        setEditingWaiver(waiver);
        setFormData({
            content: waiver.content && waiver.content.length > 0 
                ? waiver.content 
                : [{ type: 'paragraph', text: '', bold: false, italic: false }],
            is_active: waiver.is_active,
        });
        setShowForm(true);
    };

    const handleDelete = (waiver) => {
        openPopup({
            type: 'warning',
            title: 'Delete Waiver',
            message: 'Are you sure you want to delete this waiver? This action cannot be undone.',
            showCancel: true,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                closePopup();
                try {
                    await apiClient.delete(endpoints.admin.liabilityWaiver.delete(waiver.id));
                    showSuccess('Waiver deleted successfully');
                    await fetchWaivers();
                } catch (error) {
                    console.error('Error deleting waiver:', error);
                    showError('Failed to delete waiver');
                }
            },
        });
    };

    const renderContent = (content, preview = false) => {
        if (!content || !Array.isArray(content)) {
            return <p className="text-text-secondary">No content</p>;
        }

        const contentToRender = preview && content.length > 0 
            ? [{ ...content[0], text: content[0].text.length > 100 ? content[0].text.substring(0, 100) + '...' : content[0].text }]
            : content;

        return contentToRender.map((item, index) => {
            const { type, text, bold, italic } = item;
            const className = [];
            
            if (type === 'heading') {
                className.push('text-lg font-bold mb-2');
            } else {
                className.push('mb-2');
            }
            
            if (bold) className.push('font-bold');
            if (italic) className.push('italic');
            
            return (
                <p key={index} className={className.join(' ')}>
                    {text}
                </p>
            );
        });
    };

    const handleViewContent = (waiver) => {
        setSelectedWaiver(waiver);
        setShowContentModal(true);
    };

    const fetchAcceptances = async (waiverId, page = 1, search = '') => {
        setAcceptancesLoading(true);
        try {
            const params = { page, page_size: 10 };
            if (search) {
                params.search = search;
            }
            const response = await apiClient.get(endpoints.admin.liabilityWaiver.acceptances(waiverId), { params });
            setAcceptances(response.data.users || []);
            setAcceptancesTotalPages(response.data.total_pages || 1);
            setAcceptancesCount(response.data.count || 0);
            setAcceptancesPage(page);
        } catch (error) {
            console.error('Error fetching acceptances:', error);
            showError('Failed to load user acceptances');
        } finally {
            setAcceptancesLoading(false);
        }
    };

    // Debounced search handler
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchInput(value);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
            if (selectedWaiver) {
                setSearchQuery(value);
                setAcceptancesPage(1);
                fetchAcceptances(selectedWaiver.id, 1, value);
            }
        }, 500); // 500ms debounce delay
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleWaiverSelect = (waiver) => {
        setSelectedWaiver(waiver);
        setSearchInput('');
        setSearchQuery('');
        setAcceptancesPage(1);
        fetchAcceptances(waiver.id, 1, '');
    };

    if (!isAdmin) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6">
                <p className="text-text-secondary">You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <>
            <div>
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <h1 className="text-2xl font-bold text-text-primary mb-4 md:mb-0">Manage Liability Waiver</h1>
                        <Button
                            onClick={() => {
                                // Check if there's already an active waiver
                                const hasActive = waivers.some(w => w.is_active);
                                if (hasActive) {
                                    openPopup({
                                        type: 'warning',
                                        title: 'Active Waiver Exists',
                                        message: 'An active waiver already exists. Only one active waiver can exist at a time. Please deactivate the existing waiver first or update it instead.',
                                        showCancel: false,
                                        confirmText: 'OK',
                                        onConfirm: closePopup,
                                    });
                                } else {
                                    handleClose();
                                    setShowForm(true);
                                }
                            }}
                            variant="primary"
                            disabled={waivers.some(w => w.is_active) && !editingWaiver}
                        >
                            <span className="flex items-center whitespace-nowrap">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Waiver
                            </span>
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {waivers.length === 0 ? (
                            <div className="p-6 text-center text-text-secondary">
                                <p>No waivers found. Create one to get started.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-background border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Content Preview</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Created</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Updated</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waivers.map((waiver) => (
                                            <tr key={waiver.id} className="border-b border-border hover:bg-background">
                                                <td className="px-4 py-3">
                                                    <Badge variant={waiver.is_active ? 'success' : 'secondary'}>
                                                        {waiver.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="max-w-md">
                                                        <button
                                                            onClick={() => handleViewContent(waiver)}
                                                            className="text-left hover:text-primary transition-colors cursor-pointer"
                                                        >
                                                            {renderContent(waiver.content, true)}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    {new Date(waiver.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    {new Date(waiver.updated_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(waiver)}
                                                            className="p-2 text-primary hover:bg-primary-light/10 rounded-button transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(waiver)}
                                                            className="p-2 text-danger hover:bg-danger/10 rounded-button transition-colors"
                                                            title="Delete"
                                                        >
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
                )}

                {/* User Acceptances Section */}
                {waivers.length > 0 && (
                    <div className="mt-8 bg-surface rounded-card shadow-card p-4 md:p-6">
                        <h2 className="text-xl font-bold text-text-primary mb-4">User Acceptances</h2>
                        
                        {/* Waiver Selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                View Acceptances For:
                            </label>
                            <select
                                value={selectedWaiver?.id || ''}
                                onChange={(e) => {
                                    const waiver = waivers.find(w => w.id === parseInt(e.target.value));
                                    if (waiver) {
                                        handleWaiverSelect(waiver);
                                    }
                                }}
                                className="w-full md:w-auto px-4 py-2 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                            >
                                {waivers.map((waiver) => (
                                    <option key={waiver.id} value={waiver.id}>
                                        {waiver.is_active ? '✓ Active - ' : ''}Created {new Date(waiver.created_at).toLocaleDateString()} {waiver.is_active ? '(Current)' : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-text-secondary">
                                Select which waiver to view user acceptance data for
                            </p>
                        </div>

                        {selectedWaiver && (
                            <>
                                {/* Search */}
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={handleSearchChange}
                                        placeholder="Search by name, email, or phone..."
                                        className="w-full px-4 py-2 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                    />
                                </div>

                                {/* Acceptances Table */}
                                {acceptancesLoading ? (
                                    <TableSkeleton />
                                ) : (
                                    <>
                                        <div className="mb-4 text-sm text-text-secondary">
                                            Showing {acceptances.length} of {acceptancesCount} users
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-background border-b border-border">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Name</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Email</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Phone</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Status</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Accepted At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {acceptances.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="px-4 py-6 text-center text-text-secondary">
                                                                No users found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        acceptances.map((user) => (
                                                            <tr key={user.id} className="border-b border-border hover:bg-background">
                                                                <td className="px-4 py-3">
                                                                    {user.first_name} {user.last_name}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                                    {user.email || '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                                    {user.phone}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={user.accepted ? 'success' : 'secondary'}>
                                                                        {user.accepted ? (user.content_changed ? 'Accepted (Content Changed)' : 'Accepted') : 'Not Accepted'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                                    {user.accepted_at 
                                                                        ? new Date(user.accepted_at).toLocaleString()
                                                                        : '-'
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {acceptancesTotalPages > 1 && (
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="text-sm text-text-secondary">
                                                    Page {acceptancesPage} of {acceptancesTotalPages}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => {
                                                            const newPage = acceptancesPage - 1;
                                                            setAcceptancesPage(newPage);
                                                            fetchAcceptances(selectedWaiver.id, newPage, searchQuery);
                                                        }}
                                                        disabled={acceptancesPage === 1 || acceptancesLoading}
                                                        variant="secondary"
                                                    >
                                                        <span className="flex items-center whitespace-nowrap">
                                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                                            Previous
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            const newPage = acceptancesPage + 1;
                                                            setAcceptancesPage(newPage);
                                                            fetchAcceptances(selectedWaiver.id, newPage, searchQuery);
                                                        }}
                                                        disabled={acceptancesPage >= acceptancesTotalPages || acceptancesLoading}
                                                        variant="secondary"
                                                    >
                                                        <span className="flex items-center whitespace-nowrap">
                                                            Next
                                                            <ChevronRight className="w-4 h-4 ml-1" />
                                                        </span>
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Content Preview Modal */}
                {showContentModal && selectedWaiver && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" 
                         style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)' }} 
                         onClick={() => setShowContentModal(false)}>
                        <div className="bg-surface rounded-card shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" 
                             onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-text-primary">Waiver Content</h2>
                                <button
                                    onClick={() => setShowContentModal(false)}
                                    className="text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="text-text-primary">
                                {renderContent(selectedWaiver.content, false)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" 
                         style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)' }} 
                         onClick={handleClose}>
                        <div ref={modalRef} 
                             className="bg-surface rounded-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
                             onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-text-primary">
                                        {editingWaiver ? 'Edit Waiver' : 'Create Waiver'}
                                    </h2>
                                    <button
                                        onClick={handleClose}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Content
                                        </label>
                                        <div className="space-y-4">
                                            {formData.content.map((item, index) => (
                                                <div key={index} className="border border-border rounded-card p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleContentChange(index, 'type', item.type === 'heading' ? 'paragraph' : 'heading')}
                                                                className={`p-2 rounded-button transition-colors ${
                                                                    item.type === 'heading' 
                                                                        ? 'bg-primary text-white' 
                                                                        : 'bg-background text-text-secondary hover:bg-background'
                                                                }`}
                                                                title={item.type === 'heading' ? 'Heading' : 'Paragraph'}
                                                            >
                                                                <Type className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleFormat(index, 'bold')}
                                                                className={`p-2 rounded-button transition-colors ${
                                                                    item.bold 
                                                                        ? 'bg-primary text-white' 
                                                                        : 'bg-background text-text-secondary hover:bg-background'
                                                                }`}
                                                                title="Bold"
                                                            >
                                                                <Bold className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleFormat(index, 'italic')}
                                                                className={`p-2 rounded-button transition-colors ${
                                                                    item.italic 
                                                                        ? 'bg-primary text-white' 
                                                                        : 'bg-background text-text-secondary hover:bg-background'
                                                                }`}
                                                                title="Italic"
                                                            >
                                                                <Italic className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        {formData.content.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveContentItem(index)}
                                                                className="p-2 text-danger hover:bg-danger/10 rounded-button transition-colors"
                                                                title="Remove"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <textarea
                                                        value={item.text}
                                                        onChange={(e) => handleContentChange(index, 'text', e.target.value)}
                                                        placeholder={item.type === 'heading' ? 'Enter heading text...' : 'Enter paragraph text...'}
                                                        className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary min-h-[100px]"
                                                        required
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleAddContentItem}
                                            className="mt-4"
                                        >
                                            <span className="flex items-center whitespace-nowrap">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Content Line
                                            </span>
                                        </Button>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                                        />
                                        <label htmlFor="is_active" className="text-sm text-text-primary">
                                            Active (show to users during login)
                                        </label>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleClose}
                                            className="flex-1"
                                            disabled={submitLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="flex-1"
                                            disabled={submitLoading}
                                        >
                                            {submitLoading ? (
                                                <span className="flex items-center whitespace-nowrap">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Saving...
                                                </span>
                                            ) : (
                                                <span className="whitespace-nowrap">
                                                    {editingWaiver ? 'Update Waiver' : 'Create Waiver'}
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </form>
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
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={hideToast}
                    />
                </div>
            )}
        </>
    );
}

export default LiabilityWaiverManagement;

