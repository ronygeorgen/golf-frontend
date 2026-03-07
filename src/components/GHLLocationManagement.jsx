import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import { Edit, X, Globe } from 'lucide-react';
import apiClient from '../api/axios';
import { endpoints } from '../api/endpoints';

// Common IANA timezones for the dropdown
const COMMON_TIMEZONES = [
    { value: 'America/St_Johns', label: "St. John's — Newfoundland Time (UTC−3:30/−2:30)" },
    { value: 'America/Halifax', label: "Halifax / Moncton — Atlantic Time (UTC−4/−3)" },
    { value: 'America/Toronto', label: "Toronto / Montréal / Ottawa — Eastern Time (UTC−5/−4)" },
    { value: 'America/Winnipeg', label: "Winnipeg — Central Time (UTC−6/−5)" },
    { value: 'America/Edmonton', label: "Calgary / Edmonton — Mountain Time (UTC−7/−6)" },
    { value: 'America/Vancouver', label: "Vancouver / Victoria — Pacific Time (UTC−8/−7)" },
    { value: 'America/Phoenix', label: "Phoenix — Mountain Standard (UTC−7, no DST)" },
    { value: 'America/New_York', label: "New York — Eastern Time (UTC−5/−4)" },
    { value: 'America/Chicago', label: "Chicago — Central Time (UTC−6/−5)" },
    { value: 'America/Denver', label: "Denver — Mountain Time (UTC−7/−6)" },
    { value: 'America/Los_Angeles', label: "Los Angeles — Pacific Time (UTC−8/−7)" },
    { value: 'Europe/London', label: "London — GMT/BST (UTC+0/+1)" },
    { value: 'Europe/Paris', label: "Paris / Berlin — CET/CEST (UTC+1/+2)" },
    { value: 'Europe/Dublin', label: "Dublin — IST/GMT (UTC+0/+1)" },
    { value: 'Asia/Dubai', label: "Dubai — GST (UTC+4, no DST)" },
    { value: 'Asia/Kolkata', label: "India — IST (UTC+5:30, no DST)" },
    { value: 'Asia/Singapore', label: "Singapore — SGT (UTC+8, no DST)" },
    { value: 'Asia/Tokyo', label: "Tokyo — JST (UTC+9, no DST)" },
    { value: 'Australia/Sydney', label: "Sydney — AEST/AEDT (UTC+10/+11)" },
    { value: 'Pacific/Auckland', label: "Auckland — NZST/NZDT (UTC+12/+13)" },
    { value: 'UTC', label: "UTC — Universal Coordinated Time" },
];

