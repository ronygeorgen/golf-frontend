import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import apiClient from '../api/axios';
import PopupMessage from './PopupMessage';
import usePopup from '../hooks/usePopup';
import {
    CreditCard,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Link2,
    Link2Off,
    AlertCircle,
    Clock,
    Building2,
    ExternalLink,
    Info,
    Loader2,
    ShieldCheck,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// API paths
// ─────────────────────────────────────────────────────────────────────────────
const SQ = {
    status: (locationId) => `/square/oauth/status/${locationId}/`,
    authorizeUrl: (locationId) => `/square/oauth/authorize/?location_id=${locationId}`,
    disconnect: (locationId) => `/square/oauth/disconnect/${locationId}/`,
    list: '/square/oauth/list/',
};


// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ connected, tokenValid }) {
    if (connected && tokenValid)
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
        );
    if (connected && !tokenValid)
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <Clock className="w-3.5 h-3.5" /> Token Expired
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            <XCircle className="w-3.5 h-3.5" /> Not Connected
        </span>
    );
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    try {
        return new Date(isoStr).toLocaleString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return isoStr; }
}

/**
 * Calls the authenticated authorize endpoint via axios to get the Square OAuth
 * URL, then opens it in a new tab. Listens for a postMessage from the callback
 * page (or falls back to polling win.closed) to call onDone when auth completes.
 * Returns an error string on failure, or null on success.
 */
