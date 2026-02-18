import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    getBusyQuietTimes,
    getTopCustomers,
    getStaffSales,
    getTpiConversion,
    getKpiStats
} from '../store/slices/adminSlice';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import {
    HeatmapSkeleton,
    StaffSalesSkeleton,
    TopCustomersSkeleton,
    PieChartSkeleton
} from '../components/skeletons/SkeletonLoader';
import { Filter } from 'lucide-react';

function AdminDashboard() {
    const dispatch = useAppDispatch();
    const { busyQuietTimes, topCustomers, staffSales, tpiConversion, kpiStats, loading } = useAppSelector(
        (state) => state.admin.dashboard
    );

    // Date range state - default to last 30 days
    const [dateRange, setDateRange] = useState(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        };
    });

    // State for TPI customer details
    const [selectedTpiSegment, setSelectedTpiSegment] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showDateFilter, setShowDateFilter] = useState(true);

    // Handle window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch all dashboard data when date range changes
    useEffect(() => {
        const params = {
            start_date: dateRange.start_date,
            end_date: dateRange.end_date
        };
        dispatch(getBusyQuietTimes(params));
        dispatch(getTopCustomers(params));
        dispatch(getStaffSales(params));
        dispatch(getTpiConversion(params));
        dispatch(getKpiStats(params));
    }, [dispatch, dateRange]);

    // Process heatmap data for visualization
    const processHeatmapData = () => {
        if (!busyQuietTimes?.data) return null;

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const heatmap = {};

        // Initialize structure
        dayNames.forEach((day, idx) => {
            heatmap[day] = {};
            for (let hour = 0; hour < 24; hour++) {
                heatmap[day][hour] = 0;
            }
        });

        // Populate with data
        busyQuietTimes.data.forEach((item) => {
            heatmap[item.day_name][item.hour] = item.value;
        });

        // Convert to array format for visualization
        const result = [];
        dayNames.forEach((day) => {
            for (let hour = 0; hour < 24; hour++) {
                result.push({
                    day,
                    hour: `${hour}:00`,
                    hourNum: hour,
                    value: heatmap[day][hour]
                });
            }
        });

        return result;
    };

    const heatmapData = processHeatmapData();

    // Get max value for color intensity
    const maxValue = heatmapData
        ? Math.max(...heatmapData.map((d) => d.value))
        : 0;

    // Color function for heatmap - using theme green shades
    const getHeatmapColor = (value) => {
        if (maxValue === 0) return '#f0f0f0';
        const intensity = value / maxValue;
        if (intensity === 0) return '#f0f0f0';
        // Light green shades progressing to darker theme green
        if (intensity < 0.25) return '#E6F4EA'; // Very light green
        if (intensity < 0.5) return '#A8D5BA'; // Light green
        if (intensity < 0.75) return '#6BA882'; // Medium green
        return '#134A34'; // Primary theme green
    };

    // Prepare top customers data for chart
    const topCustomersData = topCustomers?.data
        ? topCustomers.data.slice(0, 10).map((customer) => ({
            name: customer.customer_name,
            fullName: customer.customer_name,
            spend: customer.total_spend
        }))
        : [];

    // Prepare staff sales data for chart
    const staffSalesData = staffSales?.data
        ? staffSales.data.map((staff) => ({
            name: staff.staff_name.length > 15
                ? staff.staff_name.substring(0, 15) + '...'
                : staff.staff_name,
            fullName: staff.staff_name,
            revenue: staff.total_revenue
        }))
        : [];

    // Prepare TPI conversion data - using theme colors
    const tpiData = tpiConversion
        ? [
            { name: 'Converted', value: tpiConversion.converted_tpis, fill: '#134A34' }, // Primary green
            { name: 'Not Converted', value: tpiConversion.not_converted_tpis, fill: '#E57C1F' } // Accent orange
        ]
        : [];

    const handleDateChange = (field, value) => {
        setDateRange((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePieClick = (data) => {
        if (data && data.name) {
            const segmentName = data.name;
            setSelectedTpiSegment(selectedTpiSegment === segmentName ? null : segmentName);
        }
    };

    const getSelectedCustomers = () => {
        if (!tpiConversion || !selectedTpiSegment) return [];
        if (selectedTpiSegment === 'Converted') {
            return tpiConversion.converted_customers || [];
        } else if (selectedTpiSegment === 'Not Converted') {
            return tpiConversion.not_converted_customers || [];
        }
        return [];
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Date Range Filter */}
            {showDateFilter ? (
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg md:text-xl font-bold text-text-primary">Date Range Filter</h2>
                        <button
                            onClick={() => setShowDateFilter(!showDateFilter)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-primary hover:bg-background rounded-button transition-colors border border-border"
                            title="Hide date filter"
                            aria-label="Hide date filter"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden md:inline">Filter</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.start_date}
                                onChange={(e) => handleDateChange('start_date', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.end_date}
                                onChange={(e) => handleDateChange('end_date', e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowDateFilter(!showDateFilter)}
                        className="p-2 text-text-primary hover:bg-background rounded-button transition-colors border border-border"
                        title="Show date filter"
                        aria-label="Show date filter"
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-0">
                {/* Total Revenue of Completed Sessions */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <h3 className="text-sm md:text-base font-medium text-text-secondary mb-2">
                        Total Revenue
                    </h3>
                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2"></div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl md:text-3xl font-bold text-text-primary">
                                ${kpiStats?.total_completed_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </p>
                            <p className="text-xs md:text-sm text-text-secondary mt-1">
                                Completed sessions
                            </p>
                        </div>
                    )}
                </div>

                {/* Total Simulator Bookings */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <h3 className="text-sm md:text-base font-medium text-text-secondary mb-2">
                        Simulator Bookings
                    </h3>
                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2"></div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl md:text-3xl font-bold text-text-primary">
                                {kpiStats?.total_simulator_bookings?.toLocaleString('en-US') || '0'}
                            </p>
                            <p className="text-xs md:text-sm text-text-secondary mt-1">
                                Completed bookings
                            </p>
                        </div>
                    )}
                </div>

                {/* Total Coaching Session Bookings */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <h3 className="text-sm md:text-base font-medium text-text-secondary mb-2">
                        Coaching Sessions
                    </h3>
                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2"></div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl md:text-3xl font-bold text-text-primary">
                                {kpiStats?.total_coaching_bookings?.toLocaleString('en-US') || '0'}
                            </p>
                            <p className="text-xs md:text-sm text-text-secondary mt-1">
                                Completed bookings
                            </p>
                        </div>
                    )}
                </div>

                {/* Total Confirmed Bookings */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6">
                    <h3 className="text-sm md:text-base font-medium text-text-secondary mb-2">
                        Total Completed Bookings
                    </h3>
                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2"></div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-2xl md:text-3xl font-bold text-text-primary">
                                {kpiStats?.total_confirmed_bookings?.toLocaleString('en-US') || '0'}
                            </p>

                        </div>
                    )}
                </div>
            </div>

            {/* Busy & Quiet Times Heatmap and Staff Sales Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                {/* Busy & Quiet Times Heatmap */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-text-primary mb-4">
                        Busy & Quiet Times
                    </h2>
                    {loading ? (
                        <HeatmapSkeleton />
                    ) : heatmapData && heatmapData.length > 0 ? (
                        <div className="overflow-x-auto -mx-4 md:-mx-6">
                            <table
                                style={{ borderCollapse: 'separate', borderSpacing: '3px', tableLayout: 'fixed', minWidth: '520px' }}
                                className="px-4 md:px-6 w-full"
                            >
                                <colgroup>
                                    {/* Day label column */}
                                    <col style={{ width: '36px' }} />
                                    {/* 24 hour columns — equal width */}
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <col key={i} />
                                    ))}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className="text-xs font-medium text-text-secondary text-center pb-1 px-0">
                                            D/H
                                        </th>
                                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                            <th
                                                key={hour}
                                                className="text-xs font-medium text-text-secondary text-center pb-1 px-0"
                                            >
                                                {hour}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                        <tr key={day}>
                                            <td className="text-xs font-medium text-text-primary pr-1 py-0 whitespace-nowrap">
                                                {day.substring(0, 3)}
                                            </td>
                                            {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                                                const dataPoint = heatmapData.find(
                                                    (d) => d.day === day && d.hourNum === hour
                                                );
                                                const value = dataPoint ? dataPoint.value : 0;
                                                return (
                                                    <td key={hour} className="p-0" title={`${day} ${hour}:00 - ${value} bookings`}>
                                                        <div
                                                            className="rounded flex items-center justify-center text-[9px] font-medium mx-auto"
                                                            style={{
                                                                backgroundColor: getHeatmapColor(value),
                                                                color: value > maxValue / 2 ? '#fff' : '#333',
                                                                width: '100%',
                                                                aspectRatio: '1',
                                                                minWidth: '14px',
                                                                minHeight: '14px',
                                                            }}
                                                        >
                                                            {value > 0 ? value : ''}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Legend */}
                            <div className="mt-4 px-4 md:px-6 flex flex-wrap items-center gap-3 md:gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f0f0f0' }}></div>
                                    <span className="text-xs text-text-secondary">0</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E6F4EA' }}></div>
                                    <span className="text-xs text-text-secondary">Low</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6BA882' }}></div>
                                    <span className="text-xs text-text-secondary">Medium</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#134A34' }}></div>
                                    <span className="text-xs text-text-secondary">High</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 md:h-96 flex items-center justify-center">
                            <p className="text-text-secondary">No data available</p>
                        </div>
                    )}
                </div>

                {/* Staff Sales Performance */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-text-primary mb-4">Staff Sales Performance</h2>
                    {loading ? (
                        <StaffSalesSkeleton />
                    ) : staffSalesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
                            <BarChart data={staffSalesData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10 }}
                                    className="md:w-[120px]"
                                />
                                <Tooltip
                                    formatter={(value) => `$${value.toFixed(2)}`}
                                    labelFormatter={(label, payload) =>
                                        payload && payload[0] ? payload[0].payload.fullName : label
                                    }
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="#134A34" name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-64 md:h-96 flex items-center justify-center">
                            <p className="text-text-secondary">No data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Customers and TPI Conversion - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
                {/* Top Customers */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-text-primary mb-4">Top Customers</h2>
                    {loading ? (
                        <TopCustomersSkeleton />
                    ) : topCustomersData.length > 0 ? (
                        <>
                            <div className="w-full">
                                <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                                    <BarChart
                                        data={topCustomersData}
                                        layout="vertical"
                                        margin={{ left: 0, right: 10, top: 5, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={120}
                                            tick={{ fontSize: 10 }}
                                            className="md:w-[200px] md:text-[12px]"
                                            interval={0}
                                        />
                                        <Tooltip
                                            formatter={(value) => `$${value.toFixed(2)}`}
                                            labelFormatter={(label, payload) =>
                                                payload && payload[0] ? payload[0].payload.fullName : label
                                            }
                                        />
                                        <Legend />
                                        <Bar dataKey="spend" fill="#134A34" name="Total Spend" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-background">
                                        <tr>
                                            <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Customer
                                            </th>
                                            <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                Total Spend
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {topCustomersData.map((customer, idx) => (
                                            <tr key={idx} className="hover:bg-background">
                                                <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-text-primary">
                                                    {customer.fullName}
                                                </td>
                                                <td className="px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-text-primary">
                                                    ${customer.spend.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="h-96 flex items-center justify-center">
                            <p className="text-text-secondary">No data available</p>
                        </div>
                    )}
                </div>

                {/* TPI Conversion */}
                <div className="bg-surface rounded-card shadow-card p-4 md:p-6 min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-text-primary mb-4">TPI Conversion Rate</h2>
                    {loading ? (
                        <PieChartSkeleton />
                    ) : tpiData.length > 0 && tpiConversion.total_tpis > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                                <PieChart>
                                    <Pie
                                        data={tpiData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={
                                            // Show labels only on desktop, never on mobile
                                            !isMobile
                                                ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                                                : false
                                        }
                                        outerRadius="70%"
                                        fill="#8884d8"
                                        dataKey="value"
                                        onClick={(data) => handlePieClick(data)}
                                    >
                                        {tpiData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                                style={{
                                                    opacity: selectedTpiSegment && selectedTpiSegment !== entry.name ? 0.3 : 1,
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 text-center space-y-1">
                                <p className="text-xs md:text-sm text-text-secondary">
                                    Total TPIs: <span className="font-bold">{tpiConversion.total_tpis}</span>
                                </p>
                                <p className="text-xs md:text-sm text-text-secondary">
                                    Converted: <span className="font-bold" style={{ color: '#134A34' }}>
                                        {tpiConversion.converted_tpis}
                                    </span>
                                </p>
                                <p className="text-xs md:text-sm text-text-secondary">
                                    Not Converted: <span className="font-bold" style={{ color: '#E57C1F' }}>
                                        {tpiConversion.not_converted_tpis}
                                    </span>
                                </p>
                                <p className="text-[10px] md:text-xs text-text-secondary mt-2">
                                    Click on a segment to view customer details
                                </p>
                            </div>

                            {/* Customer Details Table */}
                            {selectedTpiSegment && (
                                <div className="mt-6 border-t border-border pt-4">
                                    <h3 className="text-base md:text-lg font-semibold text-text-primary mb-3">
                                        {selectedTpiSegment} Customers ({getSelectedCustomers().length})
                                    </h3>
                                    {getSelectedCustomers().length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-border">
                                                <thead className="bg-background">
                                                    <tr>
                                                        <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                            Customer Name
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                            Email
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                            Phone
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                                                            TPI Date
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-surface divide-y divide-border">
                                                    {getSelectedCustomers().map((customer, idx) => (
                                                        <tr key={idx} className="hover:bg-background">
                                                            <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-text-primary">
                                                                {customer.customer_name}
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-text-secondary">
                                                                {customer.customer_email || '-'}
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-text-secondary">
                                                                {customer.customer_phone || '-'}
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 text-xs md:text-sm text-text-secondary">
                                                                {new Date(customer.tpi_date).toLocaleDateString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-text-secondary text-center py-4">
                                            No {selectedTpiSegment.toLowerCase()} customers found
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setSelectedTpiSegment(null)}
                                        className="mt-4 px-4 py-2 text-xs md:text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-button transition-colors w-full md:w-auto"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-96 flex items-center justify-center">
                            <p className="text-text-secondary">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;