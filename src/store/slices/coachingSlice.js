import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/axios';
import { endpoints } from '../../api/endpoints';

// Coaching thunks
export const getPackages = createAsyncThunk(
    'coaching/getPackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.packages);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getActivePackages = createAsyncThunk(
    'coaching/getActivePackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.active);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getActiveCoachingPackages = getActivePackages; // Alias for consistency

// Initial state
const initialState = {
    packages: [],
    activePackages: [],
    loading: false,
    error: null,
};

// Coaching slice
const coachingSlice = createSlice({
    name: 'coaching',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPackages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getPackages.fulfilled, (state, action) => {
                state.loading = false;
                state.packages = action.payload;
            })
            .addCase(getPackages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getActivePackages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getActivePackages.fulfilled, (state, action) => {
                state.loading = false;
                state.activePackages = action.payload;
                state.packages = action.payload; // Also update packages
            })
            .addCase(getActivePackages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearError } = coachingSlice.actions;
export default coachingSlice.reducer;

