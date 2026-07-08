import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClientSilent as apiClient } from '../../api/axios';
import { endpoints } from '../../api/endpoints';

export const getMyMemberships = createAsyncThunk(
    'memberships/getMyMemberships',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.square.memberships.my);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Failed to load memberships.' });
        }
    }
);

export const cancelMembership = createAsyncThunk(
    'memberships/cancelMembership',
    async (subscriptionId, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.square.memberships.cancel(subscriptionId));
            return { subscriptionId, ...response.data };
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Failed to cancel membership.' });
        }
    }
);

export const subscribeMembership = createAsyncThunk(
    'memberships/subscribeMembership',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.square.memberships.subscribe, payload);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || { error: 'Failed to subscribe.' });
        }
    }
);

const membershipSlice = createSlice({
    name: 'memberships',
    initialState: {
        subscriptions: [],
        loading: false,
        subscribing: false,
        canceling: false,
        error: null,
    },
    reducers: {
        clearMembershipError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            // getMyMemberships
            .addCase(getMyMemberships.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(getMyMemberships.fulfilled, (state, action) => {
                state.loading = false;
                state.subscriptions = action.payload.subscriptions || [];
            })
            .addCase(getMyMemberships.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.error || 'Failed to load memberships.';
            })
            // cancelMembership
            .addCase(cancelMembership.pending, (state) => { state.canceling = true; })
            .addCase(cancelMembership.fulfilled, (state, action) => {
                state.canceling = false;
                const idx = state.subscriptions.findIndex(s => s.subscription_id === action.payload.subscriptionId);
                if (idx !== -1) state.subscriptions[idx].status = 'canceled';
            })
            .addCase(cancelMembership.rejected, (state, action) => {
                state.canceling = false;
                state.error = action.payload?.error || 'Failed to cancel.';
            })
            // subscribeMembership
            .addCase(subscribeMembership.pending, (state) => { state.subscribing = true; state.error = null; })
            .addCase(subscribeMembership.fulfilled, (state) => { state.subscribing = false; })
            .addCase(subscribeMembership.rejected, (state, action) => {
                state.subscribing = false;
                state.error = action.payload?.error || 'Failed to subscribe.';
            });
    },
});

export const { clearMembershipError } = membershipSlice.actions;
export default membershipSlice.reducer;
