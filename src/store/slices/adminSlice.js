import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/axios';
import { endpoints } from '../../api/endpoints';

// Dashboard thunks
export const getDashboardStats = createAsyncThunk(
    'admin/getDashboardStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.dashboard.stats);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getRecentBookings = createAsyncThunk(
    'admin/getRecentBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.dashboard.recentBookings);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Staff thunks
export const getStaff = createAsyncThunk(
    'admin/getStaff',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.staff.list);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createStaff = createAsyncThunk(
    'admin/createStaff',
    async (staffData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.staff.list, staffData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateStaff = createAsyncThunk(
    'admin/updateStaff',
    async ({ id, staffData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(endpoints.admin.staff.detail(id), staffData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteStaff = createAsyncThunk(
    'admin/deleteStaff',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(endpoints.admin.staff.detail(id));
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Staff Availability thunks
export const getStaffAvailability = createAsyncThunk(
    'admin/getStaffAvailability',
    async ({ staffId }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.staff.availability(staffId));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateStaffAvailability = createAsyncThunk(
    'admin/updateStaffAvailability',
    async ({ staffId, availabilityData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(
                endpoints.admin.staff.availability(staffId),
                availabilityData
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Simulator thunks
export const getSimulators = createAsyncThunk(
    'admin/getSimulators',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.simulators.list);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createSimulator = createAsyncThunk(
    'admin/createSimulator',
    async (simulatorData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.simulators.list, simulatorData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateSimulator = createAsyncThunk(
    'admin/updateSimulator',
    async ({ id, simulatorData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(
                endpoints.admin.simulators.detail(id),
                simulatorData
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteSimulator = createAsyncThunk(
    'admin/deleteSimulator',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(endpoints.admin.simulators.detail(id));
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Simulator Availability thunks
export const getSimulatorAvailability = createAsyncThunk(
    'admin/getSimulatorAvailability',
    async ({ simulatorId }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.simulators.availability(simulatorId));
            return { simulatorId, data: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateSimulatorAvailability = createAsyncThunk(
    'admin/updateSimulatorAvailability',
    async ({ simulatorId, availabilityData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(
                endpoints.admin.simulators.availability(simulatorId),
                availabilityData
            );
            return { simulatorId, data: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Package thunks
export const getPackages = createAsyncThunk(
    'admin/getPackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.packages.list);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createPackage = createAsyncThunk(
    'admin/createPackage',
    async (packageData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.packages.list, packageData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updatePackage = createAsyncThunk(
    'admin/updatePackage',
    async ({ id, packageData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(
                endpoints.admin.packages.detail(id),
                packageData
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deletePackage = createAsyncThunk(
    'admin/deletePackage',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(endpoints.admin.packages.detail(id));
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Booking management thunks
export const getBookings = createAsyncThunk(
    'admin/getBookings',
    async ({ filter = 'all', dateRange = {} }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (dateRange.start_date) params.append('start_date', dateRange.start_date);
            if (dateRange.end_date) params.append('end_date', dateRange.end_date);
            
            const response = await apiClient.get(
                `${endpoints.admin.bookings.list}?${params.toString()}`
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateBookingStatus = createAsyncThunk(
    'admin/updateBookingStatus',
    async ({ bookingId, status }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(
                endpoints.admin.bookings.updateStatus(bookingId),
                { status }
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Initial state
const initialState = {
    dashboard: {
        stats: null,
        recentBookings: [],
        loading: false,
        error: null,
    },
    staff: {
        list: [],
        selectedStaff: null,
        availability: [],
        loading: false,
        error: null,
    },
    simulators: {
        list: [],
        selectedSimulator: null,
        availability: {},
        loading: false,
        error: null,
    },
    packages: {
        list: [],
        loading: false,
        error: null,
    },
    bookings: {
        list: [],
        loading: false,
        error: null,
    },
};

// Admin slice
const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        setSelectedStaff: (state, action) => {
            state.staff.selectedStaff = action.payload;
        },
        setSelectedSimulator: (state, action) => {
            state.simulators.selectedSimulator = action.payload;
        },
        clearError: (state) => {
            state.dashboard.error = null;
            state.staff.error = null;
            state.simulators.error = null;
            state.packages.error = null;
            state.bookings.error = null;
        },
    },
    extraReducers: (builder) => {
        // Dashboard Stats
        builder
            .addCase(getDashboardStats.pending, (state) => {
                state.dashboard.loading = true;
                state.dashboard.error = null;
            })
            .addCase(getDashboardStats.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.stats = action.payload;
            })
            .addCase(getDashboardStats.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // Recent Bookings
        builder
            .addCase(getRecentBookings.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getRecentBookings.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.recentBookings = action.payload;
            })
            .addCase(getRecentBookings.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // Staff
        builder
            .addCase(getStaff.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(getStaff.fulfilled, (state, action) => {
                state.staff.loading = false;
                state.staff.list = action.payload;
            })
            .addCase(getStaff.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            })
            .addCase(createStaff.fulfilled, (state, action) => {
                state.staff.list.push(action.payload);
            })
            .addCase(updateStaff.fulfilled, (state, action) => {
                const index = state.staff.list.findIndex(s => s.id === action.payload.id);
                if (index !== -1) {
                    state.staff.list[index] = action.payload;
                }
            })
            .addCase(deleteStaff.fulfilled, (state, action) => {
                state.staff.list = state.staff.list.filter(s => s.id !== action.payload);
            });

        // Staff Availability
        builder
            .addCase(getStaffAvailability.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(getStaffAvailability.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Ensure payload is always an array
                state.staff.availability = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(getStaffAvailability.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            })
            .addCase(updateStaffAvailability.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(updateStaffAvailability.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Ensure payload is always an array
                state.staff.availability = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(updateStaffAvailability.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            });

        // Simulators
        builder
            .addCase(getSimulators.pending, (state) => {
                state.simulators.loading = true;
                state.simulators.error = null;
            })
            .addCase(getSimulators.fulfilled, (state, action) => {
                state.simulators.loading = false;
                state.simulators.list = action.payload;
            })
            .addCase(getSimulators.rejected, (state, action) => {
                state.simulators.loading = false;
                state.simulators.error = action.payload;
            })
            .addCase(createSimulator.fulfilled, (state, action) => {
                state.simulators.list.push(action.payload);
            })
            .addCase(updateSimulator.fulfilled, (state, action) => {
                const index = state.simulators.list.findIndex(s => s.id === action.payload.id);
                if (index !== -1) {
                    state.simulators.list[index] = action.payload;
                }
            })
            .addCase(deleteSimulator.fulfilled, (state, action) => {
                state.simulators.list = state.simulators.list.filter(s => s.id !== action.payload);
            })
            .addCase(getSimulatorAvailability.pending, (state) => {
                state.simulators.loading = true;
                state.simulators.error = null;
            })
            .addCase(getSimulatorAvailability.fulfilled, (state, action) => {
                state.simulators.loading = false;
                state.simulators.availability[action.payload.simulatorId] = Array.isArray(action.payload.data) ? action.payload.data : [];
            })
            .addCase(getSimulatorAvailability.rejected, (state, action) => {
                state.simulators.loading = false;
                state.simulators.error = action.payload;
            })
            .addCase(updateSimulatorAvailability.pending, (state) => {
                state.simulators.loading = true;
                state.simulators.error = null;
            })
            .addCase(updateSimulatorAvailability.fulfilled, (state, action) => {
                state.simulators.loading = false;
                state.simulators.availability[action.payload.simulatorId] = Array.isArray(action.payload.data) ? action.payload.data : [];
            })
            .addCase(updateSimulatorAvailability.rejected, (state, action) => {
                state.simulators.loading = false;
                state.simulators.error = action.payload;
            });

        // Packages
        builder
            .addCase(getPackages.pending, (state) => {
                state.packages.loading = true;
                state.packages.error = null;
            })
            .addCase(getPackages.fulfilled, (state, action) => {
                state.packages.loading = false;
                state.packages.list = action.payload;
            })
            .addCase(getPackages.rejected, (state, action) => {
                state.packages.loading = false;
                state.packages.error = action.payload;
            })
            .addCase(createPackage.fulfilled, (state, action) => {
                state.packages.list.push(action.payload);
            })
            .addCase(updatePackage.fulfilled, (state, action) => {
                const index = state.packages.list.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.packages.list[index] = action.payload;
                }
            })
            .addCase(deletePackage.fulfilled, (state, action) => {
                state.packages.list = state.packages.list.filter(p => p.id !== action.payload);
            });

        // Bookings
        builder
            .addCase(getBookings.pending, (state) => {
                state.bookings.loading = true;
                state.bookings.error = null;
            })
            .addCase(getBookings.fulfilled, (state, action) => {
                state.bookings.loading = false;
                state.bookings.list = action.payload;
            })
            .addCase(getBookings.rejected, (state, action) => {
                state.bookings.loading = false;
                state.bookings.error = action.payload;
            })
            .addCase(updateBookingStatus.fulfilled, (state, action) => {
                const index = state.bookings.list.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.bookings.list[index] = action.payload;
                }
            });
    },
});

export const { setSelectedStaff, setSelectedSimulator, clearError } = adminSlice.actions;
export default adminSlice.reducer;

