import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/axios';
import { endpoints } from '../../api/endpoints';

// Simulator thunks
export const getSimulators = createAsyncThunk(
    'simulator/getSimulators',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.simulators.list);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getActiveSimulators = createAsyncThunk(
    'simulator/getActiveSimulators',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.simulators.active);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getDurationPrices = createAsyncThunk(
    'simulator/getDurationPrices',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.simulators.durationPrices);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Initial state
const initialState = {
    simulators: [],
    activeSimulators: [],
    durationPrices: [],
    loading: false,
    error: null,
};

// Simulator slice
const simulatorSlice = createSlice({
    name: 'simulator',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSimulators.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getSimulators.fulfilled, (state, action) => {
                state.loading = false;
                state.simulators = action.payload;
            })
            .addCase(getSimulators.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(getActiveSimulators.fulfilled, (state, action) => {
                state.activeSimulators = action.payload;
            })
            .addCase(getDurationPrices.fulfilled, (state, action) => {
                state.durationPrices = action.payload;
            });
    },
});

export const { clearError } = simulatorSlice.actions;
export default simulatorSlice.reducer;





