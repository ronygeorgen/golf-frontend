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
        ghlLocations: '/auth/ghl-locations/',
        updateDob: '/auth/update-dob/',
        memberList: '/auth/member-list/',
        signupWithoutOTP: '/auth/signup-without-otp/',
        liabilityWaiver: '/auth/liability-waiver/',
        checkWaiverAcceptance: '/auth/liability-waiver/check/',
        acceptWaiver: '/auth/liability-waiver/accept/',
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
            dayAvailability: (id) => `/admin/staff/${id}/day-availability/`,
            blockedDates: (id) => `/admin/staff/${id}/blocked-dates/`,
            referrals: (id) => `/admin/staff/${id}/referrals/`,
            categories: (id) => `/admin/staff/${id}/categories/`,
        },
        simulators: {
            list: '/admin/simulators/',
            detail: (id) => `/admin/simulators/${id}/`,
            active: '/admin/simulators/active_simulators/',
            toggleActive: (id) => `/admin/simulators/${id}/toggle_active/`,
            deactivateAndReassign: (id) => `/admin/simulators/${id}/deactivate_and_reassign/`,
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
        simulatorPackages: {
            list: '/coaching/simulator-packages/',
            detail: (id) => `/coaching/simulator-packages/${id}/`,
            active: '/coaching/simulator-packages/active/',
            toggleActive: (id) => `/coaching/simulator-packages/${id}/toggle_active/`,
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
            lockedBookings: '/admin/overrides/locked-bookings/',
        },
        users: {
            list: '/admin/users/',
            detail: (id) => `/admin/users/${id}/`,
            togglePause: (id) => `/admin/users/${id}/toggle-pause/`,
        },
        closedDays: {
            list: '/admin/closed-days/',
            detail: (id) => `/admin/closed-days/${id}/`,
            create: '/admin/closed-days/',
            update: (id) => `/admin/closed-days/${id}/`,
            delete: (id) => `/admin/closed-days/${id}/`,
            checkDate: '/admin/closed-days/check-date/',
            checkDatetime: '/admin/closed-days/check-datetime/',
            previewCancellations: '/admin/closed-days/preview-cancellations/',
        },
        banners: {
            list: '/banners/',
            detail: (id) => `/banners/${id}/`,
            create: '/banners/',
            update: (id) => `/banners/${id}/`,
            delete: (id) => `/banners/${id}/`,
            active: '/banners/active/',
        },
        liabilityWaiver: {
            list: '/admin/liability-waiver/',
            detail: (id) => `/admin/liability-waiver/${id}/`,
            create: '/admin/liability-waiver/',
            update: (id) => `/admin/liability-waiver/${id}/`,
            delete: (id) => `/admin/liability-waiver/${id}/`,
            acceptances: (id) => `/admin/liability-waiver/${id}/acceptances/`,
        },
    },

    // Service categories
    categories: {
        // Public (Phase A)
        active: '/categories/active/',
        // Phase E: slot availability for non-legacy categories
        slots: (id) => `/categories/${id}/slots/`,
        // Admin CRUD (Phase B)
        admin: {
            list: '/admin/categories/',
            detail: (id) => `/admin/categories/${id}/`,
            toggleActive: (id) => `/admin/categories/${id}/toggle_active/`,
        },
        // Category Assets
        assets: {
            list: (categoryId) => `/admin/category-assets/?category_id=${categoryId}`,
            create: '/admin/category-assets/',
            detail: (id) => `/admin/category-assets/${id}/`,
            toggleActive: (id) => `/admin/category-assets/${id}/toggle_active/`,
            availability: (id) => `/admin/category-assets/${id}/availability/`,
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
        coachingSessionsByCoach: '/bookings/coaching_sessions_by_coach/',
        availableSimulatorHours: '/bookings/available-simulator-hours/',
        staffDailySchedule: '/bookings/staff-daily-schedule/',
        guestCreate: '/bookings/guest-create/',
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
        userPurchases: '/coaching/purchases/user_purchases/',
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
        usageDetails: (id) => `/coaching/purchases/${id}/usage_details/`,
        simulatorPackages: '/coaching/simulator-packages/',
        simulatorPackagesActive: '/coaching/simulator-packages/active/',
        simulatorPurchases: '/coaching/simulator-purchases/',
        simulatorPurchaseDetail: (id) => `/coaching/simulator-purchases/${id}/`,
        mySimulatorPurchases: '/coaching/simulator-purchases/my/',
        userSimulatorPurchases: '/coaching/simulator-purchases/user_purchases/',
        transferableSimulatorPurchases: '/coaching/simulator-purchases/transferable_purchases/',
        simulatorTransfers: '/coaching/simulator-transfers/',
        simulatorTransfersPending: '/coaching/simulator-transfers/pending/',
        simulatorTransferClaim: (id) => `/coaching/simulator-transfers/${id}/claim/`,
        guestPackages: '/coaching/guest-packages/',
    },

    ghl: {
        onboard: '/ghlpage/onboard/',
        admin: {
            locations: '/ghlpage/admin/locations/',
            updateCompanyName: (locationId) => `/ghlpage/admin/locations/${locationId}/company-name/`,
            setCompanyName: '/ghlpage/admin/locations/set-company-name/',
            uploadLogo: (locationId) => `/ghlpage/admin/locations/${locationId}/logo/`,
            deleteLogo: (locationId) => `/ghlpage/admin/locations/${locationId}/logo/delete/`,
        },
    },

    // Special Events endpoints
    specialEvents: {
        list: '/special-events/events/',
        detail: (id) => `/special-events/events/${id}/`,
        create: '/special-events/events/',
        update: (id) => `/special-events/events/${id}/`,
        delete: (id) => `/special-events/events/${id}/`,
        upcoming: '/special-events/events/upcoming/',
        calendarEvents: '/special-events/events/calendar-events/',
        register: (id) => `/special-events/events/${id}/register/`,
        registerUser: (id) => `/special-events/events/${id}/register_user/`,
        cancelRegistration: (id) => `/special-events/events/${id}/cancel_registration/`,
        registrations: (id) => `/special-events/events/${id}/registrations/`,
        updateRegistrationStatus: (id) => `/special-events/events/${id}/update_registration_status/`,
        myRegistrations: '/special-events/registrations/',
        eventsOnDate: '/special-events/events/events_on_date/',
        futureOccurrences: (id) => `/special-events/events/${id}/future_occurrences/`,
        pauseOccurrences: (id) => `/special-events/events/${id}/pause_occurrences/`,
        webhook: '/special-events/webhook/',
        removeRegistration: (id) => `/special-events/events/${id}/remove_registration/`,
    },

    // Dashboard endpoints
    dashboard: {
        busyQuietTimes: '/dashboard/busy-quiet-times/',
        topCustomers: '/dashboard/top-customers/',
        staffSales: '/dashboard/staff-sales/',
        tpiConversion: '/dashboard/tpi-conversion/',
        kpiStats: '/dashboard/kpi-stats/',
    },

    // Square Payment endpoints
    square: {
        config: '/square/config/',
        initiatePayment: '/square/initiate-payment/',
        webhook: '/square/webhook/',
    },

    // Coupon endpoints
    coupons: {
        list: '/coupons/',
        detail: (id) => `/coupons/${id}/`,
        validate: '/coupons/validate/',
        usages: '/coupons/usages/',
    },
};
