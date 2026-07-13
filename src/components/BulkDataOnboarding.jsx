import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { endpoints } from '../api/endpoints';
import toastEmitter from '../utils/toastEmitter';
import { Download, Upload, CheckCircle, AlertTriangle, XCircle, FileSpreadsheet, MapPin, Loader2, RefreshCw } from 'lucide-react';

const POLL_INTERVAL = 2500;

const statusConfig = {
    pending:    { label: 'Waiting to start…',  color: 'text-text-secondary', bg: 'bg-background' },
    processing: { label: 'Processing rows…',    color: 'text-primary',        bg: 'bg-primary/10' },
    completed:  { label: 'Import complete',     color: 'text-success',        bg: 'bg-success/10' },
    failed:     { label: 'Import failed',       color: 'text-danger',         bg: 'bg-danger/10' },
};

function StepBadge({ number, active, done }) {
    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
            ${done  ? 'bg-primary text-white' :
              active ? 'bg-primary/20 text-primary border-2 border-primary' :
                       'bg-background text-text-secondary border-2 border-border'}`}>
            {done ? <CheckCircle className="w-4 h-4" /> : number}
        </div>
    );
}

const BulkDataOnboarding = () => {
    const [file, setFile]                   = useState(null);
    const [uploading, setUploading]         = useState(false);
    const [taskId, setTaskId]               = useState(null);
    const [taskData, setTaskData]           = useState(null);   // full status response
    const [locations, setLocations]         = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [downloadingTpl, setDownloadingTpl] = useState(false);
    const intervalRef = useRef(null);
    const bottomRef = useRef(null);

    // ── Load locations on mount ──────────────────────────────────────────────
    useEffect(() => {
        api.get(endpoints.ghl.admin.locations)
            .then(res => {
                if (res.data?.locations) {
                    setLocations(res.data.locations);
                    const authState = JSON.parse(localStorage.getItem('persist:auth') || '{}');
                    const defaultId = authState.locationId ? JSON.parse(authState.locationId) : null;
                    const locs = res.data.locations;
                    if (defaultId && locs.some(l => l.location_id === defaultId)) {
                        setSelectedLocation(defaultId);
                    } else if (locs.length > 0) {
                        setSelectedLocation(locs[0].location_id);
                    }
                }
            })
            .catch(() => {});
    }, []);

    // ── Polling for task status ──────────────────────────────────────────────
    useEffect(() => {
        if (!taskId) return;

        const poll = async () => {
            try {
                const res = await api.get(`/admin/bulk-upload/${taskId}/status/`);
                setTaskData(res.data);
                if (res.data.status === 'completed' || res.data.status === 'failed') {
                    clearInterval(intervalRef.current);
                    setUploading(false);
                    setFile(null); // Clear the file selection once done
                    if (res.data.status === 'completed') {
                        if (res.data.error_file_url) {
                            toastEmitter.emit('warning', 'Import finished with some errors. Download the error report below.');
                        } else {
                            toastEmitter.emit('success', 'All data imported successfully!');
                        }
                    } else {
                        toastEmitter.emit('error', 'The import task failed. Please try again.');
                    }
                }
            } catch {
                clearInterval(intervalRef.current);
                setUploading(false);
                setFile(null);
            }
        };

        // Poll immediately, then every POLL_INTERVAL ms
        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [taskId]);

    // ── Derived values ───────────────────────────────────────────────────────
    const progress = taskData && taskData.total_rows > 0
        ? Math.min(100, Math.round((taskData.processed_rows / taskData.total_rows) * 100))
        : (taskData?.status === 'completed' ? 100 : 0);

    const currentStatus = taskData?.status || null;
    const errorFileUrl  = taskData?.error_file_url || null;
    const selectedLocName = locations.find(l => l.location_id === selectedLocation)?.company_name || selectedLocation;

    const stepDownloadDone = true; // always enabled
    const stepUploadActive = !!selectedLocation;
    const stepProgressDone = currentStatus === 'completed' || currentStatus === 'failed';

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleDownloadTemplate = async () => {
        setDownloadingTpl(true);
        try {
            const res = await api.get('/admin/bulk-upload/template/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a   = document.createElement('a');
            a.href    = url;
            a.setAttribute('download', 'bulk_upload_template.xlsx');
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch {
            toastEmitter.emit('error', 'Failed to download template');
        } finally {
            setDownloadingTpl(false);
        }
    };

    const handleUpload = async () => {
        if (!file)             return toastEmitter.emit('error', 'Please select a file to upload');
        if (!selectedLocation) return toastEmitter.emit('error', 'Please select a location first');

        if (!window.confirm(`Upload data for location: "${selectedLocName}"?`)) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('location_id', selectedLocation);

        setUploading(true);
        setTaskData(null);
        setTaskId(null);

        try {
            const res = await api.post('/admin/bulk-upload/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setTaskId(res.data.task_id);
            toastEmitter.emit('success', 'File uploaded — processing has started');
            
            // Scroll to bottom so they can see progress
            setTimeout(() => {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

        } catch (err) {
            toastEmitter.emit('error', err.response?.data?.error || 'Upload failed');
            setUploading(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!taskId) return;
        try {
            const res = await api.get(`/admin/bulk-upload/${taskId}/status/`);
            setTaskData(res.data);
            if (res.data.status === 'completed' || res.data.status === 'failed') {
                clearInterval(intervalRef.current);
                setUploading(false);
            }
        } catch {
            toastEmitter.emit('error', 'Failed to refresh status');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ─── Header Info Banner ─── */}
            <div className="bg-primary/5 border border-primary/20 rounded-card p-5 flex gap-4 items-start">
                <FileSpreadsheet className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold text-text-primary">How it works</p>
                    <p className="text-text-secondary text-sm mt-1">
                        Download the Excel template → fill in your data across the 4 tabs (Customers, Packages, Bookings, Events) → select the target location → upload. Invalid rows are skipped and logged in a downloadable error report.
                    </p>
                </div>
            </div>

            {/* ─── Step 1: Download Template ─── */}
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <StepBadge number="1" active={true} done={false} />
                    <div>
                        <h2 className="font-semibold text-text-primary">Download Template</h2>
                        <p className="text-text-secondary text-sm">Get the pre-formatted Excel file with all required column headers.</p>
                    </div>
                </div>

                <div className="overflow-x-auto mb-5">
                    <table className="min-w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-background">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border border-border">Tab</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border border-border">Mandatory Columns</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border border-border">Optional Columns</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {[
                                { tab: 'Customers', mandatory: 'Name, Phone', optional: 'Email' },
                                { tab: 'Packages',  mandatory: 'Phone, Package Name', optional: '—' },
                                { tab: 'Bookings',  mandatory: 'Phone, Type, Start Time, End Time', optional: '—' },
                                { tab: 'Events',    mandatory: 'Phone, Event Name, Occurrence Date', optional: '—' },
                            ].map(row => (
                                <tr key={row.tab} className="hover:bg-background">
                                    <td className="px-4 py-2 border border-border font-medium text-text-primary">{row.tab}</td>
                                    <td className="px-4 py-2 border border-border text-text-primary">{row.mandatory}</td>
                                    <td className="px-4 py-2 border border-border text-text-secondary">{row.optional}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button
                    onClick={handleDownloadTemplate}
                    disabled={downloadingTpl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-primary text-white font-medium text-sm
                               hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {downloadingTpl
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    {downloadingTpl ? 'Downloading…' : 'Download Template (.xlsx)'}
                </button>
            </div>

            {/* ─── Step 2: Select Location & Upload ─── */}
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center gap-3 mb-5">
                    <StepBadge number="2" active={stepUploadActive} done={stepProgressDone} />
                    <div>
                        <h2 className="font-semibold text-text-primary">Select Location &amp; Upload</h2>
                        <p className="text-text-secondary text-sm">Choose the target location and upload your completed spreadsheet.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location selector */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                            <MapPin className="w-3.5 h-3.5 inline mr-1 text-primary" />
                            Target Location
                        </label>
                        <select
                            value={selectedLocation}
                            onChange={e => setSelectedLocation(e.target.value)}
                            disabled={uploading}
                        >
                            <option value="">Select a location…</option>
                            {locations.map(loc => (
                                <option key={loc.location_id} value={loc.location_id}>
                                    {loc.company_name || loc.location_id}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File picker */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                            <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1 text-primary" />
                            Excel File (.xlsx)
                        </label>
                        <label className={`flex items-center justify-center gap-2 w-full px-4 py-2 border-2 border-dashed rounded-[10px] cursor-pointer transition-colors
                            ${uploading ? 'border-border bg-background text-text-secondary cursor-not-allowed' :
                                          'border-primary/40 hover:border-primary hover:bg-primary/5 text-text-secondary'}`}>
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate">
                                {file ? file.name : 'Click to choose a file…'}
                            </span>
                            <input
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                disabled={uploading}
                                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={handleUpload}
                        disabled={!file || !selectedLocation || uploading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button bg-primary text-white font-medium text-sm
                                   hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Upload className="w-4 h-4" />}
                        {uploading ? 'Uploading…' : 'Start Import'}
                    </button>

                    {selectedLocation && file && !uploading && (
                        <p className="text-text-secondary text-sm">
                            Will import to: <span className="font-medium text-text-primary">{selectedLocName}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* ─── Step 3: Progress ─── */}
            {taskId && (
                <div className="bg-surface rounded-card shadow-card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <StepBadge number="3" active={!stepProgressDone} done={stepProgressDone} />
                        <div>
                            <h2 className="font-semibold text-text-primary">Import Progress</h2>
                            <p className="text-text-secondary text-sm">Live status of your upload job.</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-5">
                        {currentStatus && (() => {
                            const cfg = statusConfig[currentStatus] || statusConfig.pending;
                            return (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.bg} ${cfg.color}`}>
                                    {currentStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {currentStatus === 'completed'  && <CheckCircle className="w-4 h-4" />}
                                    {currentStatus === 'failed'     && <XCircle className="w-4 h-4" />}
                                    {currentStatus === 'pending'    && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {cfg.label}
                                </div>
                            );
                        })()}

                        {currentStatus !== 'completed' && currentStatus !== 'failed' && (
                            <button
                                onClick={handleCheckStatus}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors border border-border rounded-button"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Refresh Status
                            </button>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-background rounded-full h-3 overflow-hidden mb-2">
                        <div
                            className={`h-3 rounded-full transition-all duration-700 ease-out
                                ${currentStatus === 'failed' ? 'bg-danger' :
                                  currentStatus === 'completed' ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-sm text-text-secondary mb-6">
                        <span>
                            {taskData?.processed_rows ?? 0} / {taskData?.total_rows ?? '…'} rows processed
                        </span>
                        <span className="font-semibold text-text-primary">{progress}%</span>
                    </div>

                    {/* Result banners */}
                    {currentStatus === 'completed' && !errorFileUrl && (
                        <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-card">
                            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-success">All rows imported successfully</p>
                                <p className="text-sm text-text-secondary mt-0.5">No errors were found in your file.</p>
                            </div>
                        </div>
                    )}

                    {currentStatus === 'completed' && errorFileUrl && (
                        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-card">
                            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-text-primary">Import finished with some errors</p>
                                <p className="text-sm text-text-secondary mt-0.5 mb-3">
                                    Some rows could not be imported. Download the error report to see which rows failed and why, then fix and re-upload only those rows.
                                </p>
                                <button
                                    onClick={() => window.open(errorFileUrl, '_blank')}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Error Report (.xlsx)
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStatus === 'failed' && (
                        <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/30 rounded-card">
                            <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-danger">Import task failed</p>
                                <p className="text-sm text-text-secondary mt-0.5">A critical error occurred. Please check the file format and try again.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Invisible div to scroll to */}
            <div ref={bottomRef} className="h-1" />
        </div>
    );
};

export default BulkDataOnboarding;
