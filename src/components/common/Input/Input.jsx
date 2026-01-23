import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Input = ({ label, error, style, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);



    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
            ...style
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginLeft: '0.25rem',
        },
        input: {
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: error
                ? 'var(--color-error)'
                : (isFocused ? 'var(--color-accent)' : 'var(--color-border)'),
            fontSize: '0.95rem',
            transition: 'all 0.2s var(--ease-snappy)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            boxShadow: isFocused
                ? (error ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : '0 0 0 3px rgba(99, 102, 241, 0.15)')
                : 'var(--shadow-sm)',
        },
        errorText: {
            fontSize: '0.75rem',
            color: 'var(--color-error)',
            marginTop: '0.25rem',
            marginLeft: '0.25rem',
        }
    };

    return (
        <div style={styles.container}>
            {label && <label style={styles.label}>{label}</label>}
            <input
                style={styles.input}
                onFocus={(e) => {
                    setIsFocused(true);
                    props.onFocus && props.onFocus(e);
                }}
                onBlur={(e) => {
                    setIsFocused(false);
                    props.onBlur && props.onBlur(e);
                }}
                {...props}
            />
            {error && <span style={styles.errorText}>{error}</span>}
        </div>
    );
};

Input.propTypes = {
    label: PropTypes.string,
    error: PropTypes.string,
    style: PropTypes.object,
};



export default Input;
