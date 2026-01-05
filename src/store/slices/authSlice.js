import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/axios';
import { endpoints } from '../../api/endpoints';

// Async thunks
export const signup = createAsyncThunk(
    'auth/signup',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.auth.signup, userData);
            // Signup no longer returns token - OTP verification is required
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const signupWithoutOTP = createAsyncThunk(
    'auth/signupWithoutOTP',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.auth.signupWithoutOTP, userData);
            // For simulator bookings, store token and user (they are logged in)
            // For coaching/TPI, they remain guests (no token)
            if (response.data.token && response.data.user) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(endpoints.auth.login, credentials);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const requestOTP = createAsyncThunk(
    'auth/requestOTP',
    async (phone, { rejectWithValue }) => {
        try {
            const payload = { phone };
            const response = await apiClient.post(endpoints.auth.requestOTP, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const verifyOTP = createAsyncThunk(
    'auth/verifyOTP',
    async ({ phone, otp }, { rejectWithValue }) => {
        try {
            const payload = { phone, otp };
            const response = await apiClient.post(endpoints.auth.verifyOTP, payload);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const getProfile = createAsyncThunk(
    'auth/getProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.auth.profile);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(endpoints.auth.profile, profileData);
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateDob = createAsyncThunk(
    'auth/updateDob',
    async (dateOfBirth, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(endpoints.auth.updateDob, { date_of_birth: dateOfBirth });
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const autoLogin = createAsyncThunk(
    'auth/autoLogin',
    async (email, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(endpoints.auth.autoLogin, {
                params: { email }
            });
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await apiClient.post(endpoints.auth.logout);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('dobPopupShown'); // Clear DOB popup flag on logout
            return null;
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('dobPopupShown'); // Clear DOB popup flag on logout
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Initial state
const getInitialState = () => {
    const user = JSON.parse(localStorage.getItem('user')) || null;
    const locationId = user?.ghl_location_id || localStorage.getItem('locationId') || null;
    if (locationId && !localStorage.getItem('locationId')) {
        localStorage.setItem('locationId', locationId);
    }
    return {
        user: user,
        token: localStorage.getItem('token') || null,
        locationId: locationId,
        loading: false,
        error: null,
        otpSent: false,
        otpMessage: null,
    };
};

const initialState = getInitialState();

// Auth slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearOTP: (state) => {
            state.otpSent = false;
            state.otpMessage = null;
        },
        setUser: (state, action) => {
            state.user = action.payload;
            if (action.payload) {
                localStorage.setItem('user', JSON.stringify(action.payload));
            }
        },
    },
    extraReducers: (builder) => {
        // Signup
        builder
            .addCase(signup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signup.fulfilled, (state, action) => {
                state.loading = false;
                // Signup no longer returns token/user - OTP verification is required
                // Token will be set after OTP verification in verifyOTP.fulfilled
                state.otpSent = true;
                state.otpMessage = action.payload.message || 'OTP sent successfully';
            })
            .addCase(signup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Signup Without OTP
        builder
            .addCase(signupWithoutOTP.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signupWithoutOTP.fulfilled, (state, action) => {
                state.loading = false;
                // For simulator bookings, set user and token (they are logged in)
                // For coaching/TPI, user remains a guest (no token in response)
                if (action.payload.token && action.payload.user) {
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                    // Store location_id from user data
                    if (action.payload.user?.ghl_location_id) {
                        state.locationId = action.payload.user.ghl_location_id;
                        localStorage.setItem('locationId', action.payload.user.ghl_location_id);
                    }
                }
                state.error = null;
            })
            .addCase(signupWithoutOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Login
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                // Store location_id from user data
                if (action.payload.user?.ghl_location_id) {
                    state.locationId = action.payload.user.ghl_location_id;
                    localStorage.setItem('locationId', action.payload.user.ghl_location_id);
                }
                // Clear DOB popup flag on login
                sessionStorage.removeItem('dobPopupShown');
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Request OTP
        builder
            .addCase(requestOTP.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(requestOTP.fulfilled, (state, action) => {
                state.loading = false;
                state.otpSent = true;
                state.otpMessage = action.payload.message;
            })
            .addCase(requestOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Verify OTP
        builder
            .addCase(verifyOTP.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyOTP.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.otpSent = false;
                // Store location_id from user data
                if (action.payload.user?.ghl_location_id) {
                    state.locationId = action.payload.user.ghl_location_id;
                    localStorage.setItem('locationId', action.payload.user.ghl_location_id);
                }
                // Clear DOB popup flag on new login
                sessionStorage.removeItem('dobPopupShown');
            })
            .addCase(verifyOTP.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Get Profile
        builder
            .addCase(getProfile.pending, (state) => {
                state.loading = true;
            })
            .addCase(getProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                // Update location_id from user data
                if (action.payload?.ghl_location_id) {
                    state.locationId = action.payload.ghl_location_id;
                    localStorage.setItem('locationId', action.payload.ghl_location_id);
                }
            })
            .addCase(getProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update Profile
        builder
            .addCase(updateProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.user) {
                    state.user = action.payload.user;
                    // Update location_id from user data
                    if (action.payload.user?.ghl_location_id) {
                        state.locationId = action.payload.user.ghl_location_id;
                        localStorage.setItem('locationId', action.payload.user.ghl_location_id);
                    }
                }
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Update DOB
        builder
            .addCase(updateDob.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateDob.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.user) {
                    state.user = action.payload.user;
                    // Clear the flag when DOB is successfully saved
                    sessionStorage.removeItem('dobPopupShown');
                }
            })
            .addCase(updateDob.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Auto Login
        builder
            .addCase(autoLogin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(autoLogin.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                // Store location_id from user data
                if (action.payload.user?.ghl_location_id) {
                    state.locationId = action.payload.user.ghl_location_id;
                    localStorage.setItem('locationId', action.payload.user.ghl_location_id);
                }
                // Clear DOB popup flag on auto-login
                sessionStorage.removeItem('dobPopupShown');
            })
            .addCase(autoLogin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Logout
        builder
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.locationId = null;
                state.error = null;
                state.otpSent = false;
                state.otpMessage = null;
                localStorage.removeItem('locationId');
            });
    },
});

export const { clearError, clearOTP, setUser } = authSlice.actions;
export default authSlice.reducer;