function GHLLocationManagement() {
    const { user } = useAppSelector((state) => state.auth);
    const { popup, openPopup, closePopup } = usePopup();
    const modalRef = useRef(null);

    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [timezone, setTimezone] = useState('America/Halifax');
    const [timezoneSearch, setTimezoneSearch] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    const isSuperadmin = user?.role === 'superadmin';

    // Filtered timezone list based on search
    const filteredTimezones = timezoneSearch.trim()
        ? COMMON_TIMEZONES.filter(tz =>
            tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
            tz.value.toLowerCase().includes(timezoneSearch.toLowerCase())
        )
        : COMMON_TIMEZONES;

    useEffect(() => {
        if (isSuperadmin) {
            fetchLocations();
        }
    }, [isSuperadmin]);

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(endpoints.ghl.admin.locations);
            if (response.data && response.data.locations) {
                setLocations(response.data.locations);
            }
        } catch (error) {
            console.error('Failed to fetch GHL locations:', error);
            openPopup({
                type: 'error',
                title: 'Error',
                message: 'Failed to fetch locations. Please try again.',
                confirmText: 'OK',
                showCancel: false,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (location) => {
        setEditingLocation(location);
        setCompanyName(location.company_name || '');
        setTimezone(location.timezone || 'America/Halifax');
        setTimezoneSearch('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editingLocation) return;

        setSubmitLoading(true);
        try {
            const response = await apiClient.put(
                endpoints.ghl.admin.updateCompanyName(editingLocation.location_id),
                { company_name: companyName, timezone }
            );

            if (response.data) {
                // Update the location in the list
                setLocations(locations.map(loc =>
                    loc.location_id === editingLocation.location_id
                        ? { ...loc, company_name: companyName, timezone }
                        : loc
                ));

                openPopup({
                    type: 'success',
                    title: 'Success',
                    message: 'Location settings updated successfully.',
                    confirmText: 'OK',
                    showCancel: false,
                });

                setShowForm(false);
                setEditingLocation(null);
                setCompanyName('');
                setTimezone('America/Halifax');
            }
        } catch (error) {
            console.error('Failed to update location settings:', error);
            openPopup({
                type: 'error',
                title: 'Error',
                message: error.response?.data?.error || 'Failed to update location settings. Please try again.',
                confirmText: 'OK',
                showCancel: false,
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleClose = () => {
        setShowForm(false);
        setEditingLocation(null);
        setCompanyName('');
        setTimezone('America/Halifax');
        setTimezoneSearch('');
    };

    // Get a user-friendly timezone label
    const getTimezoneLabel = (tzValue) => {
        const found = COMMON_TIMEZONES.find(tz => tz.value === tzValue);
        return found ? found.label : tzValue || '—';
    };

    if (!isSuperadmin) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6">
                <p className="text-text-secondary">You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <>
            <div>

                {/* Edit Form Modal */}
                {showForm && editingLocation && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }}
                        onClick={handleClose}>
                        <div ref={modalRef}
                            className="bg-surface rounded-card shadow-xl max-w-lg w-full"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-text-primary">
                                        Edit Location Settings
                                    </h2>
                                    <button
                                        onClick={handleClose}
                                        className="text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Location ID
                                        </label>
                                        <input
                                            type="text"
                                            value={editingLocation.location_id}
                                            disabled
                                            className="w-full px-4 py-3 border border-border rounded-button bg-background text-text-secondary cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Enter company name"
                                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            required
                                        />
                                    </div>

                                    {/* Timezone Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            <Globe className="inline w-4 h-4 mr-1 -mt-0.5" />
                                            Timezone
                                        </label>
                                        <p className="text-xs text-text-secondary mb-2">
                                            All bookings and availability for this center will use this timezone. DST is handled automatically.
                                        </p>
                                        {/* Search box */}
                                        <input
                                            type="text"
                                            value={timezoneSearch}
                                            onChange={(e) => setTimezoneSearch(e.target.value)}
                                            placeholder="Search timezone..."
                                            className="w-full px-3 py-2 border border-border rounded-button bg-background text-text-primary text-sm mb-1 focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                        <select
                                            value={timezone}
                                            onChange={(e) => {
                                                setTimezone(e.target.value);
                                                setTimezoneSearch('');
                                            }}
                                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            size={5}
                                        >
                                            {filteredTimezones.map(tz => (
                                                <option key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </select>
                                        {timezone && (
                                            <p className="text-xs text-primary mt-1">
                                                Selected: <strong>{timezone}</strong>
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="submit"
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading ? 'Updating...' : 'Update'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={handleClose}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Locations List */}
                {loading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-surface rounded-card shadow-card overflow-hidden">
                        {locations.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-text-secondary text-lg">No locations found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Location ID
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Company Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Timezone
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
                                        {locations.map((location) => (
                                            <tr key={location.location_id} className="hover:bg-background transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                                    {location.location_id}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {location.company_name || <span className="text-text-secondary italic">Not set</span>}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                        <span className="truncate max-w-[200px]" title={getTimezoneLabel(location.timezone)}>
                                                            {location.timezone || 'America/Halifax'}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {location.status || 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        className="p-2 text-primary hover:text-primary-light hover:bg-primary-light/10 rounded-button transition-colors"
                                                        onClick={() => handleEdit(location)}
                                                        aria-label="Edit location settings"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
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
                onConfirm={popup.onConfirm ? () => { popup.onConfirm(); closePopup(); } : closePopup}
                onClose={closePopup}
            />
        </>
    );
}

export default GHLLocationManagement;
