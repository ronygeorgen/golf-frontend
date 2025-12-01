import React from 'react';

/**
 * Standardized Badge Component for Status Tags
 * 
 * Status types:
 * - confirmed: Green badge
 * - pending: Yellow/amber badge
 * - personal: Blue/purple badge
 * - cancelled: Red badge
 * - completed: Blue badge
 * - no_show: Gray badge
 */
function Badge({
    children,
    status = 'confirmed',
    className = '',
    ...props
}) {
    const statusClasses = {
        confirmed: 'bg-status-confirmed-bg text-status-confirmed-text',
        pending: 'bg-status-pending-bg text-status-pending-text',
        personal: 'bg-status-personal-bg text-status-personal-text',
        cancelled: 'bg-status-cancelled-bg text-status-cancelled-text',
        completed: 'bg-status-completed-bg text-status-completed-text',
        no_show: 'bg-status-no_show-bg text-status-no_show-text',
    };
    
    const baseClasses = 'px-3 py-1 text-xs font-semibold rounded-badge';
    const classes = `${baseClasses} ${statusClasses[status] || statusClasses.confirmed} ${className}`;
    
    return (
        <span className={classes} {...props}>
            {children}
        </span>
    );
}

export default Badge;

