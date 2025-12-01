import React from 'react';

/**
 * Standardized Button Component
 * 
 * Variants:
 * - primary: Modern teal button with white text (for main call-to-action)
 * - secondary: White button with teal border and text (for secondary actions)
 * - tertiary: Text-only button (for subtle actions)
 * - danger: Red button for destructive actions
 * - accent: Vibrant orange button for special actions
 */
function Button({
    children,
    variant = 'primary',
    type = 'button',
    disabled = false,
    className = '',
    onClick,
    ...props
}) {
    const baseClasses = 'font-semibold py-2.5 px-4 rounded-button transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
        // Primary: Modern professional teal (#14B8A6) - visible, trustworthy, modern
        primary: 'bg-primary text-white hover:bg-primary-light',
        
        // Secondary: White background with teal border - stays white on hover with light teal tint
        secondary: 'bg-surface border border-primary text-primary hover:bg-primary/10',
        
        // Tertiary: Text-only button - no background, just text with underline on hover
        tertiary: 'bg-transparent text-primary hover:underline',
        
        // Danger: Red button for destructive actions
        danger: 'bg-danger text-white hover:bg-danger-light',
        
        // Accent: Vibrant orange button for special/energetic actions
        accent: 'bg-accent text-white hover:bg-accent-light',
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
    
    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={classes}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;

