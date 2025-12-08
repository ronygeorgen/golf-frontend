import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/axios';
import { endpoints } from '../../api/endpoints';

// Booking thunks
export const getBookings = createAsyncThunk(
    'booking/getBookings',
    async ({ filter = 'all', dateRange = {} }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (dateRange.start_date) params.append('start_date', dateRange.start_date);
            if (dateRange.end_date) params.append('end_date', dateRange.end_date);
            
            const response = await apiClient.get(
                `${endpoints.bookings.list}?${params.toString()}`
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getBooking = createAsyncThunk(
    'booking/getBooking',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.bookings.detail(id));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createBooking = createAsyncThunk(
    'booking/createBooking',
    async (bookingData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.bookings.create, bookingData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateBooking = createAsyncThunk(
    'booking/updateBooking',
    async ({ id, bookingData }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(endpoints.bookings.update(id), bookingData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteBooking = createAsyncThunk(
    'booking/deleteBooking',
    async (id, { rejectWithValue }) => {
        try {
            await apiClient.delete(endpoints.bookings.delete(id));
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getUpcomingBookings = createAsyncThunk(
    'booking/getUpcomingBookings',
    async ({ page = 1, bookingType = 'all' } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (bookingType && bookingType !== 'all') params.append('booking_type', bookingType);
            if (page) params.append('page', page);
            const queryString = params.toString();
            const url = queryString
                ? `${endpoints.bookings.upcoming}?${queryString}`
                : endpoints.bookings.upcoming;
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTodayBookings = createAsyncThunk(
    'booking/getTodayBookings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.bookings.today);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateBookingStatus = createAsyncThunk(
    'booking/updateBookingStatus',
    async ({ bookingId, status }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(
                endpoints.bookings.updateStatus(bookingId),
                { status }
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const cancelBooking = createAsyncThunk(
    'booking/cancelBooking',
    async ({ bookingId, forceOverride = false }, { rejectWithValue }) => {
        try {
            const payload = forceOverride ? { force_override: true } : {};
            const response = await apiClient.post(endpoints.bookings.cancel(bookingId), payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const rescheduleBooking = createAsyncThunk(
    'booking/rescheduleBooking',
    async ({ bookingId, payload }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.bookings.reschedule(bookingId), payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCalendarBookings = createAsyncThunk(
    'booking/getCalendarBookings',
    async ({ startDate, endDate, bookingType, coachId }, { rejectWithValue }) => {
        try {
            const params = {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            };
            if (bookingType) {
                params.booking_type = bookingType;
            }
            if (coachId) {
                params.coach_id = coachId;
            }
            const response = await apiClient.get(endpoints.bookings.calendarEvents, {
                params: params,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCoachingSessionsByCoach = createAsyncThunk(
    'booking/getCoachingSessionsByCoach',
    async ({ coachId, page = 1 } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (coachId) params.append('coach_id', coachId);
            if (page) params.append('page', page);
            const queryString = params.toString();
            const url = queryString
                ? `${endpoints.bookings.coachingSessionsByCoach}?${queryString}`
                : endpoints.bookings.coachingSessionsByCoach;
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getBookingStats = createAsyncThunk(
    'booking/getBookingStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.bookings.stats);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const checkSimulatorAvailability = createAsyncThunk(
    'booking/checkSimulatorAvailability',
    async ({ date, duration }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.bookings.checkSimulatorAvailability, {
                params: {
                    date: date,
                    duration: duration,
                },
            });
            return {
                slots: response.data.available_slots || [],
                specialEventMessage: response.data.special_event_message || null,
                message: response.data.message || null, // Include API message
                error: response.data.error || null, // Include API error if present
            };
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const checkCoachingAvailability = createAsyncThunk(
    'booking/checkCoachingAvailability',
    async ({ date, packageId, coachId, duration = 60 }, { rejectWithValue }) => {
        try {
            const params = { date: date, duration: duration };
            if (packageId) params.package_id = packageId;
            if (coachId) params.coach_id = coachId;
            
            const response = await apiClient.get(endpoints.bookings.checkCoachingAvailability, {
                params: params,
            });
            return {
                slots: response.data.available_slots || [],
                specialEventMessage: response.data.special_event_message || null,
                message: response.data.message || null, // Include API message
                error: response.data.error || null, // Include API error if present
            };
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getSimulatorCredits = createAsyncThunk(
    'booking/getSimulatorCredits',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.simulators.credits, {
                params: { status: 'available' },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getAvailableSimulatorHours = createAsyncThunk(
    'booking/getAvailableSimulatorHours',
    async ({ use_organization = false } = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams();
            if (use_organization) params.append('use_organization', 'true');
            const queryString = params.toString();
            const url = queryString
                ? `${endpoints.bookings.availableSimulatorHours}?${queryString}`
                : endpoints.bookings.availableSimulatorHours;
            const response = await apiClient.get(url);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Initial state
const initialState = {
    bookings: [],
    selectedBooking: null,
    upcomingBookings: [],
    upcomingPagination: {
        count: 0,
        page: 1,
        totalPages: 1,
        pageSize: 5, // 5 items per page for upcoming bookings
    },
    todayBookings: [],
    calendarEvents: [],
    stats: null,
    availability: {
        simulator: [],
        coaching: [],
        specialEventMessage: null,
    },
    loading: false,
    error: null,
    simulatorCredits: [],
    creditsLoading: false,
    totalAvailableHours: 0,
    availableHoursLoading: false,
};

// Booking slice
const bookingSlice = createSlice({
    name: 'booking',
    initialState,
    reducers: {
        setSelectedBooking: (state, action) => {
            state.selectedBooking = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearAvailability: (state) => {
            state.availability = { simulator: [], coaching: [], specialEventMessage: null };
        },
    },
    extraReducers: (builder) => {
        // Get Bookings
        builder
            .addCase(getBookings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getBookings.fulfilled, (state, action) => {
                state.loading = false;
                state.bookings = action.payload;
            })
            .addCase(getBookings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Booking
        builder
            .addCase(getBooking.fulfilled, (state, action) => {
                state.selectedBooking = action.payload;
            });

        // Create Booking
        builder
            .addCase(createBooking.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createBooking.fulfilled, (state, action) => {
                state.loading = false;
                state.bookings.push(action.payload);
            })
            .addCase(createBooking.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Booking
        builder
            .addCase(updateBooking.fulfilled, (state, action) => {
                const index = state.bookings.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.bookings[index] = action.payload;
                }
                if (state.selectedBooking?.id === action.payload.id) {
                    state.selectedBooking = action.payload;
                }
            });

        // Delete Booking
        builder
            .addCase(deleteBooking.fulfilled, (state, action) => {
                state.bookings = state.bookings.filter(b => b.id !== action.payload);
            });

        // Upcoming Bookings
        builder
            .addCase(getUpcomingBookings.pending, (state) => {
                state.loading = true;
            })
            .addCase(getUpcomingBookings.fulfilled, (state, action) => {
                state.loading = false;
                const results = Array.isArray(action.payload)
                    ? action.payload
                    : action.payload?.results || [];
                state.upcomingBookings = results;
                const count = action.payload?.count ?? results.length ?? 0;
                const pageSize = 5; // Fixed page size for upcoming bookings
                const currentPage = action.meta?.arg?.page || 1;
                state.upcomingPagination = {
                    count,
                    pageSize,
                    page: currentPage,
                    totalPages: Math.max(1, Math.ceil(count / pageSize) || 1),
                };
            })
            .addCase(getUpcomingBookings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Today Bookings
        builder
            .addCase(getTodayBookings.fulfilled, (state, action) => {
                state.todayBookings = action.payload;
            });

        // Update Booking Status
        builder
            .addCase(updateBookingStatus.fulfilled, (state, action) => {
                const index = state.bookings.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.bookings[index] = action.payload;
                }
            });

        // Cancel Booking
        builder
            .addCase(cancelBooking.fulfilled, (state, action) => {
                const bookingData = action.payload?.booking || action.payload;
                if (bookingData?.id) {
                    const index = state.bookings.findIndex(b => b.id === bookingData.id);
                    if (index !== -1) {
                        state.bookings[index] = bookingData;
                    }
                    state.upcomingBookings = state.upcomingBookings.map(b =>
                        b.id === bookingData.id ? bookingData : b
                    );
                }
            })
            .addCase(rescheduleBooking.fulfilled, (state, action) => {
                const bookingData = action.payload?.booking || action.payload;
                if (bookingData?.id) {
                    const index = state.bookings.findIndex(b => b.id === bookingData.id);
                    if (index !== -1) {
                        state.bookings[index] = bookingData;
                    }
                    state.upcomingBookings = state.upcomingBookings.map(b =>
                        b.id === bookingData.id ? bookingData : b
                    );
                }
            });

        // Calendar Bookings
        builder
            .addCase(getCalendarBookings.pending, (state) => {
                state.loading = true;
            })
            .addCase(getCalendarBookings.fulfilled, (state, action) => {
                state.loading = false;
                state.calendarEvents = action.payload;
            })
            .addCase(getCalendarBookings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Coaching Sessions By Coach
        builder
            .addCase(getCoachingSessionsByCoach.pending, (state) => {
                state.loading = true;
            })
            .addCase(getCoachingSessionsByCoach.fulfilled, (state, action) => {
                state.loading = false;
                const results = Array.isArray(action.payload)
                    ? action.payload
                    : action.payload?.results || [];
                state.upcomingBookings = results;
                const count = action.payload?.count ?? results.length ?? 0;
                const pageSize = 5;
                const currentPage = action.meta?.arg?.page || 1;
                state.upcomingPagination = {
                    count,
                    pageSize,
                    page: currentPage,
                    totalPages: Math.max(1, Math.ceil(count / pageSize) || 1),
                };
            })
            .addCase(getCoachingSessionsByCoach.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Booking Stats
        builder
            .addCase(getBookingStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            });

        // Check Availability
        builder
            .addCase(checkSimulatorAvailability.pending, (state) => {
                state.loading = true;
            })
            .addCase(checkSimulatorAvailability.fulfilled, (state, action) => {
                state.loading = false;
                state.availability.simulator = action.payload.slots || [];
                state.availability.specialEventMessage = action.payload.specialEventMessage || null;
            })
            .addCase(checkSimulatorAvailability.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(checkCoachingAvailability.pending, (state) => {
                state.loading = true;
            })
            .addCase(checkCoachingAvailability.fulfilled, (state, action) => {
                state.loading = false;
                state.availability.coaching = action.payload.slots || [];
                state.availability.specialEventMessage = action.payload.specialEventMessage || null;
            })
            .addCase(checkCoachingAvailability.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Simulator Credits
        builder
            .addCase(getSimulatorCredits.pending, (state) => {
                state.creditsLoading = true;
            })
            .addCase(getSimulatorCredits.fulfilled, (state, action) => {
                state.creditsLoading = false;
                state.simulatorCredits = action.payload || [];
            })
            .addCase(getSimulatorCredits.rejected, (state, action) => {
                state.creditsLoading = false;
                state.error = action.payload;
            })
            .addCase(getAvailableSimulatorHours.pending, (state) => {
                state.availableHoursLoading = true;
            })
            .addCase(getAvailableSimulatorHours.fulfilled, (state, action) => {
                state.availableHoursLoading = false;
                state.totalAvailableHours = action.payload?.total_available_hours || 0;
            })
            .addCase(getAvailableSimulatorHours.rejected, (state, action) => {
                state.availableHoursLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setSelectedBooking, clearError, clearAvailability } = bookingSlice.actions;
export default bookingSlice.reducer;

