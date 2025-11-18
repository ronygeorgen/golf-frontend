# Redux Setup Documentation

## Overview
The application has been migrated from Context API to Redux Toolkit with proper structure, slices, thunks, and API interceptors.

## File Structure

```
src/
├── api/
│   ├── axios.js          # Axios instance with request/response interceptors
│   └── endpoints.js      # Centralized API endpoint definitions
├── store/
│   ├── index.js          # Redux store configuration
│   ├── hooks.js          # Typed Redux hooks
│   └── slices/
│       ├── authSlice.js       # Authentication state & thunks
│       ├── adminSlice.js      # Admin operations state & thunks
│       ├── bookingSlice.js    # Booking operations state & thunks
│       ├── simulatorSlice.js  # Simulator data state & thunks
│       └── coachingSlice.js   # Coaching packages state & thunks
├── components/           # All components use Redux hooks
└── pages/                # All pages use Redux hooks
```

## Key Features

### 1. API Interceptors (`src/api/axios.js`)
- **Request Interceptor**: Automatically adds authentication token to all requests
- **Response Interceptor**: 
  - Handles 401 (Unauthorized) - redirects to login
  - Handles 403 (Forbidden) - logs error
  - Handles 500+ (Server errors) - logs error

### 2. Redux Slices

#### Auth Slice (`authSlice.js`)
- **State**: user, token, loading, error, otpSent, otpMessage
- **Thunks**: signup, login, requestOTP, verifyOTP, getProfile, logout
- **Actions**: clearError, clearOTP, setUser

#### Admin Slice (`adminSlice.js`)
- **State**: dashboard, staff, simulators, packages, bookings
- **Thunks**: 
  - Dashboard: getDashboardStats, getRecentBookings
  - Staff: getStaff, createStaff, updateStaff, deleteStaff, getStaffAvailability, updateStaffAvailability
  - Simulators: getSimulators, createSimulator, updateSimulator, deleteSimulator
  - Packages: getPackages, createPackage, updatePackage, deletePackage
  - Bookings: getBookings, updateBookingStatus

#### Booking Slice (`bookingSlice.js`)
- **State**: bookings, selectedBooking, upcomingBookings, todayBookings, calendarEvents, stats, availability
- **Thunks**: getBookings, createBooking, updateBooking, deleteBooking, getUpcomingBookings, getTodayBookings, updateBookingStatus, cancelBooking, getCalendarBookings, getBookingStats, checkSimulatorAvailability, checkCoachingAvailability

#### Simulator Slice (`simulatorSlice.js`)
- **State**: simulators, activeSimulators, durationPrices
- **Thunks**: getSimulators, getActiveSimulators, getDurationPrices

#### Coaching Slice (`coachingSlice.js`)
- **State**: packages, activePackages
- **Thunks**: getPackages, getActivePackages

## Usage in Components

### Example: Using Redux in a Component

```javascript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getBookings } from '../store/slices/adminSlice';

function MyComponent() {
    const dispatch = useAppDispatch();
    const { list: bookings, loading } = useAppSelector((state) => state.admin.bookings);

    useEffect(() => {
        dispatch(getBookings({ filter: 'all', dateRange: {} }));
    }, [dispatch]);

    // Component JSX...
}
```

## Migration Notes

### Removed
- `src/contexts/AuthContext.js` - Replaced with Redux auth slice
- `src/services/auth.js` - Replaced with Redux thunks
- `src/services/admin.js` - Replaced with Redux thunks
- All CSS imports from components - Replaced with Tailwind classes

### Updated
- All components now use `useAppDispatch` and `useAppSelector` hooks
- All API calls are now handled through Redux thunks
- Authentication state is managed in Redux store
- All components have modern, responsive Tailwind CSS styling

## API Endpoints

All endpoints are centralized in `src/api/endpoints.js`:
- Auth: `/api/auth/*`
- Admin: `/api/admin/*`
- Bookings: `/api/bookings/*`
- Simulators: `/api/simulators/*`
- Coaching: `/api/coaching/*`

## Benefits

1. **Centralized State Management**: All application state in one place
2. **Predictable Updates**: Redux ensures state updates follow a predictable pattern
3. **DevTools Support**: Redux DevTools for debugging
4. **Automatic Token Management**: Interceptors handle auth tokens automatically
5. **Error Handling**: Centralized error handling in interceptors
6. **Type Safety**: Ready for TypeScript migration if needed
7. **Better Performance**: Redux optimizes re-renders with selectors




