import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Button = ({ children, variant = 'primary', style, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);


    // Basic Styles
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.625rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s var(--ease-snappy)',
        border: '1px solid transparent',
        outline: 'none',
        opacity: props.disabled ? 0.6 : 1,
        transform: isActive && !props.disabled ? 'scale(0.98)' : 'scale(1)',
        letterSpacing: '-0.01em',
    };

    // Variant Styles
    const variants = {
        primary: {
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            boxShadow: 'var(--shadow-sm)',
            hover: {
                backgroundColor: 'var(--color-primary-light)',
                boxShadow: 'var(--shadow-md)',
            }
        },
        secondary: {
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            hover: {
                borderColor: 'var(--color-text-tertiary)',
                backgroundColor: 'var(--color-bg-app)',
                boxShadow: 'var(--shadow-md)',
            }
        },
        icon: {
            padding: '0.5rem',
            borderRadius: 'var(--radius-full)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            hover: {
                backgroundColor: 'var(--color-bg-app)',
                color: 'var(--color-primary)',
            }
        }
    };

    const currentVariant = variants[variant] || variants.primary;

    // Merge styles
    const combinedStyle = {
        ...baseStyle,
        ...currentVariant,
        ...(isHovered && !props.disabled ? currentVariant.hover : {}),
        ...style // Allow overriding via style prop
    };

    // Clean up internal keys if spread included them
    delete combinedStyle.hover;

    return (
        <button
            style={combinedStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            onMouseOut={() => setIsActive(false)}
            {...props}
        >
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['primary', 'secondary', 'icon']),
    style: PropTypes.object,
};
// Basic Styles


export default Button;
