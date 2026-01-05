import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Token ${token}`;
        }
        
        // Add location_id to all requests (GET, POST, PUT, DELETE, PATCH)
        const locationId = localStorage.getItem('locationId');
        if (locationId) {
            // For GET requests, add as query parameter
            if (config.method === 'get' || config.method === 'GET') {
                config.params = config.params || {};
                config.params.location_id = locationId;
            } else {
                // For POST, PUT, DELETE, PATCH, add to request body
                // But if data is a list or FormData, add as query parameter instead
                if (Array.isArray(config.data) || config.data instanceof FormData) {
                    // If data is a list or FormData, add location_id as query parameter
                    config.params = config.params || {};
                    config.params.location_id = locationId;
                } else if (typeof config.data === 'object' && config.data !== null) {
                    // If data is an object (dict), add location_id to the body
                    config.data.location_id = locationId;
                } else {
                    // If data is null/undefined, create an object with location_id
                    config.data = { location_id: locationId };
                }
            }
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized - logout user
        // Don't redirect if we're on a guest booking page (they don't need auth)
        const isGuestBookingPage = window.location.pathname === '/guest-booking';
        if (error.response?.status === 401 && !isGuestBookingPage) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/signin';
        }
        
        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error('Access forbidden:', error.response.data);
        }
        
        // Handle 500 Server Error
        if (error.response?.status >= 500) {
            console.error('Server error:', error.response.data);
        }
        
        return Promise.reject(error);
    }
);

export default apiClient;











