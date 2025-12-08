import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getUsers, toggleUserPause } from '../store/slices/adminSlice';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Pause, Play, Search, Filter } from 'lucide-react';

function UserManagement() {
    const dispatch = useAppDispatch();
    const { popup, openPopup, closePopup } = usePopup();
    const { list: users, loading, pagination } = useAppSelector((state) => state.admin.users);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [roleFilter, setRoleFilter] = useState('');
    const [pausedFilter, setPausedFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        const params = {
            page: currentPage,
            pageSize,
            role: roleFilter || null,
            isPaused: pausedFilter === '' ? null : pausedFilter === 'true',
            search: searchQuery || null,
        };
        dispatch(getUsers(params));
    }, [dispatch, currentPage, pageSize, roleFilter, pausedFilter, searchQuery]);

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setRoleFilter('');
        setPausedFilter('');
        setSearchInput('');
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleTogglePause = (user) => {
        const action = user.is_paused ? 'unpause' : 'pause';
        openPopup({
            type: 'warning',
            title: `${action === 'pause' ? 'Pause' : 'Unpause'} User?`,
            message: `This will ${action} the user account. ${action === 'pause' ? 'The user will not be able to login or access the system.' : 'The user will be able to login again.'}`,
            confirmText: action === 'pause' ? 'Pause' : 'Unpause',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                try {
                    const result = await dispatch(toggleUserPause(user.id));
                    if (toggleUserPause.fulfilled.match(result)) {
                        // Refetch users to get updated data
                        const params = {
                            page: currentPage,
                            pageSize,
                            role: roleFilter || null,
                            isPaused: pausedFilter === '' ? null : pausedFilter === 'true',
                            search: searchQuery || null,
                        };
                        await dispatch(getUsers(params));
                    } else {
                        // Show error if action failed
                        openPopup({
                            type: 'error',
                            title: 'Error',
                            message: result.payload?.error || result.payload?.message || 'Failed to update user status',
                            confirmText: 'OK',
                            showCancel: false,
                        });
                    }
                } catch (error) {
                    openPopup({
                        type: 'error',
                        title: 'Error',
                        message: 'An unexpected error occurred',
                        confirmText: 'OK',
                        showCancel: false,
                    });
                }
            },
        });
    };

    const totalPages = pagination?.totalPages || 1;
    const totalCount = pagination?.count || 0;
    const startIndex = ((currentPage - 1) * pageSize) + 1;
    const endIndex = Math.min(currentPage * pageSize, totalCount);

    const getRoleBadge = (role) => {
        const roleMap = {
            admin: 'danger',
            staff: 'warning',
            client: 'success',
        };
        return roleMap[role] || 'secondary';
    };

    return (
        <>
            <div>
                {/* Filters */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 mb-6">
                    {/* Desktop: Search + Button left, Filters right */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                        {/* Search input + Button on left */}
                        <div className="flex items-center gap-3 flex-1 max-w-md">
                            <div className="relative flex-1">
                                {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5 z-10 pointer-events-none" /> */}
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or phone..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-12 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <Button
                                onClick={handleSearch}
                                variant="primary"
                                className="px-6 whitespace-nowrap"
                            >
                                Search
                            </Button>
                        </div>

                        {/* Filters on right */}
                        <div className="flex items-center gap-3 ml-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-text-secondary flex-shrink-0" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => {
                                        setRoleFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
                                >
                                    <option value="">All Roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="staff">Staff</option>
                                    <option value="client">Client</option>
                                </select>
                            </div>

                            <select
                                value={pausedFilter}
                                onChange={(e) => {
                                    setPausedFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
                            >
                                <option value="">All Status</option>
                                <option value="false">Active</option>
                                <option value="true">Paused</option>
                            </select>

                            {(roleFilter || pausedFilter || searchQuery) && (
                                <Button
                                    onClick={handleClearFilters}
                                    variant="secondary"
                                    className="px-4 whitespace-nowrap"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Mobile: Search on top, Filters (Role & Status) on same line below */}
                    <div className="md:hidden space-y-3">
                        {/* Search Row */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <div className="relative">
                                    {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5 z-10 pointer-events-none" /> */}
                                    <input
                                        type="text"
                                        placeholder="Search by name, email, or phone..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full pl-12 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleSearch}
                                variant="primary"
                                className="px-4 whitespace-nowrap"
                            >
                                Search
                            </Button>
                        </div>

                        {/* Filters Row - Role and Status on same line */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Filter className="w-4 h-4 text-text-secondary flex-shrink-0" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => {
                                        setRoleFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="staff">Staff</option>
                                    <option value="client">Client</option>
                                </select>
                            </div>

                            <select
                                value={pausedFilter}
                                onChange={(e) => {
                                    setPausedFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Status</option>
                                <option value="false">Active</option>
                                <option value="true">Paused</option>
                            </select>

                            {(roleFilter || pausedFilter || searchQuery) && (
                                <Button
                                    onClick={handleClearFilters}
                                    variant="secondary"
                                    className="px-3 whitespace-nowrap"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    {loading ? (
                        <TableSkeleton rows={10} cols={6} />
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-text-secondary text-lg">No users found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Phone
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Role
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
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-background">
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-text-primary">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-xs text-text-secondary">
                                                        @{user.username}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                                                    {user.phone}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Badge status={getRoleBadge(user.role)}>
                                                        {user.role}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {user.is_paused ? (
                                                        <Badge status="danger">Paused</Badge>
                                                    ) : (
                                                        <Badge status="success">Active</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                    <Button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleTogglePause(user);
                                                        }}
                                                        variant={user.is_paused ? "primary" : "secondary"}
                                                        className="px-3 py-1 flex items-center gap-2"
                                                        type="button"
                                                    >
                                                        {user.is_paused ? (
                                                            <>
                                                                <Play className="w-4 h-4" />
                                                                Unpause
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Pause className="w-4 h-4" />
                                                                Pause
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t border-border">
                                    <p className="text-sm text-text-secondary">
                                        Showing {startIndex} - {endIndex} of {totalCount} users
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1 || loading}
                                            variant="secondary"
                                            className="px-3 py-1"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm font-medium text-text-primary">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage >= totalPages || loading}
                                            variant="primary"
                                            className="px-3 py-1"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
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
        </>
    );
}

export default UserManagement;

