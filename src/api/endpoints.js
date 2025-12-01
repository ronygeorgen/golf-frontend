// API Endpoints
// Note: All endpoints are relative to the baseURL configured in axios.js
// The baseURL already includes '/api', so endpoints should not include '/api' prefix
export const endpoints = {
    // Auth endpoints
    auth: {
        signup: '/auth/signup/',
        login: '/auth/login/',
        logout: '/auth/logout/',
        profile: '/auth/profile/',
        autoLogin: '/auth/auto-login/',
        requestOTP: '/auth/request-otp/',
        verifyOTP: '/auth/verify-otp/',
    },
    
    // Admin endpoints
    admin: {
        dashboard: {
            stats: '/admin/dashboard/stats/',
            recentBookings: '/admin/dashboard/recent-bookings/',
        },
        staff: {
            list: '/admin/staff/',
            detail: (id) => `/admin/staff/${id}/`,
            availability: (id) => `/admin/staff/${id}/availability/`,
        },
        simulators: {
            list: '/admin/simulators/',
            detail: (id) => `/admin/simulators/${id}/`,
            active: '/admin/simulators/active_simulators/',
            toggleActive: (id) => `/admin/simulators/${id}/toggle_active/`,
            availability: (id) => `/simulators/simulators/${id}/availability/`,
        },
        durationPrices: {
            list: '/admin/duration-prices/',
            detail: (id) => `/admin/duration-prices/${id}/`,
        },
        packages: {
            list: '/admin/packages/',
            detail: (id) => `/admin/packages/${id}/`,
            active: '/admin/packages/active_packages/',
            toggleActive: (id) => `/admin/packages/${id}/toggle_active/`,
            assignStaff: (id) => `/admin/packages/${id}/assign_staff/`,
            removeStaff: (id) => `/admin/packages/${id}/remove_staff/`,
        },
        bookings: {
            list: '/admin/bookings/',
            detail: (id) => `/admin/bookings/${id}/`,
            updateStatus: (id) => `/admin/bookings/${id}/update_status/`,
            cancel: (id) => `/admin/bookings/${id}/cancel/`,
            reschedule: (id) => `/admin/bookings/${id}/reschedule/`,
            today: '/admin/bookings/today/',
            upcoming: '/admin/bookings/upcoming/',
            calendarEvents: '/admin/bookings/calendar_events/',
            stats: '/admin/bookings/stats/',
        },
        overrides: {
            coachingSessions: '/admin/overrides/coaching-sessions/',
            simulatorCredits: '/admin/overrides/simulator-credits/',
        },
        users: {
            list: '/admin/users/',
            detail: (id) => `/admin/users/${id}/`,
            togglePause: (id) => `/admin/users/${id}/toggle-pause/`,
        },
    },
    
    // Booking endpoints
    bookings: {
        list: '/bookings/',
        detail: (id) => `/bookings/${id}/`,
        create: '/bookings/',
        update: (id) => `/bookings/${id}/`,
        delete: (id) => `/bookings/${id}/`,
        upcoming: '/bookings/upcoming/',
        today: '/bookings/today/',
        updateStatus: (id) => `/bookings/${id}/update_status/`,
        cancel: (id) => `/bookings/${id}/cancel/`,
        reschedule: (id) => `/bookings/${id}/reschedule/`,
        calendarEvents: '/bookings/calendar_events/',
        stats: '/bookings/stats/',
        checkSimulatorAvailability: '/bookings/check_simulator_availability/',
        checkCoachingAvailability: '/bookings/check_coaching_availability/',
    },
    
    // Simulator endpoints (public)
    simulators: {
        list: '/simulators/simulators/',
        active: '/simulators/simulators/active_simulators/',
        durationPrices: '/simulators/duration-prices/',
        credits: '/simulators/credits/',
    },
    
    // Coaching endpoints (public)
    coaching: {
        packages: '/coaching/packages/',
        active: '/coaching/packages/active_packages/',
        purchases: '/coaching/purchases/',
        purchaseDetail: (id) => `/coaching/purchases/${id}/`,
        myPurchases: '/coaching/purchases/my/',
        transferablePurchases: '/coaching/purchases/transferable_purchases/',
        giftsPending: '/coaching/purchases/gifts_pending/',
        giftClaim: (token) => `/coaching/gifts/claim/${token}/`,
        transfers: '/coaching/transfers/',
        transfersPending: '/coaching/transfers/pending/',
        transferClaim: (id) => `/coaching/transfers/${id}/claim/`,
        checkPhone: '/coaching/users/check-phone/',
        organizationPackages: '/coaching/purchases/organization_packages/',
        myOrganizationPurchases: '/coaching/purchases/my_organization_purchases/',
        purchaseWebhook: '/coaching/webhook/purchase/',
        tempPurchase: '/coaching/temp-purchase/',
        addMember: (id) => `/coaching/purchases/${id}/add_member/`,
        removeMember: (id) => `/coaching/purchases/${id}/remove_member/`,
    },

    ghl: {
        onboard: '/ghlpage/onboard/',
    },
};

