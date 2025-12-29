import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

function DateRangePicker({ value, onChange, onClear }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStartDate, setSelectedStartDate] = useState(value?.from_date || '');
    const [selectedEndDate, setSelectedEndDate] = useState(value?.to_date || '');
    const [clickCount, setClickCount] = useState(0);
    const containerRef = useRef(null);

    // Sync with external value changes
    useEffect(() => {
        setSelectedStartDate(value?.from_date || '');
        setSelectedEndDate(value?.to_date || '');
        if (!value?.from_date && !value?.to_date) {
            setClickCount(0);
        }
    }, [value]);

    // Close calendar when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleDateClick = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        
        if (clickCount === 0) {
            // First click - set as start date
            setSelectedStartDate(dateStr);
            setSelectedEndDate('');
            setClickCount(1);
        } else if (clickCount === 1) {
            // Second click - set as end date
            if (dateStr < selectedStartDate) {
                // If second date is earlier, swap them
                setSelectedEndDate(selectedStartDate);
                setSelectedStartDate(dateStr);
            } else {
                setSelectedEndDate(dateStr);
            }
            setClickCount(0);
            setIsOpen(false);
            // Trigger onChange with both dates
            onChange({
                from_date: dateStr < selectedStartDate ? dateStr : selectedStartDate,
                to_date: dateStr < selectedStartDate ? selectedStartDate : dateStr
            });
        }
    };

    const handleClear = () => {
        setSelectedStartDate('');
        setSelectedEndDate('');
        setClickCount(0);
        onChange({ from_date: '', to_date: '' });
        if (onClear) {
            onClear();
        }
    };

    const formatDateRange = () => {
        if (selectedStartDate && selectedEndDate) {
            return `${selectedStartDate} to ${selectedEndDate}`;
        } else if (selectedStartDate) {
            return `${selectedStartDate} (select end date)`;
        }
        return 'Select date range';
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const navigateMonth = (direction) => {
        setCurrentMonth(new Date(year, month + direction, 1));
    };

    const isDateInRange = (day) => {
        if (!selectedStartDate || !selectedEndDate) return false;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr >= selectedStartDate && dateStr <= selectedEndDate;
    };

    const isDateSelected = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr === selectedStartDate || dateStr === selectedEndDate;
    };

    const isDateToday = (day) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    };

    const isDateDisabled = (day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(dateStr);
        return date > new Date(); // Disable future dates
    };

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 border border-border rounded-button bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer flex items-center justify-between"
            >
                <span className={selectedStartDate || selectedEndDate ? 'text-text-primary' : 'text-text-secondary'}>
                    {formatDateRange()}
                </span>
                <Calendar className="w-4 h-4 text-text-secondary" />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-surface border border-border rounded-card shadow-lg z-50 p-4 min-w-[300px]">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="p-1 hover:bg-background rounded-button transition-colors"
                        >
                            <span className="text-text-primary">‹</span>
                        </button>
                        <h3 className="text-lg font-semibold text-text-primary">
                            {monthNames[month]} {year}
                        </h3>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="p-1 hover:bg-background rounded-button transition-colors"
                        >
                            <span className="text-text-primary">›</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-text-secondary py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                            <div key={`empty-${index}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = isDateSelected(day);
                            const inRange = isDateInRange(day);
                            const isToday = isDateToday(day);
                            const isDisabled = isDateDisabled(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => !isDisabled && handleDateClick(new Date(year, month, day))}
                                    disabled={isDisabled}
                                    className={`
                                        aspect-square rounded-button text-sm transition-colors
                                        ${isDisabled 
                                            ? 'text-text-secondary/30 cursor-not-allowed' 
                                            : 'hover:bg-primary-light/20 cursor-pointer'
                                        }
                                        ${isSelected 
                                            ? 'bg-primary text-white font-semibold' 
                                            : inRange 
                                                ? 'bg-primary-light/30 text-primary' 
                                                : isToday
                                                    ? 'border-2 border-primary text-primary font-semibold'
                                                    : 'text-text-primary'
                                        }
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {(selectedStartDate || selectedEndDate) && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <button
                                onClick={handleClear}
                                className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background rounded-button transition-colors"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}

                    {clickCount === 1 && (
                        <div className="mt-2 text-xs text-text-secondary text-center">
                            Select end date
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default DateRangePicker;

