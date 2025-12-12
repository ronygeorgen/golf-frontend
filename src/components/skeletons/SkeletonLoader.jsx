import React from 'react';

// Base skeleton element
export const Skeleton = ({ className = '', width, height, rounded = 'rounded' }) => {
    const style = {};
    if (width) style.width = width;
    if (height) style.height = height;
    
    return (
        <div 
            className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${rounded} ${className}`}
            style={style}
        />
    );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-4 py-3">
                                    <Skeleton height="20px" width="80%" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Array.from({ length: rows }).map((_, rowIdx) => (
                            <tr key={rowIdx}>
                                {Array.from({ length: cols }).map((_, colIdx) => (
                                    <td key={colIdx} className="px-4 py-4">
                                        <Skeleton height="20px" width={colIdx === cols - 1 ? "60%" : "90%"} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Card skeleton
export const CardSkeleton = ({ count = 3 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                    <Skeleton height="24px" width="60%" className="mb-4" />
                    <Skeleton height="16px" width="100%" className="mb-2" />
                    <Skeleton height="16px" width="80%" className="mb-4" />
                    <Skeleton height="40px" width="100%" />
                </div>
            ))}
        </div>
    );
};

// Stats skeleton
export const StatsSkeleton = ({ count = 4 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-6">
                    <Skeleton height="16px" width="50%" className="mb-2" />
                    <Skeleton height="32px" width="70%" className="mb-2" />
                    <Skeleton height="14px" width="40%" />
                </div>
            ))}
        </div>
    );
};

// List skeleton
export const ListSkeleton = ({ items = 5 }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-0">
                    <Skeleton width="48px" height="48px" rounded="rounded-full" />
                    <div className="flex-1">
                        <Skeleton height="20px" width="40%" className="mb-2" />
                        <Skeleton height="16px" width="60%" />
                    </div>
                    <Skeleton height="36px" width="80px" />
                </div>
            ))}
        </div>
    );
};

// Form skeleton
export const FormSkeleton = ({ fields = 4, showGrid = false }) => {
    if (showGrid && fields >= 2) {
        // For profile form with grid layout (first 2 fields in grid)
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Skeleton height="16px" width="30%" className="mb-2" />
                        <Skeleton height="48px" width="100%" rounded="rounded-button" />
                    </div>
                    <div>
                        <Skeleton height="16px" width="30%" className="mb-2" />
                        <Skeleton height="48px" width="100%" rounded="rounded-button" />
                    </div>
                </div>
                {Array.from({ length: fields - 2 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton height="16px" width="30%" className="mb-2" />
                        <Skeleton height="48px" width="100%" rounded="rounded-button" />
                    </div>
                ))}
                <div className="flex gap-4 pt-4">
                    <Skeleton height="44px" width="100%" rounded="rounded-button" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i}>
                    <Skeleton height="16px" width="30%" className="mb-2" />
                    <Skeleton height="48px" width="100%" rounded="rounded-button" />
                </div>
            ))}
            <div className="flex gap-4 pt-4">
                <Skeleton height="44px" width="100%" rounded="rounded-button" />
            </div>
        </div>
    );
};

// Calendar skeleton
export const CalendarSkeleton = () => {
    return (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
            <div className="mb-6">
                <Skeleton height="32px" width="200px" className="mb-4" />
                <div className="flex gap-2 mb-4">
                    <Skeleton height="36px" width="100px" />
                    <Skeleton height="36px" width="100px" />
                    <Skeleton height="36px" width="100px" />
                </div>
            </div>
            <div style={{ height: '600px' }}>
                <Skeleton height="100%" width="100%" />
            </div>
        </div>
    );
};

// Booking slots skeleton
export const BookingSlotsSkeleton = ({ count = 8 }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-4 border-2 border-gray-200 rounded-lg">
                    <Skeleton height="24px" width="60%" className="mb-2" />
                    <Skeleton height="16px" width="80%" />
                </div>
            ))}
        </div>
    );
};

// Booking card skeleton
export const BookingCardSkeleton = ({ count = 3 }) => {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <Skeleton height="20px" width="40%" className="mb-3" />
                            <Skeleton height="16px" width="60%" className="mb-2" />
                            <Skeleton height="16px" width="50%" />
                        </div>
                        <Skeleton height="24px" width="80px" rounded="rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// Packages skeleton for portal page
export const PackagesSkeleton = () => {
    return (
        <div className="bg-background border border-border rounded-card p-4 text-sm text-text-primary space-y-4">
            <div>
                <Skeleton height="18px" width="60%" className="mb-2" />
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
                            <Skeleton height="16px" width="50%" />
                            <Skeleton height="16px" width="30%" />
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <Skeleton height="18px" width="50%" className="mb-2" />
                <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-border/50 last:border-b-0">
                            <Skeleton height="16px" width="50%" />
                            <Skeleton height="16px" width="30%" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Event card skeleton for special events page
export const EventCardSkeleton = ({ count = 3 }) => {
    return (
        <div className="grid gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-surface rounded-card shadow-card border border-border p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                                <Skeleton height="32px" width="60%" />
                                <Skeleton height="24px" width="100px" rounded="rounded-full" />
                            </div>
                            <Skeleton height="16px" width="100%" className="mb-2" />
                            <Skeleton height="16px" width="90%" className="mb-4" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <Skeleton height="20px" width="80%" />
                                <Skeleton height="20px" width="80%" />
                                <Skeleton height="20px" width="70%" />
                                <Skeleton height="20px" width="75%" />
                                <Skeleton height="20px" width="65%" />
                                <Skeleton height="20px" width="70%" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 md:min-w-[180px]">
                            <Skeleton height="40px" width="100%" rounded="rounded-button" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