async function initiateOAuthPopup(locationId, onDone) {
    try {
        const res = await apiClient.get(SQ.authorizeUrl(locationId));
        const squareUrl = res.data?.oauth_url;
        if (!squareUrl) throw new Error('No oauth_url returned from server.');

        // Open as a new tab — avoids popup blocker heuristics triggered by
        // window name + width/height params used by Brave/Chrome shields.
        const win = window.open(squareUrl, '_blank');

        if (!win) {
            // Browser blocked even the new tab — give friendly guidance
            return 'Your browser blocked the Square login tab. Please allow pop-ups for this site and try again.';
        }

        // Listen for postMessage from the callback page (fastest, most reliable)
        const messageHandler = (event) => {
            if (event.data?.type === 'square_oauth_complete') {
                window.removeEventListener('message', messageHandler);
                clearInterval(pollTimer);
                setTimeout(onDone, 500);
            }
        };
        window.addEventListener('message', messageHandler);

        // Fallback: poll win.closed in case the tab was closed manually
        const pollTimer = setInterval(() => {
            if (win.closed) {
                clearInterval(pollTimer);
                window.removeEventListener('message', messageHandler);
                setTimeout(onDone, 800);
            }
        }, 600);

        return null; // success — auth in progress
    } catch (err) {
        console.error('Square OAuth initiation failed:', err);
        return err.response?.data?.error || err.message || 'Failed to get Square login URL.';
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Admin panel — for regular admin (golf center admin)
// Full control: connect, reconnect, disconnect their own location.
// ─────────────────────────────────────────────────────────────────────────────
function AdminSquarePanel({ locationId }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const { popup, openPopup, closePopup } = usePopup();

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(SQ.status(locationId));
            setStatus(res.data);
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, [locationId]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleConnect = async () => {
        const errMsg = await initiateOAuthPopup(locationId, fetchStatus);
        if (errMsg) {
            openPopup({
                type: 'error', title: 'Connection Error',
                message: errMsg,
                confirmText: 'OK', showCancel: false,
            });
        }
    };

    const handleDisconnect = () => {
        openPopup({
            type: 'warning',
            title: 'Disconnect Square',
            message: 'Are you sure you want to disconnect your Square account? Payments will fall back to the platform account until you reconnect.',
            confirmText: 'Disconnect',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                closePopup();
                setDisconnecting(true);
                try {
                    await apiClient.post(SQ.disconnect(locationId));
                    await fetchStatus();
                    openPopup({
                        type: 'success', title: 'Disconnected',
                        message: 'Your Square account has been disconnected.',
                        confirmText: 'OK', showCancel: false,
                    });
                } catch (err) {
                    openPopup({
                        type: 'error', title: 'Error',
                        message: err.response?.data?.error || 'Failed to disconnect.',
                        confirmText: 'OK', showCancel: false,
                    });
                } finally {
                    setDisconnecting(false);
                }
            },
        });
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-text-secondary py-8">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading Square connection status…</span>
            </div>
        );
    }

    const isConnected = status?.is_connected;
    const tokenValid = status?.token_valid;

    return (
        <>
            {/* ── Status card ── */}
            <div className={`rounded-2xl border-2 p-6 mb-6 transition-colors ${isConnected && tokenValid
                ? 'border-green-300 bg-green-50'
                : isConnected && !tokenValid
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-border bg-surface'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected && tokenValid ? 'bg-green-100' : 'bg-background'
                        }`}>
                        <CreditCard className={`w-7 h-7 ${isConnected && tokenValid ? 'text-green-600' : 'text-text-secondary'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-text-primary">Square Payment Account</h3>
                            <StatusBadge connected={isConnected} tokenValid={tokenValid} />
                        </div>

                        {isConnected ? (
                            <div className="space-y-0.5 text-sm text-text-secondary">
                                {status.square_location_name && (
                                    <p><span className="font-medium text-text-primary">Square Location:</span> {status.square_location_name}</p>
                                )}
                                {status.merchant_id && (
                                    <p>
                                        <span className="font-medium text-text-primary">Merchant ID:</span>{' '}
                                        <code className="bg-background px-1.5 py-0.5 rounded text-xs">{status.merchant_id}</code>
                                    </p>
                                )}
                                {status.connected_at && (
                                    <p><span className="font-medium text-text-primary">Connected:</span> {formatDate(status.connected_at)}</p>
                                )}
                                {status.token_expires_at && (
                                    <p><span className="font-medium text-text-primary">Token expires:</span> {formatDate(status.token_expires_at)}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-text-secondary">
                                No Square account connected yet. Click below to link your Square account —
                                customer payments will then go directly to you.
                            </p>
                        )}
                    </div>

                    {/* Action */}
                    <div className="flex flex-col gap-2 sm:items-end">
                        {isConnected ? (
                            <>
                                {/* Reconnect */}
                                <button
                                    onClick={handleConnect}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reconnect
                                </button>
                                {/* Disconnect */}
                                <button
                                    onClick={handleDisconnect}
                                    disabled={disconnecting}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-button border border-danger text-danger text-sm font-semibold hover:bg-danger/5 transition-colors disabled:opacity-50"
                                >
                                    <Link2Off className="w-4 h-4" />
                                    {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                                </button>
                            </>
                        ) : (
                            /* Not connected — connect button */
                            <button
                                onClick={handleConnect}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                            >
                                <Link2 className="w-4 h-4" />
                                Connect Square Account
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                            </button>
                        )}
                        <button
                            onClick={fetchStatus}
                            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* ── How it works (only show when not connected) ── */}
            {!isConnected && (
                <div className="rounded-xl border border-border bg-background p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-primary flex-shrink-0" />
                        <h4 className="text-sm font-semibold text-text-primary">How Square Connect works</h4>
                    </div>
                    <ol className="space-y-2 text-sm text-text-secondary list-none">
                        {[
                            'Click "Connect Square Account" — a small Square login popup appears.',
                            'Log in with YOUR Square account (the one you want to receive payments into).',
                            'Approve the permissions. The popup closes automatically.',
                            'All customer payments for this golf center now go directly into your Square account.',
                            'Tokens are automatically refreshed every hour — no action needed.',
                        ].map((step, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Note when connected but expired */}
            {isConnected && !tokenValid && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        Your Square token has expired. Please click <strong>"Reconnect"</strong> above to refresh your connection.
                    </p>
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
                onConfirm={popup.onConfirm ? () => { popup.onConfirm(); closePopup(); } : closePopup}
                onClose={closePopup}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin panel — full control over ALL locations
// Rules: can connect / reconnect / disconnect any location at any time
// ─────────────────────────────────────────────────────────────────────────────
function SuperadminSquarePanel() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(null);
    const { popup, openPopup, closePopup } = usePopup();

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(SQ.list);
            setConnections(res.data.connections || []);
        } catch {
            setConnections([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleConnect = async (locationId) => {
        const errMsg = await initiateOAuthPopup(locationId, fetchAll);
        if (errMsg) {
            openPopup({
                type: 'error', title: 'Connection Error',
                message: errMsg,
                confirmText: 'OK', showCancel: false,
            });
        }
    };

    const handleDisconnect = (conn) => {
        openPopup({
            type: 'warning',
            title: 'Disconnect Square',
            message: `Disconnect Square for "${conn.company_name || conn.ghl_location_id}"? Payments will fall back to the platform account until reconnected.`,
            confirmText: 'Disconnect',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                closePopup();
                setDisconnecting(conn.ghl_location_id);
                try {
                    await apiClient.post(SQ.disconnect(conn.ghl_location_id));
                    await fetchAll();
                } catch (err) {
                    openPopup({
                        type: 'error', title: 'Error',
                        message: err.response?.data?.error || 'Failed to disconnect.',
                        confirmText: 'OK', showCancel: false,
                    });
                } finally {
                    setDisconnecting(null);
                }
            },
        });
    };

    // Summary stats
    const total = connections.length;
    const connected = connections.filter(c => c.is_connected && c.token_valid).length;
    const expired = connections.filter(c => c.is_connected && !c.token_valid).length;
    const notConnected = connections.filter(c => !c.is_connected).length;

    return (
        <>
            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Locations', value: total, color: 'text-text-primary', bg: 'bg-background' },
                    { label: 'Connected ✓', value: connected, color: 'text-green-700', bg: 'bg-green-50' },
                    { label: 'Token Expired', value: expired, color: 'text-amber-700', bg: 'bg-amber-50' },
                    { label: 'Not Connected', value: notConnected, color: 'text-rose-700', bg: 'bg-rose-50' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl border border-border p-4 text-center`}>
                        <p className={`text-2xl font-bold ${stat.color}`}>{loading ? '—' : stat.value}</p>
                        <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Refresh ── */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-button hover:bg-background transition-colors text-text-secondary disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div className="flex items-center gap-3 text-text-secondary py-12 justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading connections…</span>
                </div>
            ) : connections.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No locations found</p>
                    <p className="text-sm mt-1">Locations appear here once GHL has been onboarded.</p>
                </div>
            ) : (
                <div className="bg-surface rounded-card shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background">
                                <tr>
                                    {['Location', 'Square Status', 'Merchant ID', 'Square Location', 'Token Expires', 'Actions'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {connections.map((conn) => {
                                    const isDisconnecting = disconnecting === conn.ghl_location_id;
                                    return (
                                        <tr key={conn.ghl_location_id} className="hover:bg-background transition-colors">
                                            {/* Location */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-text-secondary flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-text-primary">
                                                            {conn.company_name || '—'}
                                                        </p>
                                                        <p className="text-xs text-text-secondary font-mono">
                                                            {conn.ghl_location_id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <StatusBadge connected={conn.is_connected} tokenValid={conn.token_valid} />
                                            </td>

                                            {/* Merchant ID */}
                                            <td className="px-4 py-4 text-sm text-text-secondary">
                                                {conn.merchant_id
                                                    ? <code className="bg-background px-1.5 py-0.5 rounded text-xs">{conn.merchant_id}</code>
                                                    : <span className="italic">—</span>
                                                }
                                            </td>

                                            {/* Square Location */}
                                            <td className="px-4 py-4 text-sm text-text-secondary">
                                                <p>{conn.square_location_name || '—'}</p>
                                                {conn.square_location_id && (
                                                    <p className="text-xs font-mono">{conn.square_location_id}</p>
                                                )}
                                            </td>

                                            {/* Token Expires */}
                                            <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap">
                                                {conn.token_expires_at ? formatDate(conn.token_expires_at) : '—'}
                                            </td>

                                            {/* Actions — superadmin has full control */}
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {conn.is_connected ? (
                                                        <>
                                                            {/* Reconnect */}
                                                            <button
                                                                onClick={() => handleConnect(conn.ghl_location_id)}
                                                                title="Reconnect Square for this location"
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button border border-primary text-primary text-xs font-semibold hover:bg-primary/5 transition-colors"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                                Reconnect
                                                            </button>
                                                            {/* Disconnect */}
                                                            <button
                                                                onClick={() => handleDisconnect(conn)}
                                                                disabled={isDisconnecting}
                                                                title="Disconnect Square"
                                                                className="p-2 text-danger hover:bg-danger/10 rounded-button transition-colors disabled:opacity-40"
                                                            >
                                                                {isDisconnecting
                                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                    : <Link2Off className="w-4 h-4" />
                                                                }
                                                            </button>
                                                        </>
                                                    ) : (
                                                        /* Not connected — superadmin initiates */
                                                        <button
                                                            onClick={() => handleConnect(conn.ghl_location_id)}
                                                            title="Connect Square for this location"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                                                        >
                                                            <Link2 className="w-3.5 h-3.5" />
                                                            Connect
                                                            <ExternalLink className="w-3 h-3 opacity-60" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                onConfirm={popup.onConfirm ? () => { popup.onConfirm(); closePopup(); } : closePopup}
                onClose={closePopup}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component — routes to correct panel by role
// ─────────────────────────────────────────────────────────────────────────────
function SquareConnectionManagement() {
    const { user, locationId } = useAppSelector((state) => state.auth);
    const isSuperadmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin' || user?.is_superuser === true;

    if (!isAdmin && !isSuperadmin) {
        return (
            <div className="bg-surface rounded-card shadow-card p-6">
                <div className="flex items-center gap-3 text-text-secondary">
                    <AlertCircle className="w-5 h-5 text-danger" />
                    <p>You do not have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-primary">
                        {isSuperadmin ? 'Square Connections — All Locations' : 'Square Payment Connection'}
                    </h2>
                    <p className="text-sm text-text-secondary mt-0.5">
                        {isSuperadmin
                            ? 'Connect, reconnect or disconnect Square accounts for any golf center location.'
                            : 'Connect your Square account so customer payments go directly to you.'
                        }
                    </p>
                </div>
                {isSuperadmin && (
                    <span className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Superadmin View
                    </span>
                )}
            </div>

            {isSuperadmin
                ? <SuperadminSquarePanel />
                : <AdminSquarePanel locationId={locationId} />
            }
        </div>
    );
}

export default SquareConnectionManagement;
