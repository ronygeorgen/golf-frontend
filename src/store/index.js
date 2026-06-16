import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import adminReducer from './slices/adminSlice';
import bookingReducer from './slices/bookingSlice';
import simulatorReducer from './slices/simulatorSlice';
import coachingReducer from './slices/coachingSlice';
import membershipReducer from './slices/membershipSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        admin: adminReducer,
        booking: bookingReducer,
        simulator: simulatorReducer,
        coaching: coachingReducer,
        memberships: membershipReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
});

// Export types for TypeScript-like usage (if needed)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;

