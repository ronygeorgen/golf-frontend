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

export const getMyPackagePurchases = createAsyncThunk(
    'coaching/getMyPackagePurchases',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.myPurchases);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createPackagePurchase = createAsyncThunk(
    'coaching/createPackagePurchase',
    async ({ packageId, notes, purchaseType = 'normal', recipientPhone, purchaseName, memberPhones }, { rejectWithValue }) => {
        try {
            const payload = {
                package: packageId,
                purchase_type: purchaseType,
                purchase_name: purchaseName,
            };
            if (notes) {
                payload.notes = notes;
            }
            if (purchaseType === 'gift' && recipientPhone) {
                payload.recipient_phone = recipientPhone;
            }
            if (purchaseType === 'organization' && memberPhones && memberPhones.length > 0) {
                payload.member_phones = memberPhones;
            }
            const locationId = localStorage.getItem('ghlLocationId');
            if (locationId) {
                payload.location_id = locationId;
            }
            const response = await apiClient.post(endpoints.coaching.purchases, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getOrganizationPackages = createAsyncThunk(
    'coaching/getOrganizationPackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.organizationPackages);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getGiftsPending = createAsyncThunk(
    'coaching/getGiftsPending',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.giftsPending);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const claimGift = createAsyncThunk(
    'coaching/claimGift',
    async ({ token, action }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.coaching.giftClaim(token), { action });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const checkPhoneExists = createAsyncThunk(
    'coaching/checkPhoneExists',
    async (phone, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.checkPhone, {
                params: { phone }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createSessionTransfer = createAsyncThunk(
    'coaching/createSessionTransfer',
    async ({ packagePurchaseId, toUserPhone, sessionCount, notes }, { rejectWithValue }) => {
        try {
            const payload = {
                package_purchase: packagePurchaseId,
                to_user_phone: toUserPhone,
                session_count: sessionCount,
            };
            if (notes) {
                payload.notes = notes;
            }
            const response = await apiClient.post(endpoints.coaching.transfers, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTransfersPending = createAsyncThunk(
    'coaching/getTransfersPending',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.transfersPending);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const claimTransfer = createAsyncThunk(
    'coaching/claimTransfer',
    async ({ transferId, action }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.coaching.transferClaim(transferId), { action });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Initial state
const initialState = {
    packages: [],
    activePackages: [],
    purchases: [],
    organizationPackages: [],
    giftsPending: [],
    transfersPending: [],
    phoneCheck: null,
    loading: false,
    purchasesLoading: false,
    organizationPackagesLoading: false,
    purchaseSubmitting: false,
    phoneChecking: false,
    giftsLoading: false,
    transfersLoading: false,
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
        clearPhoneCheck: (state) => {
            state.phoneCheck = null;
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
            })
            .addCase(getMyPackagePurchases.pending, (state) => {
                state.purchasesLoading = true;
                state.error = null;
            })
            .addCase(getMyPackagePurchases.fulfilled, (state, action) => {
                state.purchasesLoading = false;
                state.purchases = action.payload;
            })
            .addCase(getMyPackagePurchases.rejected, (state, action) => {
                state.purchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(createPackagePurchase.pending, (state) => {
                state.purchaseSubmitting = true;
                state.error = null;
            })
            .addCase(createPackagePurchase.fulfilled, (state, action) => {
                state.purchaseSubmitting = false;
                state.purchases = [action.payload, ...state.purchases];
            })
            .addCase(createPackagePurchase.rejected, (state, action) => {
                state.purchaseSubmitting = false;
                state.error = action.payload;
            })
            .addCase(getGiftsPending.pending, (state) => {
                state.giftsLoading = true;
            })
            .addCase(getGiftsPending.fulfilled, (state, action) => {
                state.giftsLoading = false;
                state.giftsPending = action.payload;
            })
            .addCase(getGiftsPending.rejected, (state, action) => {
                state.giftsLoading = false;
                state.error = action.payload;
            })
            .addCase(claimGift.fulfilled, (state, action) => {
                // Remove from pending and add to purchases if accepted
                state.giftsPending = state.giftsPending.filter(
                    gift => gift.id !== action.payload.purchase?.id
                );
                if (action.payload.purchase) {
                    state.purchases = [action.payload.purchase, ...state.purchases];
                }
            })
            .addCase(checkPhoneExists.pending, (state) => {
                state.phoneChecking = true;
            })
            .addCase(checkPhoneExists.fulfilled, (state, action) => {
                state.phoneChecking = false;
                state.phoneCheck = action.payload;
            })
            .addCase(checkPhoneExists.rejected, (state, action) => {
                state.phoneChecking = false;
                state.phoneCheck = { exists: false };
            })
            .addCase(createSessionTransfer.fulfilled, (state, action) => {
                // Update the purchase to reflect transferred sessions
                const purchase = state.purchases.find(p => p.id === action.payload.package_purchase);
                if (purchase) {
                    purchase.sessions_remaining -= action.payload.session_count;
                }
            })
            .addCase(getTransfersPending.pending, (state) => {
                state.transfersLoading = true;
            })
            .addCase(getTransfersPending.fulfilled, (state, action) => {
                state.transfersLoading = false;
                state.transfersPending = action.payload;
            })
            .addCase(getTransfersPending.rejected, (state, action) => {
                state.transfersLoading = false;
                state.error = action.payload;
            })
            .addCase(getOrganizationPackages.pending, (state) => {
                state.organizationPackagesLoading = true;
                state.error = null;
            })
            .addCase(getOrganizationPackages.fulfilled, (state, action) => {
                state.organizationPackagesLoading = false;
                state.organizationPackages = action.payload;
            })
            .addCase(getOrganizationPackages.rejected, (state, action) => {
                state.organizationPackagesLoading = false;
                state.error = action.payload;
            })
            .addCase(claimTransfer.fulfilled, (state, action) => {
                // Remove from pending and add to purchases if accepted
                state.transfersPending = state.transfersPending.filter(
                    transfer => transfer.id !== action.payload.transfer?.id
                );
                if (action.payload.new_purchase) {
                    state.purchases = [action.payload.new_purchase, ...state.purchases];
                }
            });
    },
});

export const { clearError, clearPhoneCheck } = coachingSlice.actions;
export default coachingSlice.reducer;

