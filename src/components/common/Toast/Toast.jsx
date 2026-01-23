import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const Toast = ({ id, message, type = 'info', duration = 3000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, duration - 300); // Start exit animation slightly before removal

        const closeTimer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => {
            clearTimeout(timer);
            clearTimeout(closeTimer);
        };
    }, [id, duration, onClose]);

    const colors = {
        success: { bg: '#10b981', icon: 'check-circle' },
        error: { bg: '#ef4444', icon: 'alert-circle' },
        info: { bg: '#4f46e5', icon: 'info' }, // Indigo for info
        warning: { bg: '#f59e0b', icon: 'alert-triangle' }
    };

    const currentType = colors[type] || colors.info;

    const styles = {
        toast: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-float)',
            border: '1px solid var(--color-border)',
            minWidth: '300px',
            maxWidth: '400px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '1rem',
            animation: isExiting ? 'slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            pointerEvents: 'auto',
        },
        iconWrapper: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            backgroundColor: `${currentType.bg}20`, // 20% opacity hex
            color: currentType.bg,
            flexShrink: 0,
        },
        message: {
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.4,
        },
        closeBtn: {
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        progressBar: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            backgroundColor: currentType.bg,
            width: '100%',
            animation: `progress ${duration}ms linear forwards`,
            transformOrigin: 'left',
        }
    };

    // Inline keyframes styles (hacky but works without external CSS file for component)
    const keyframes = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }
        @keyframes progress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
        }
    `;

    return (
        <div style={styles.toast}>
            <style>{keyframes}</style>
            <div style={styles.iconWrapper}>
                {type === 'success' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
                {type === 'error' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                {type === 'info' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                )}
                {type === 'warning' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                )}
            </div>
            <div style={styles.message}>{message}</div>
            <button style={styles.closeBtn} onClick={() => onClose(id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div style={styles.progressBar} />
        </div>
    );
};

Toast.propTypes = {
    id: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
    duration: PropTypes.number,
    onClose: PropTypes.func.isRequired,
};

export default Toast;
