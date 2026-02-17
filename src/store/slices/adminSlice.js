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

// New dashboard visualization thunks
export const getBusyQuietTimes = createAsyncThunk(
    'admin/getBusyQuietTimes',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.dashboard.busyQuietTimes, { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTopCustomers = createAsyncThunk(
    'admin/getTopCustomers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.dashboard.topCustomers, { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getStaffSales = createAsyncThunk(
    'admin/getStaffSales',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.dashboard.staffSales, { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTpiConversion = createAsyncThunk(
    'admin/getTpiConversion',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.dashboard.tpiConversion, { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getKpiStats = createAsyncThunk(
    'admin/getKpiStats',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.dashboard.kpiStats, { params });
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

// Staff Day Availability thunks (non-recurring)
export const getStaffDayAvailability = createAsyncThunk(
    'admin/getStaffDayAvailability',
    async ({ staffId }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.staff.dayAvailability(staffId));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateStaffDayAvailability = createAsyncThunk(
    'admin/updateStaffDayAvailability',
    async ({ staffId, availabilityData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(
                endpoints.admin.staff.dayAvailability(staffId),
                availabilityData
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Staff Blocked Dates thunks
export const getStaffBlockedDates = createAsyncThunk(
    'admin/getStaffBlockedDates',
    async ({ staffId }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.staff.blockedDates(staffId));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const blockStaffDate = createAsyncThunk(
    'admin/blockStaffDate',
    async ({ staffId, date, start_time, end_time, reason }, { rejectWithValue }) => {
        try {
            const payload = { date, reason };

            // Only include times if both are provided
            if (start_time && end_time) {
                payload.start_time = start_time;
                payload.end_time = end_time;
            }

            const response = await apiClient.post(
                endpoints.admin.staff.blockedDates(staffId),
                payload
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const unblockStaffDate = createAsyncThunk(
    'admin/unblockStaffDate',
    async ({ staffId, date }, { rejectWithValue }) => {
        try {
            const response = await apiClient.delete(
                endpoints.admin.staff.blockedDates(staffId),
                { data: { date } }
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
            const response = await apiClient.patch(
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
    async ({ filter = 'all', dateRange = {}, page = 1, bookingType = 'all', search = '' } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') {
                if (filter === 'tpi_assessment') {
                    params.append('status', 'tpi_assessment');
                } else {
                    params.append('status', filter);
                }
            }
            if (dateRange.start_date) params.append('start_date', dateRange.start_date);
            if (dateRange.end_date) params.append('end_date', dateRange.end_date);
            if (bookingType && bookingType !== 'all') params.append('booking_type', bookingType);
            if (search) params.append('search', search);
            if (page) params.append('page', page);
            const queryString = params.toString();
            const url = queryString
                ? `${endpoints.admin.bookings.list}?${queryString}`
                : endpoints.admin.bookings.list;
            const response = await apiClient.get(url);
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

export const adminCancelBooking = createAsyncThunk(
    'admin/adminCancelBooking',
    async ({ bookingId, forceOverride = false, refundCredit = undefined }, { rejectWithValue }) => {
        try {
            const payload = {};
            if (forceOverride) payload.force_override = true;
            if (refundCredit !== undefined) payload.refund_credit = refundCredit;

            const response = await apiClient.post(endpoints.admin.bookings.cancel(bookingId), payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getLockedBookings = createAsyncThunk(
    'admin/getLockedBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.admin.overrides.lockedBookings);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const grantCoachingSessions = createAsyncThunk(
    'admin/grantCoachingSessions',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.overrides.coachingSessions, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const grantSimulatorCredits = createAsyncThunk(
    'admin/grantSimulatorCredits',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.overrides.simulatorCredits, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// User management thunks
export const getUsers = createAsyncThunk(
    'admin/getUsers',
    async ({ page = 1, pageSize = 20, role = null, isPaused = null, search = null } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (page) params.append('page', page);
            if (pageSize) params.append('page_size', pageSize);
            if (role) params.append('role', role);
            if (isPaused !== null) params.append('is_paused', isPaused);
            if (search) params.append('search', search);

            const queryString = params.toString();
            const url = queryString
                ? `${endpoints.admin.users.list}?${queryString}`
                : endpoints.admin.users.list;
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const toggleUserPause = createAsyncThunk(
    'admin/toggleUserPause',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.users.togglePause(userId));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createUser = createAsyncThunk(
    'admin/createUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.admin.users.list, userData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateUser = createAsyncThunk(
    'admin/updateUser',
    async ({ id, userData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.patch(endpoints.admin.users.detail(id), userData);
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
        busyQuietTimes: null,
        topCustomers: null,
        staffSales: null,
        tpiConversion: null,
        kpiStats: null,
        loading: false,
        error: null,
    },
    staff: {
        list: [],
        selectedStaff: null,
        availability: [],
        dayAvailability: [],
        blockedDates: [],
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
        pagination: {
            count: 0,
            page: 1,
            totalPages: 1,
            pageSize: 10,
        },
    },
    users: {
        list: [],
        loading: false,
        error: null,
        pagination: {
            count: 0,
            totalPages: 0,
            currentPage: 1,
            pageSize: 20,
        },
    },
    overrides: {
        coaching: {
            loading: false,
            error: null,
            success: null,
        },
        simulator: {
            loading: false,
            error: null,
            success: null,
        },
        lockedBookings: {
            list: [],
            loading: false,
            error: null,
        },
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
            state.users.error = null;
            state.overrides.coaching.error = null;
            state.overrides.simulator.error = null;
        },
        resetOverrideStatus: (state, action) => {
            const target = action.payload;
            if (target && state.overrides[target]) {
                state.overrides[target].error = null;
                state.overrides[target].success = null;
            }
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

        // Busy & Quiet Times
        builder
            .addCase(getBusyQuietTimes.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getBusyQuietTimes.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.busyQuietTimes = action.payload;
            })
            .addCase(getBusyQuietTimes.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // Top Customers
        builder
            .addCase(getTopCustomers.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getTopCustomers.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.topCustomers = action.payload;
            })
            .addCase(getTopCustomers.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // Staff Sales
        builder
            .addCase(getStaffSales.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getStaffSales.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.staffSales = action.payload;
            })
            .addCase(getStaffSales.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // TPI Conversion
        builder
            .addCase(getTpiConversion.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getTpiConversion.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.tpiConversion = action.payload;
            })
            .addCase(getTpiConversion.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });

        // KPI Stats
        builder
            .addCase(getKpiStats.pending, (state) => {
                state.dashboard.loading = true;
            })
            .addCase(getKpiStats.fulfilled, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.kpiStats = action.payload;
            })
            .addCase(getKpiStats.rejected, (state, action) => {
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

        // Staff Day Availability
        builder
            .addCase(getStaffDayAvailability.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(getStaffDayAvailability.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Ensure payload is always an array
                state.staff.dayAvailability = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(getStaffDayAvailability.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            })
            .addCase(updateStaffDayAvailability.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(updateStaffDayAvailability.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Ensure payload is always an array
                state.staff.dayAvailability = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(updateStaffDayAvailability.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            });

        // Staff Blocked Dates
        builder
            .addCase(getStaffBlockedDates.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(getStaffBlockedDates.fulfilled, (state, action) => {
                state.staff.loading = false;
                state.staff.blockedDates = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(getStaffBlockedDates.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            })
            .addCase(blockStaffDate.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(blockStaffDate.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Add the new blocked date to the list if it has the blocked_date property
                if (action.payload?.blocked_date) {
                    state.staff.blockedDates.push(action.payload.blocked_date);
                }
            })
            .addCase(blockStaffDate.rejected, (state, action) => {
                state.staff.loading = false;
                state.staff.error = action.payload;
            })
            .addCase(unblockStaffDate.pending, (state) => {
                state.staff.loading = true;
                state.staff.error = null;
            })
            .addCase(unblockStaffDate.fulfilled, (state, action) => {
                state.staff.loading = false;
                // Remove the unblocked date from the list
                // The date is in the meta.arg.date
                const dateToRemove = action.meta?.arg?.date;
                if (dateToRemove) {
                    state.staff.blockedDates = state.staff.blockedDates.filter(
                        bd => bd.date !== dateToRemove
                    );
                }
            })
            .addCase(unblockStaffDate.rejected, (state, action) => {
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
                const results = Array.isArray(action.payload)
                    ? action.payload
                    : action.payload?.results || [];
                state.bookings.list = results;
                const count = action.payload?.count ?? results.length ?? 0;
                const pageSize = state.bookings.pagination.pageSize || 10;
                const currentPage = action.meta?.arg?.page || 1;
                state.bookings.pagination = {
                    count,
                    pageSize,
                    page: currentPage,
                    totalPages: Math.max(1, Math.ceil(count / pageSize) || 1),
                };
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
            })
            .addCase(adminCancelBooking.fulfilled, (state, action) => {
                const booking = action.payload?.booking || action.payload;
                if (booking?.id) {
                    // Update booking in bookings list
                    const index = state.bookings.list.findIndex(b => b.id === booking.id);
                    if (index !== -1) {
                        state.bookings.list[index] = booking;
                    }
                    // Remove cancelled booking from locked bookings list
                    state.overrides.lockedBookings.list = state.overrides.lockedBookings.list.filter(
                        b => b.id !== booking.id
                    );
                } else {
                    // Fallback: try to get bookingId from meta
                    const bookingId = action.meta?.arg?.bookingId;
                    if (bookingId) {
                        state.overrides.lockedBookings.list = state.overrides.lockedBookings.list.filter(
                            b => b.id !== bookingId
                        );
                    }
                }
            });

        builder
            .addCase(grantCoachingSessions.pending, (state) => {
                state.overrides.coaching.loading = true;
                state.overrides.coaching.error = null;
                state.overrides.coaching.success = null;
            })
            .addCase(grantCoachingSessions.fulfilled, (state, action) => {
                state.overrides.coaching.loading = false;
                state.overrides.coaching.success = action.payload?.message || 'Sessions granted successfully.';
            })
            .addCase(grantCoachingSessions.rejected, (state, action) => {
                state.overrides.coaching.loading = false;
                state.overrides.coaching.error = action.payload || 'Unable to grant sessions.';
            })
            .addCase(grantSimulatorCredits.pending, (state) => {
                state.overrides.simulator.loading = true;
                state.overrides.simulator.error = null;
                state.overrides.simulator.success = null;
            })
            .addCase(grantSimulatorCredits.fulfilled, (state, action) => {
                state.overrides.simulator.loading = false;
                state.overrides.simulator.success = action.payload?.message || 'Simulator credits granted.';
            })
            .addCase(grantSimulatorCredits.rejected, (state, action) => {
                state.overrides.simulator.loading = false;
                state.overrides.simulator.error = action.payload || 'Unable to grant simulator credits.';
            })
            .addCase(getLockedBookings.pending, (state) => {
                state.overrides.lockedBookings.loading = true;
                state.overrides.lockedBookings.error = null;
            })
            .addCase(getLockedBookings.fulfilled, (state, action) => {
                state.overrides.lockedBookings.loading = false;
                state.overrides.lockedBookings.list = action.payload?.bookings || [];
            })
            .addCase(getLockedBookings.rejected, (state, action) => {
                state.overrides.lockedBookings.loading = false;
                state.overrides.lockedBookings.error = action.payload || 'Unable to fetch locked bookings.';
            });

        // User management
        builder
            .addCase(getUsers.pending, (state) => {
                state.users.loading = true;
                state.users.error = null;
            })
            .addCase(getUsers.fulfilled, (state, action) => {
                state.users.loading = false;
                state.users.list = action.payload.results || [];
                const count = action.payload.count || 0;
                const pageSize = action.meta?.arg?.pageSize || 20;
                const currentPage = action.meta?.arg?.page || 1;
                state.users.pagination = {
                    count,
                    pageSize,
                    currentPage,
                    totalPages: Math.max(1, Math.ceil(count / pageSize) || 1),
                };
            })
            .addCase(createUser.fulfilled, (state, action) => {
                state.users.list.unshift(action.payload);
                state.users.pagination.count += 1;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                const index = state.users.list.findIndex(u => u.id === action.payload.id);
                if (index !== -1) {
                    state.users.list[index] = action.payload;
                }
            })
            .addCase(getUsers.rejected, (state, action) => {
                state.users.loading = false;
                state.users.error = action.payload;
            })
            .addCase(toggleUserPause.pending, (state) => {
                state.users.loading = true;
            })
            .addCase(toggleUserPause.fulfilled, (state, action) => {
                state.users.loading = false;
                const userId = action.meta?.arg;
                const index = state.users.list.findIndex(u => u.id === userId);
                if (index !== -1) {
                    state.users.list[index].is_paused = action.payload.is_paused;
                }
            })
            .addCase(toggleUserPause.rejected, (state, action) => {
                state.users.loading = false;
                state.users.error = action.payload;
            });
    },
});

export const { setSelectedStaff, setSelectedSimulator, clearError, resetOverrideStatus } = adminSlice.actions;
export default adminSlice.reducer;

