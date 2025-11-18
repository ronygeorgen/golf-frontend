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
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.bookings.upcoming);
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
    async (bookingId, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.bookings.cancel(bookingId));
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getCalendarBookings = createAsyncThunk(
    'booking/getCalendarBookings',
    async ({ startDate, endDate, bookingType }, { rejectWithValue }) => {
        try {
            const params = {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            };
            if (bookingType) {
                params.booking_type = bookingType;
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
            return response.data.available_slots || [];
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
            return response.data.available_slots || [];
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
    todayBookings: [],
    calendarEvents: [],
    stats: null,
    availability: {
        simulator: [],
        coaching: [],
    },
    loading: false,
    error: null,
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
            state.availability = { simulator: [], coaching: [] };
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
                state.upcomingBookings = action.payload;
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
                const index = state.bookings.findIndex(b => b.id === action.payload.id);
                if (index !== -1) {
                    state.bookings[index] = action.payload;
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
                state.availability.simulator = action.payload;
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
                state.availability.coaching = action.payload;
            })
            .addCase(checkCoachingAvailability.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { setSelectedBooking, clearError, clearAvailability } = bookingSlice.actions;
export default bookingSlice.reducer;

