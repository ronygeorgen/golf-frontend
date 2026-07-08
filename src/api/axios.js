import axios from 'axios';
import toastEmitter from '../utils/toastEmitter';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ─── Shared request interceptor (auth token + location_id) ───────────────────
const attachAuthAndLocation = (config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }

    const locationId = localStorage.getItem('locationId');
    if (locationId) {
        const trimmedLocationId = locationId.trim().replace(/\+$/, '').trim();
        if (trimmedLocationId) {
            if (config.method === 'get' || config.method === 'GET') {
                config.params = config.params || {};
                config.params.location_id = trimmedLocationId;
            } else {
                if (Array.isArray(config.data) || config.data instanceof FormData) {
                    config.params = config.params || {};
                    config.params.location_id = trimmedLocationId;
                } else if (typeof config.data === 'object' && config.data !== null) {
                    config.data.location_id = trimmedLocationId;
                } else {
                    config.data = { location_id: trimmedLocationId };
                }
            }
        }
    }

    return config;
};

const rejectRequest = (error) => Promise.reject(error);

// ─── Shared 401 logout handler ────────────────────────────────────────────────
const handle401 = (error) => {
    const isGuestBookingPage = window.location.pathname === '/guest-booking';
    if (error.response?.status === 401 && !isGuestBookingPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/signin';
    }
};

// =============================================================================
// apiClient — default client for direct component calls.
// Shows a global toast on 403 / 500 errors.
// =============================================================================
const apiClient = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(attachAuthAndLocation, rejectRequest);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        handle401(error);

        // If the caller set skipGlobalToast: true on the config, skip the toast.
        const skipGlobalToast = error.config?.skipGlobalToast === true;

        if (!skipGlobalToast && error.response?.status === 403) {
            const msg =
                error.response.data?.detail ||
                error.response.data?.error ||
                error.response.data?.message ||
                'Access denied. Your location may be inactive.';
            toastEmitter.emit('error', msg);
        }

        if (!skipGlobalToast && error.response?.status >= 500) {
            const msg =
                error.response.data?.detail ||
                error.response.data?.error ||
                'A server error occurred. Please try again.';
            toastEmitter.emit('error', msg);
        }

        return Promise.reject(error);
    }
);

export default apiClient;

// =============================================================================
// apiClientSilent — for Redux slices (createAsyncThunk).
// Identical auth/location logic but never shows the global 403/500 toast,
// because thunks use rejectWithValue and components show their own errors.
// =============================================================================
export const apiClientSilent = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

apiClientSilent.interceptors.request.use(attachAuthAndLocation, rejectRequest);

apiClientSilent.interceptors.response.use(
    (response) => response,
    (error) => {
        handle401(error);
        return Promise.reject(error);
    }
);
