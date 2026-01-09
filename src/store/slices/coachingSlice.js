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

export const getSimulatorPackages = createAsyncThunk(
    'coaching/getSimulatorPackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.simulatorPackages);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getActiveSimulatorPackages = createAsyncThunk(
    'coaching/getActiveSimulatorPackages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.simulatorPackagesActive);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createSimulatorPackagePurchase = createAsyncThunk(
    'coaching/createSimulatorPackagePurchase',
    async ({ packageId, notes, purchaseType = 'normal', recipientPhone, purchaseName }, { rejectWithValue }) => {
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
            // location_id is automatically added by axios interceptor
            const response = await apiClient.post(endpoints.coaching.simulatorPurchases, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getMySimulatorPurchases = createAsyncThunk(
    'coaching/getMySimulatorPurchases',
    async ({ page = 1 } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.mySimulatorPurchases, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getMyPackagePurchases = createAsyncThunk(
    'coaching/getMyPackagePurchases',
    async ({ page = 1 } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.myPurchases, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getUserPurchases = createAsyncThunk(
    'coaching/getUserPurchases',
    async ({ userId, page = 1 }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.userPurchases, {
                params: { user_id: userId, page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getUserSimulatorPurchases = createAsyncThunk(
    'coaching/getUserSimulatorPurchases',
    async ({ userId, page = 1 }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.userSimulatorPurchases, {
                params: { user_id: userId, page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createTempPurchase = createAsyncThunk(
    'coaching/createTempPurchase',
    async ({ packageId, buyerPhone, purchaseType = 'normal', recipients = [], packageType }, { rejectWithValue }) => {
        try {
            if (!packageType || !['coaching', 'simulator'].includes(packageType)) {
                return rejectWithValue({ error: 'packageType is required and must be either "coaching" or "simulator"' });
            }

            const payload = {
                package_id: packageId,
                buyer_phone: buyerPhone,
                purchase_type: purchaseType,
                recipients: recipients,
                package_type: packageType, // REQUIRED: 'coaching' or 'simulator'
            };
            const response = await apiClient.post(endpoints.coaching.tempPurchase, payload);
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
            // location_id is automatically added by axios interceptor
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

export const getMyOrganizationPurchases = createAsyncThunk(
    'coaching/getMyOrganizationPurchases',
    async ({ page = 1 } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.myOrganizationPurchases, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTransferablePurchases = createAsyncThunk(
    'coaching/getTransferablePurchases',
    async ({ page = 1 } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.transferablePurchases, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getTransferableSimulatorPurchases = createAsyncThunk(
    'coaching/getTransferableSimulatorPurchases',
    async ({ page = 1 } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.transferableSimulatorPurchases, {
                params: { page }
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const createSimulatorHoursTransfer = createAsyncThunk(
    'coaching/createSimulatorHoursTransfer',
    async ({ packagePurchaseId, toUserPhone, hours, notes }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.coaching.simulatorTransfers, {
                package_purchase: packagePurchaseId,
                to_user_phone: toUserPhone,
                hours: hours,
                notes: notes || undefined,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const addOrganizationMember = createAsyncThunk(
    'coaching/addOrganizationMember',
    async ({ purchaseId, phone }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.coaching.addMember(purchaseId), {
                phone: phone.trim()
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const removeOrganizationMember = createAsyncThunk(
    'coaching/removeOrganizationMember',
    async ({ purchaseId, phone }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.coaching.removeMember(purchaseId), {
                phone: phone.trim()
            });
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

export const getPackageUsageDetails = createAsyncThunk(
    'coaching/getPackageUsageDetails',
    async ({ purchaseId }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.coaching.usageDetails(purchaseId));
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
    simulatorPackages: [],
    simulatorPackagesLoading: false,
    purchases: [],
    simulatorPurchases: [],
    simulatorPurchasesLoading: false,
    purchasesPagination: {
        count: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 10,
    },
    organizationPackages: [],
    organizationPurchases: [],
    organizationPurchasesPagination: {
        count: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 10,
    },
    transferablePurchases: [],
    transferablePurchasesPagination: {
        count: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 10,
    },
    transferableSimulatorPurchases: [],
    transferableSimulatorPurchasesPagination: {
        count: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 10,
    },
    giftsPending: [],
    transfersPending: [],
    phoneCheck: null,
    usageDetails: null,
    usageDetailsLoading: false,
    loading: false,
    purchasesLoading: false,
    organizationPackagesLoading: false,
    organizationPurchasesLoading: false,
    transferablePurchasesLoading: false,
    memberManagementLoading: false,
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
                // Preserve category from backend if it exists, otherwise determine it from package data
                const packagesWithCategory = Array.isArray(action.payload)
                    ? action.payload.map(pkg => {
                        // If backend already sent category, preserve it (check for truthy string values)
                        if (pkg.category && (pkg.category === 'coaching' || pkg.category === 'combo' || pkg.category === 'simulator')) {
                            return { ...pkg, category: pkg.category };
                        }
                        // Otherwise, determine category from package data
                        // Combo packages have simulator_hours > 0
                        const hasSimulatorHours = pkg.simulator_hours && parseFloat(pkg.simulator_hours) > 0;
                        const determinedCategory = hasSimulatorHours ? 'combo' : 'coaching';
                        console.log('📦 Package category determined:', {
                            id: pkg.id,
                            title: pkg.title,
                            backendCategory: pkg.category,
                            determinedCategory,
                            simulator_hours: pkg.simulator_hours
                        });
                        return { ...pkg, category: determinedCategory };
                    })
                    : action.payload;
                state.activePackages = packagesWithCategory;
                state.packages = packagesWithCategory; // Also update packages
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
                // Handle paginated response
                if (action.payload.results !== undefined) {
                    state.purchases = action.payload.results;
                    state.purchasesPagination = {
                        count: action.payload.count || 0,
                        totalPages: action.payload.total_pages || 0,
                        currentPage: action.payload.current_page || 1,
                        pageSize: action.payload.page_size || 10,
                    };
                } else {
                    // Fallback for non-paginated response
                    state.purchases = action.payload;
                }
            })
            .addCase(getMyPackagePurchases.rejected, (state, action) => {
                state.purchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(createTempPurchase.pending, (state) => {
                state.purchaseSubmitting = true;
                state.error = null;
            })
            .addCase(createTempPurchase.fulfilled, (state, action) => {
                state.purchaseSubmitting = false;
                // Temp purchase doesn't add to purchases - it's just for redirect
            })
            .addCase(createTempPurchase.rejected, (state, action) => {
                state.purchaseSubmitting = false;
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
            .addCase(getMyOrganizationPurchases.pending, (state) => {
                state.organizationPurchasesLoading = true;
                state.error = null;
            })
            .addCase(getMyOrganizationPurchases.fulfilled, (state, action) => {
                state.organizationPurchasesLoading = false;
                // Handle paginated response
                if (action.payload.results !== undefined) {
                    state.organizationPurchases = action.payload.results;
                    state.organizationPurchasesPagination = {
                        count: action.payload.count || 0,
                        totalPages: action.payload.total_pages || 0,
                        currentPage: action.payload.current_page || 1,
                        pageSize: action.payload.page_size || 10,
                    };
                } else {
                    // Fallback for non-paginated response
                    state.organizationPurchases = action.payload;
                }
            })
            .addCase(getMyOrganizationPurchases.rejected, (state, action) => {
                state.organizationPurchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(getTransferablePurchases.pending, (state) => {
                state.transferablePurchasesLoading = true;
                state.error = null;
            })
            .addCase(getTransferablePurchases.fulfilled, (state, action) => {
                state.transferablePurchasesLoading = false;
                // Handle paginated response
                if (action.payload.results !== undefined) {
                    state.transferablePurchases = action.payload.results;
                    state.transferablePurchasesPagination = {
                        count: action.payload.count || 0,
                        totalPages: action.payload.total_pages || 0,
                        currentPage: action.payload.current_page || 1,
                        pageSize: action.payload.page_size || 10,
                    };
                } else {
                    // Fallback for non-paginated response
                    state.transferablePurchases = action.payload;
                }
            })
            .addCase(getTransferablePurchases.rejected, (state, action) => {
                state.transferablePurchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(addOrganizationMember.pending, (state) => {
                state.memberManagementLoading = true;
                state.error = null;
            })
            .addCase(addOrganizationMember.fulfilled, (state, action) => {
                state.memberManagementLoading = false;
                // Update the purchase in organizationPurchases
                const updatedPurchase = action.payload.purchase;
                const index = state.organizationPurchases.findIndex(p => p.id === updatedPurchase.id);
                if (index !== -1) {
                    state.organizationPurchases[index] = updatedPurchase;
                }
            })
            .addCase(addOrganizationMember.rejected, (state, action) => {
                state.memberManagementLoading = false;
                state.error = action.payload;
            })
            .addCase(removeOrganizationMember.pending, (state) => {
                state.memberManagementLoading = true;
                state.error = null;
            })
            .addCase(removeOrganizationMember.fulfilled, (state, action) => {
                state.memberManagementLoading = false;
                // Update the purchase in organizationPurchases
                const updatedPurchase = action.payload.purchase;
                const index = state.organizationPurchases.findIndex(p => p.id === updatedPurchase.id);
                if (index !== -1) {
                    state.organizationPurchases[index] = updatedPurchase;
                }
            })
            .addCase(removeOrganizationMember.rejected, (state, action) => {
                state.memberManagementLoading = false;
                state.error = action.payload;
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
            })
            .addCase(getPackageUsageDetails.pending, (state) => {
                state.usageDetailsLoading = true;
                state.error = null;
            })
            .addCase(getPackageUsageDetails.fulfilled, (state, action) => {
                state.usageDetailsLoading = false;
                state.usageDetails = action.payload;
            })
            .addCase(getPackageUsageDetails.rejected, (state, action) => {
                state.usageDetailsLoading = false;
                state.error = action.payload;
            })
            .addCase(getSimulatorPackages.pending, (state) => {
                state.simulatorPackagesLoading = true;
                state.error = null;
            })
            .addCase(getSimulatorPackages.fulfilled, (state, action) => {
                state.simulatorPackagesLoading = false;
                // Preserve category from backend if it exists, otherwise set to 'simulator'
                state.simulatorPackages = Array.isArray(action.payload)
                    ? action.payload.map(pkg => ({
                        ...pkg,
                        category: pkg.category || 'simulator' // Preserve backend category or default to 'simulator'
                    }))
                    : action.payload;
            })
            .addCase(getSimulatorPackages.rejected, (state, action) => {
                state.simulatorPackagesLoading = false;
                state.error = action.payload;
            })
            .addCase(getActiveSimulatorPackages.pending, (state) => {
                state.simulatorPackagesLoading = true;
                state.error = null;
            })
            .addCase(getActiveSimulatorPackages.fulfilled, (state, action) => {
                state.simulatorPackagesLoading = false;
                // Preserve category from backend if it exists, otherwise set to 'simulator'
                state.simulatorPackages = Array.isArray(action.payload)
                    ? action.payload.map(pkg => ({
                        ...pkg,
                        category: pkg.category || 'simulator' // Preserve backend category or default to 'simulator'
                    }))
                    : action.payload;
            })
            .addCase(getActiveSimulatorPackages.rejected, (state, action) => {
                state.simulatorPackagesLoading = false;
                state.error = action.payload;
            })
            .addCase(createSimulatorPackagePurchase.pending, (state) => {
                state.purchaseSubmitting = true;
                state.error = null;
            })
            .addCase(createSimulatorPackagePurchase.fulfilled, (state, action) => {
                state.purchaseSubmitting = false;
                // Simulator purchases could be added to a separate list if needed
            })
            .addCase(createSimulatorPackagePurchase.rejected, (state, action) => {
                state.purchaseSubmitting = false;
                state.error = action.payload;
            })
            .addCase(getMySimulatorPurchases.pending, (state) => {
                state.simulatorPurchasesLoading = true;
                state.error = null;
            })
            .addCase(getMySimulatorPurchases.fulfilled, (state, action) => {
                state.simulatorPurchasesLoading = false;
                // Handle paginated response
                if (action.payload.results !== undefined) {
                    state.simulatorPurchases = action.payload.results;
                } else {
                    // Fallback for non-paginated response
                    state.simulatorPurchases = action.payload;
                }
            })
            .addCase(getMySimulatorPurchases.rejected, (state, action) => {
                state.simulatorPurchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(getUserPurchases.pending, (state) => {
                state.purchasesLoading = true;
                state.error = null;
            })
            .addCase(getUserPurchases.fulfilled, (state, action) => {
                state.purchasesLoading = false;
                // Store in same purchases state but for the user
                if (action.payload.results !== undefined) {
                    state.purchases = action.payload.results;
                    state.purchasesPagination = {
                        count: action.payload.count || 0,
                        totalPages: action.payload.total_pages || 0,
                        currentPage: action.payload.current_page || 1,
                        pageSize: action.payload.page_size || 10,
                    };
                } else {
                    state.purchases = action.payload;
                }
            })
            .addCase(getUserPurchases.rejected, (state, action) => {
                state.purchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(getUserSimulatorPurchases.pending, (state) => {
                state.simulatorPurchasesLoading = true;
                state.error = null;
            })
            .addCase(getUserSimulatorPurchases.fulfilled, (state, action) => {
                state.simulatorPurchasesLoading = false;
                // Store in same simulatorPurchases state but for the user
                if (action.payload.results !== undefined) {
                    state.simulatorPurchases = action.payload.results;
                } else {
                    state.simulatorPurchases = action.payload;
                }
            })
            .addCase(getUserSimulatorPurchases.rejected, (state, action) => {
                state.simulatorPurchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(getTransferableSimulatorPurchases.pending, (state) => {
                state.transferablePurchasesLoading = true;
                state.error = null;
            })
            .addCase(getTransferableSimulatorPurchases.fulfilled, (state, action) => {
                state.transferablePurchasesLoading = false;
                if (action.payload.results !== undefined) {
                    state.transferableSimulatorPurchases = action.payload.results;
                    state.transferableSimulatorPurchasesPagination = {
                        count: action.payload.count || 0,
                        totalPages: action.payload.total_pages || 0,
                        currentPage: action.payload.current_page || 1,
                        pageSize: action.payload.page_size || 10,
                    };
                } else {
                    state.transferableSimulatorPurchases = action.payload;
                }
            })
            .addCase(getTransferableSimulatorPurchases.rejected, (state, action) => {
                state.transferablePurchasesLoading = false;
                state.error = action.payload;
            })
            .addCase(createSimulatorHoursTransfer.pending, (state) => {
                state.purchaseSubmitting = true;
                state.error = null;
            })
            .addCase(createSimulatorHoursTransfer.fulfilled, (state) => {
                state.purchaseSubmitting = false;
            })
            .addCase(createSimulatorHoursTransfer.rejected, (state, action) => {
                state.purchaseSubmitting = false;
                state.error = action.payload;
            });
    },
});

export const { clearError, clearPhoneCheck } = coachingSlice.actions;
export default coachingSlice.reducer;

