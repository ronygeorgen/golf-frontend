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

// Heatmap skeleton for Busy & Quiet Times
export const HeatmapSkeleton = () => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
        <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[800px] md:min-w-full px-4 md:px-0">
                <div className="grid grid-cols-[80px_repeat(24,minmax(20px,1fr))] md:grid-cols-[100px_repeat(24,1fr)] gap-1 mb-2">
                    <div className="text-xs font-medium text-text-secondary text-center py-2">
                        <Skeleton width="30px" height="16px" className="mx-auto" />
                    </div>
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="text-xs font-medium text-text-secondary text-center py-1 md:py-2">
                            <Skeleton width="20px" height="16px" className="mx-auto" />
                        </div>
                    ))}
                </div>
                {dayNames.map((day, dayIdx) => (
                    <div key={dayIdx} className="grid grid-cols-[80px_repeat(24,minmax(20px,1fr))] md:grid-cols-[100px_repeat(24,1fr)] gap-1 mb-1">
                        <div className="text-xs font-medium text-text-primary py-2 px-1 md:px-2">
                            <Skeleton width="40px" height="16px" />
                        </div>
                        {Array.from({ length: 24 }).map((_, hourIdx) => (
                            <div
                                key={hourIdx}
                                className="aspect-square rounded flex items-center justify-center text-[10px] md:text-xs min-w-[20px] md:min-w-[30px] bg-gray-200 dark:bg-gray-700 animate-pulse"
                            ></div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton width="16px" height="16px" rounded="rounded" />
                        <Skeleton width="30px" height="16px" />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Staff Sales Performance skeleton (horizontal bar chart)
export const StaffSalesSkeleton = () => {
    return (
        <div className="w-full">
            {/* Chart container matching recharts ResponsiveContainer */}
            <div className="h-[300px] md:h-[400px] relative w-full">
                {/* Grid background with dashed lines */}
                <div className="absolute inset-0 flex flex-col">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700"
                        ></div>
                    ))}
                </div>
                
                {/* Chart bars area */}
                <div className="relative h-full flex flex-col justify-around px-0 md:px-2 py-2 md:py-3">
                    {Array.from({ length: 8 }).map((_, i) => {
                        // Varying bar widths for visual variety (30% to 85%)
                        const widths = [35, 45, 55, 65, 50, 70, 40, 80];
                        const width = widths[i] || 50;
                        return (
                            <div 
                                key={i} 
                                className="flex items-center gap-2 md:gap-3 relative"
                                style={{ minHeight: `${100 / 8}%` }}
                            >
                                {/* Y-axis label area (left side, inside chart) - Staff names are shorter */}
                                <div className="w-[90px] md:w-[110px] flex-shrink-0">
                                    <Skeleton 
                                        height="14px" 
                                        width={`${60 + (i * 5)}%`} 
                                        className="bg-gray-200 dark:bg-gray-700 animate-pulse" 
                                    />
                                </div>
                                
                                {/* Horizontal bar extending from left - more prominent */}
                                <div className="flex-1 flex items-center h-5 md:h-6">
                                    <div
                                        className="bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                                        style={{ 
                                            width: `${width}%`,
                                            height: '100%',
                                            minWidth: '60px'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* X-axis area (bottom) */}
                <div className="absolute bottom-0 left-[100px] md:left-[120px] right-0 h-6 flex items-center justify-between px-2 md:px-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton 
                            key={i} 
                            height="12px" 
                            width="50px" 
                            className="bg-gray-200 dark:bg-gray-700 animate-pulse" 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Top Customers skeleton (horizontal bar chart with wider Y-axis and table)
export const TopCustomersSkeleton = () => {
    return (
        <div className="w-full">
            {/* Chart container matching recharts ResponsiveContainer */}
            <div className="h-[250px] md:h-[300px] relative w-full">
                {/* Grid background with dashed lines */}
                <div className="absolute inset-0 flex flex-col">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700"
                        ></div>
                    ))}
                </div>
                
                {/* Chart bars area */}
                <div className="relative h-full flex flex-col justify-around px-0 md:px-2 py-2 md:py-3">
                    {Array.from({ length: 5 }).map((_, i) => {
                        const width = Math.random() * 50 + 30; // Random width between 30-80%
                        return (
                            <div 
                                key={i} 
                                className="flex items-center gap-2 md:gap-3 relative"
                                style={{ minHeight: `${100 / 5}%` }}
                            >
                                {/* Y-axis label area (left side, inside chart) - Customer names are longer, wider axis */}
                                <div className="w-[110px] md:w-[190px] flex-shrink-0">
                                    <Skeleton 
                                        height="14px" 
                                        width={`${Math.random() * 40 + 70}%`} 
                                        className="bg-gray-200 dark:bg-gray-700 animate-pulse" 
                                    />
                                </div>
                                
                                {/* Horizontal bar extending from left */}
                                <div className="flex-1 flex items-center">
                                    <Skeleton 
                                        width={`${width}%`} 
                                        height="20px md:h-6" 
                                        rounded="rounded"
                                        className="bg-gray-200 dark:bg-gray-700 animate-pulse"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* X-axis area (bottom) - adjusted for wider Y-axis */}
                <div className="absolute bottom-0 left-[120px] md:left-[200px] right-0 h-6 flex items-center justify-between px-2 md:px-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton 
                            key={i} 
                            height="12px" 
                            width="50px" 
                            className="bg-gray-200 dark:bg-gray-700 animate-pulse" 
                        />
                    ))}
                </div>
            </div>
            
            {/* Table skeleton below chart */}
            <div className="mt-4 overflow-x-auto">
                <div className="min-w-full divide-y divide-border">
                    {/* Table header */}
                    <div className="bg-background py-2 px-2 md:px-4 flex gap-4">
                        <div className="flex-1">
                            <Skeleton height="16px" width="40%" className="bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        </div>
                        <div className="w-[120px]">
                            <Skeleton height="16px" width="60%" className="bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        </div>
                    </div>
                    {/* Table rows */}
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-surface py-2 px-2 md:px-4 flex gap-4 border-b border-border">
                            <div className="flex-1">
                                <Skeleton height="16px" width={`${Math.random() * 40 + 50}%`} className="bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            </div>
                            <div className="w-[120px]">
                                <Skeleton height="16px" width="70%" className="bg-gray-200 dark:bg-gray-700 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Pie chart skeleton for TPI Conversion
export const PieChartSkeleton = () => {
    return (
        <div className="w-full flex flex-col items-center justify-center">
            {/* Pie chart circle */}
            <div className="relative w-[250px] h-[250px] md:w-[300px] md:h-[300px]">
                {/* Outer circle (full pie) */}
                <div className="absolute inset-0 rounded-full border-[60px] md:border-[70px] border-gray-200 dark:border-gray-700 animate-pulse"></div>
                {/* Inner segment (simulating pie slice) */}
                <div 
                    className="absolute inset-0 rounded-full border-[60px] md:border-[70px] border-transparent border-t-gray-400 dark:border-t-gray-500 animate-pulse" 
                    style={{ 
                        transform: 'rotate(45deg)',
                        animationDelay: '0.2s'
                    }}
                ></div>
            </div>
            
            {/* Text below pie chart */}
            <div className="mt-4 text-center space-y-1 w-full">
                <Skeleton height="16px" width="120px" className="mx-auto bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <Skeleton height="16px" width="100px" className="mx-auto bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <Skeleton height="16px" width="140px" className="mx-auto bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <Skeleton height="12px" width="200px" className="mx-auto mt-2 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
        </div>
    );
};
