import React from 'react';
import PropTypes from 'prop-types';

const Skeleton = ({ width, height, borderRadius = '4px', style }) => {
    const skeletonStyle = {
        width: width || '100%',
        height: height || '1em',
        borderRadius: borderRadius,
        backgroundColor: 'var(--color-border)', // Use border color as base for subtle gray
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
        ...style
    };

    return <div style={skeletonStyle} />;
};

Skeleton.propTypes = {
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    borderRadius: PropTypes.string,
    style: PropTypes.object
};

export default Skeleton;
