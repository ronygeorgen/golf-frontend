import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { TableSkeleton } from './skeletons/SkeletonLoader';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import Button from './ui/Button';
import { Edit, X, Globe, Upload, Trash2, Image as ImageIcon, CheckCircle, Phone, Mail, Building2, Percent } from 'lucide-react';
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

// Target logo dimensions (same as the current design)
const LOGO_WIDTH = 912;
const LOGO_HEIGHT = 273;
const MAX_LOGO_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Resize an image File to LOGO_WIDTH × LOGO_HEIGHT using an offscreen canvas
 * then return a new Blob (PNG).  Returns a Promise<Blob>.
 */
function resizeImageToBlob(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = LOGO_WIDTH;
            canvas.height = LOGO_HEIGHT;
            const ctx = canvas.getContext('2d');
            // Fill white background (handles transparent PNGs)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, LOGO_WIDTH, LOGO_HEIGHT);
            // Draw image scaled to fit, centred, preserving aspect ratio
            const scale = Math.min(LOGO_WIDTH / img.width, LOGO_HEIGHT / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const offsetX = (LOGO_WIDTH - drawW) / 2;
            const offsetY = (LOGO_HEIGHT - drawH) / 2;
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        img.src = url;
    });
}

function GHLLocationManagement() {
    const { user } = useAppSelector((state) => state.auth);
    const { popup, openPopup, closePopup } = usePopup();
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [timezone, setTimezone] = useState('America/Halifax');
    const [timezoneSearch, setTimezoneSearch] = useState('');
    const [timezoneOpen, setTimezoneOpen] = useState(false);
    const timezoneDropdownRef = useRef(null);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Invoice contact fields
    const [contactPhone, setContactPhone] = useState('');
    const [supportEmail, setSupportEmail] = useState('');
    const [businessId, setBusinessId] = useState('');

    // Tax rate field (stored/sent as decimal 0–1, displayed/edited as percentage 0–100)
    const [taxRatePercent, setTaxRatePercent] = useState('14');

    // Logo upload state
    const [logoPreview, setLogoPreview] = useState(null);      // data URL for preview
    const [logoBlob, setLogoBlob] = useState(null);             // resized Blob ready to upload
    const [logoBlobSize, setLogoBlobSize] = useState(null);     // byte size after resize
    const [logoError, setLogoError] = useState('');
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoDeleting, setLogoDeleting] = useState(false);

    // Refund policy
    const [refundPolicy, setRefundPolicy] = useState('');
    // View-only modal
    const [viewPolicyLocation, setViewPolicyLocation] = useState(null);

    const isSuperadmin = user?.role === 'superadmin';

    // Filtered timezone list based on search
    const filteredTimezones = useMemo(() =>
        timezoneSearch.trim()
            ? COMMON_TIMEZONES.filter(tz =>
                tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
                tz.value.toLowerCase().includes(timezoneSearch.toLowerCase())
            )
            : COMMON_TIMEZONES,
        [timezoneSearch]
    );

    // Close timezone dropdown on outside click
    useEffect(() => {
        if (!timezoneOpen) return;
        const handleOutside = (e) => {
            if (timezoneDropdownRef.current && !timezoneDropdownRef.current.contains(e.target)) {
                setTimezoneOpen(false);
                setTimezoneSearch('');
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [timezoneOpen]);

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
        setContactPhone(location.contact_phone || '');
        setSupportEmail(location.support_email || '');
        setBusinessId(location.business_id || '');
        setRefundPolicy(location.refund_policy || '');
        // Convert decimal to percentage for display (e.g. 0.14 → "14")
        const rate = location.tax_rate != null ? parseFloat(location.tax_rate) : 0.14;
        setTaxRatePercent(String(parseFloat((rate * 100).toFixed(4))));
        setLogoPreview(null);
        setLogoBlob(null);
        setLogoBlobSize(null);
        setLogoError('');
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editingLocation) return;

        setSubmitLoading(true);
        try {
            // Convert percentage to decimal for API (e.g. "14" → 0.14)
            const taxRateDecimal = parseFloat(taxRatePercent) / 100;
            const response = await apiClient.put(
                endpoints.ghl.admin.updateCompanyName(editingLocation.location_id),
                {
                    company_name: companyName,
                    timezone,
                    contact_phone: contactPhone,
                    support_email: supportEmail,
                    business_id: businessId,
                    refund_policy: refundPolicy,
                    tax_rate: taxRateDecimal,
                }
            );

            if (response.data) {
                setLocations(locations.map(loc =>
                    loc.location_id === editingLocation.location_id
                        ? {
                            ...loc,
                            company_name: companyName,
                            timezone,
                            contact_phone: contactPhone,
                            support_email: supportEmail,
                            business_id: businessId,
                            refund_policy: refundPolicy,
                            tax_rate: taxRateDecimal,
                          }
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
        setContactPhone('');
        setSupportEmail('');
        setBusinessId('');
        setRefundPolicy('');
        setTaxRatePercent('14');
        setLogoPreview(null);
        setLogoBlob(null);
        setLogoBlobSize(null);
        setLogoError('');
    };

    // ── Logo helpers ─────────────────────────────────────────────────────────

    const handleLogoFileChange = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoError('');
        setLogoPreview(null);
        setLogoBlob(null);
        setLogoBlobSize(null);

        // Basic type check
        if (!file.type.startsWith('image/')) {
            setLogoError('Please select a valid image file (PNG, JPG, WebP, GIF).');
            return;
        }

        try {
            const blob = await resizeImageToBlob(file);
            if (blob.size > MAX_LOGO_BYTES) {
                setLogoError(`Resized image is ${(blob.size / 1024).toFixed(0)} KB — must be under 1 MB. Try a simpler image.`);
                return;
            }
            const preview = URL.createObjectURL(blob);
            setLogoPreview(preview);
            setLogoBlob(blob);
            setLogoBlobSize(blob.size);
        } catch (err) {
            setLogoError('Failed to process image. Please try a different file.');
        }
    }, []);

    const handleLogoUpload = async () => {
        if (!logoBlob || !editingLocation) return;
        setLogoUploading(true);
        setLogoError('');
        try {
            const formData = new FormData();
            formData.append('logo', logoBlob, `logo_${editingLocation.location_id}.png`);
            const response = await apiClient.post(
                endpoints.ghl.admin.uploadLogo(editingLocation.location_id),
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            const updatedLocation = response.data.location;
            // Update the location in the list
            setLocations(prev => prev.map(loc =>
                loc.location_id === editingLocation.location_id
                    ? { ...loc, logo_url: updatedLocation.logo_url }
                    : loc
            ));
            setEditingLocation(prev => ({ ...prev, logo_url: updatedLocation.logo_url }));
            setLogoPreview(null);
            setLogoBlob(null);
            setLogoBlobSize(null);
            openPopup({
                type: 'success',
                title: 'Logo Uploaded',
                message: 'Company logo uploaded successfully.',
                confirmText: 'OK',
                showCancel: false,
            });
        } catch (err) {
            setLogoError(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setLogoUploading(false);
        }
    };

    const handleLogoDelete = async () => {
        if (!editingLocation) return;
        openPopup({
            type: 'warning',
            title: 'Delete Logo',
            message: 'Are you sure you want to remove the logo for this location?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                closePopup();
                setLogoDeleting(true);
                try {
                    await apiClient.delete(endpoints.ghl.admin.deleteLogo(editingLocation.location_id));
                    setLocations(prev => prev.map(loc =>
                        loc.location_id === editingLocation.location_id
                            ? { ...loc, logo_url: null }
                            : loc
                    ));
                    setEditingLocation(prev => ({ ...prev, logo_url: null }));
                    openPopup({
                        type: 'success',
                        title: 'Logo Removed',
                        message: 'The logo has been removed.',
                        confirmText: 'OK',
                        showCancel: false,
                    });
                } catch (err) {
                    openPopup({
                        type: 'error',
                        title: 'Error',
                        message: err.response?.data?.error || 'Failed to delete logo.',
                        confirmText: 'OK',
                        showCancel: false,
                    });
                } finally {
                    setLogoDeleting(false);
                }
            },
        });
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
            {/* ── View Refund Policy Modal ─────────────────────────────────────────── */}
            {viewPolicyLocation && (
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 z-50"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}
                    onClick={() => setViewPolicyLocation(null)}
                >
                    <div
                        className="bg-surface rounded-card shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-5 border-b border-border">
                            <h3 className="text-lg font-bold text-text-primary">Refund &amp; Cancellation Policy</h3>
                            <button
                                onClick={() => setViewPolicyLocation(null)}
                                className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <p className="text-xs text-text-secondary mb-3 font-medium uppercase tracking-wide">
                                {viewPolicyLocation.company_name || viewPolicyLocation.location_id}
                            </p>
                            {viewPolicyLocation.refund_policy ? (
                                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                                    {viewPolicyLocation.refund_policy}
                                </p>
                            ) : (
                                <p className="text-sm text-text-secondary italic">No refund policy set.</p>
                            )}
                        </div>
                        <div className="p-5 border-t border-border">
                            <button
                                onClick={() => setViewPolicyLocation(null)}
                                className="w-full py-2 rounded-button bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                {/* Edit Form Modal */}
                {showForm && editingLocation && (
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(3px)' }}
                        onClick={handleClose}>
                        <div ref={modalRef}
                            className="bg-surface rounded-card shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
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
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Location ID (read-only) */}
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

                                    {/* Company Name */}
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

                                    {/* Timezone Selector — custom dropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            <Globe className="inline w-4 h-4 mr-1 -mt-0.5" />
                                            Timezone
                                        </label>
                                        <p className="text-xs text-text-secondary mb-2">
                                            All bookings and availability for this center will use this timezone. DST is handled automatically.
                                        </p>
                                        <div className="relative" ref={timezoneDropdownRef}>
                                            {/* Trigger */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTimezoneOpen(prev => !prev);
                                                    setTimezoneSearch('');
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-button bg-background text-text-primary text-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                                            >
                                                <span className="truncate text-left">
                                                    {COMMON_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone || 'Select timezone…'}
                                                </span>
                                                <svg
                                                    className={`w-4 h-4 ml-2 flex-shrink-0 text-text-secondary transition-transform duration-200 ${timezoneOpen ? 'rotate-180' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Dropdown panel */}
                                            {timezoneOpen && (
                                                <div
                                                    className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-button shadow-xl overflow-hidden"
                                                    style={{ maxHeight: '260px', display: 'flex', flexDirection: 'column' }}
                                                >
                                                    {/* Search inside dropdown */}
                                                    <div className="p-2 border-b border-border flex-shrink-0">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={timezoneSearch}
                                                            onChange={e => setTimezoneSearch(e.target.value)}
                                                            placeholder="Search timezone…"
                                                            className="w-full px-3 py-2 text-sm border border-border rounded-button bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>
                                                    {/* Options list */}
                                                    <ul className="overflow-y-auto flex-1">
                                                        {filteredTimezones.length === 0 ? (
                                                            <li className="px-4 py-3 text-sm text-text-secondary italic">No timezones found.</li>
                                                        ) : filteredTimezones.map(tz => (
                                                            <li
                                                                key={tz.value}
                                                                onMouseDown={e => e.preventDefault()}
                                                                onClick={() => {
                                                                    setTimezone(tz.value);
                                                                    setTimezoneOpen(false);
                                                                    setTimezoneSearch('');
                                                                }}
                                                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 ${
                                                                    tz.value === timezone
                                                                        ? 'bg-primary text-white font-medium'
                                                                        : 'text-text-primary hover:bg-background'
                                                                }`}
                                                            >
                                                                {tz.value === timezone && (
                                                                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                                <span>{tz.label}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Invoice Contact Details ── */}
                                    <div className="border border-border rounded-button p-4 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Mail className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-semibold text-text-primary">Invoice Contact Details</span>
                                        </div>
                                        <p className="text-xs text-text-secondary -mt-1">
                                            These details appear on every payment invoice sent to customers.
                                        </p>

                                        {/* Contact Phone */}
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                                <Phone className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                                                Contact Phone
                                            </label>
                                            <input
                                                type="tel"
                                                value={contactPhone}
                                                onChange={(e) => setContactPhone(e.target.value)}
                                                placeholder="e.g. +1 902-555-0100"
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            />
                                        </div>

                                        {/* Support Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                                <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                                                Support Email
                                            </label>
                                            <input
                                                type="email"
                                                value={supportEmail}
                                                onChange={(e) => setSupportEmail(e.target.value)}
                                                placeholder="e.g. support@mygolfcenter.com"
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            />
                                        </div>

                                        {/* Business ID */}
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1.5">
                                                <Building2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                                                Business ID
                                            </label>
                                            <input
                                                type="text"
                                                value={businessId}
                                                onChange={(e) => setBusinessId(e.target.value)}
                                                placeholder="e.g. GST/HST registration number"
                                                className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* ── Tax Rate ── */}
                                    <div className="border border-border rounded-button p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Percent className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-semibold text-text-primary">Tax Rate</span>
                                        </div>
                                        <p className="text-xs text-text-secondary">
                                            Applied to all Square payments at this location. Enter as a percentage (e.g. <strong>14</strong> for 14% HST).
                                        </p>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={taxRatePercent}
                                                onChange={(e) => setTaxRatePercent(e.target.value)}
                                                placeholder="e.g. 14"
                                                className="w-full px-4 py-3 pr-10 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary"
                                                required
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium text-sm">%</span>
                                        </div>
                                    </div>

                                    {/* ── Refund Policy ── */}
                                    <div className="border border-border rounded-button p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-text-primary">📋 Refund &amp; Cancellation Policy</span>
                                        </div>
                                        <p className="text-xs text-text-secondary">
                                            This text will appear on every invoice email sent to customers.
                                        </p>
                                        <textarea
                                            value={refundPolicy}
                                            onChange={e => setRefundPolicy(e.target.value)}
                                            placeholder="e.g. All sales are final. No refunds after 24 hours of booking..."
                                            rows={5}
                                            className="w-full px-4 py-3 border border-border rounded-button focus:ring-2 focus:ring-primary focus:border-primary bg-background text-text-primary text-sm resize-y"
                                        />
                                    </div>

                                    {/* ── Company Logo Section ── */}
                                    <div className="border border-border rounded-button p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-semibold text-text-primary">Company Logo</span>
                                        </div>
                                        <p className="text-xs text-text-secondary">
                                            Recommended size: <strong>912 × 273 px</strong>. Must be under <strong>1 MB</strong>.
                                            Your image will be automatically resized and centred to fit.
                                        </p>

                                        {/* Current / preview image */}
                                        <div className="relative w-full rounded-button overflow-hidden bg-background border border-border"
                                            style={{ height: '90px' }}>
                                            {logoPreview ? (
                                                <img
                                                    src={logoPreview}
                                                    alt="Logo preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : editingLocation.logo_url ? (
                                                <img
                                                    src={editingLocation.logo_url}
                                                    alt="Current logo"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full gap-2 text-text-secondary">
                                                    <ImageIcon className="w-6 h-6" />
                                                    <span className="text-sm">No logo set</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Size indicator after resize */}
                                        {logoBlobSize && (
                                            <p className="text-xs flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                <span className="text-text-secondary">
                                                    Resized to 912 × 273 px — <strong>{(logoBlobSize / 1024).toFixed(1)} KB</strong>
                                                </span>
                                            </p>
                                        )}

                                        {/* Error */}
                                        {logoError && (
                                            <p className="text-xs text-danger">{logoError}</p>
                                        )}

                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoFileChange}
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            {/* Choose file */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-button hover:bg-background transition-colors text-text-primary"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {logoPreview ? 'Change Image' : 'Choose Image'}
                                            </button>

                                            {/* Upload (only after a new file is selected) */}
                                            {logoBlob && (
                                                <button
                                                    type="button"
                                                    onClick={handleLogoUpload}
                                                    disabled={logoUploading}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary text-white rounded-button hover:opacity-90 transition-opacity disabled:opacity-60"
                                                >
                                                    {logoUploading ? 'Uploading…' : 'Upload Logo'}
                                                </button>
                                            )}

                                            {/* Delete current logo (only if one exists and no new file pending) */}
                                            {editingLocation.logo_url && !logoBlob && (
                                                <button
                                                    type="button"
                                                    onClick={handleLogoDelete}
                                                    disabled={logoDeleting}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-danger text-danger rounded-button hover:bg-danger/10 transition-colors disabled:opacity-60"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {logoDeleting ? 'Removing…' : 'Remove Logo'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-4 pt-2">
                                        <Button
                                            type="submit"
                                            disabled={submitLoading}
                                            variant="primary"
                                            className="flex-1"
                                        >
                                            {submitLoading ? 'Updating...' : 'Update Settings'}
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
                    <TableSkeleton rows={5} cols={6} />
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
                                                Logo
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Refund Policy
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Tax Rate
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Timezone
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Contact Phone
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Support Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                                                Business ID
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
                                                <td className="px-4 py-4">
                                                    {location.logo_url ? (
                                                        <img
                                                            src={location.logo_url}
                                                            alt="logo"
                                                            className="h-8 w-auto object-contain rounded"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-text-secondary italic">No logo</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {location.refund_policy ? (
                                                        <button
                                                            onClick={() => setViewPolicyLocation(location)}
                                                            className="text-xs text-primary hover:underline hover:text-primary-light transition-colors flex items-center gap-1 whitespace-nowrap"
                                                        >
                                                            📋 Click to view
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-text-secondary italic">Not set</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary">
                                                    {location.tax_rate != null ? (
                                                        <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                                                            
                                                            {parseFloat((parseFloat(location.tax_rate) * 100).toFixed(4))}%
                                                        </span>
                                                    ) : (
                                                        <span className="italic text-xs">14% (default)</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                        <span className="truncate max-w-[160px]" title={getTimezoneLabel(location.timezone)}>
                                                            {location.timezone || 'America/Halifax'}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary">
                                                    {location.contact_phone ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-primary flex-shrink-0" />
                                                            {location.contact_phone}
                                                        </span>
                                                    ) : <span className="italic text-xs">Not set</span>}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary">
                                                    {location.support_email ? (
                                                        <a href={`mailto:${location.support_email}`}
                                                           className="text-primary hover:underline truncate max-w-[160px] block">
                                                            {location.support_email}
                                                        </a>
                                                    ) : <span className="italic text-xs">Not set</span>}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-text-secondary font-mono">
                                                    {location.business_id || <span className="italic text-xs not-italic">Not set</span>}
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
