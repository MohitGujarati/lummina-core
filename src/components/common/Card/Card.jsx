import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Card = ({ children, style, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);

    const baseStyle = {
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: 'var(--spacing-lg)',
        border: '1px solid var(--color-border)',
        transition: 'boxShadow 0.2s ease',
        ...style
    };

    return (
        <div
            style={baseStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            {children}
        </div>
    );
};

Card.propTypes = {
    children: PropTypes.node,
    style: PropTypes.object,
};

export default Card;
