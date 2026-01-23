import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT } from '../../../config/constants';

const ProfileDropdown = ({ user, onLogout, onSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (action) => {
        setIsOpen(false);
        if (action) action();
    };

    const styles = {
        container: {
            position: 'absolute',
            top: '1.5rem',
            right: '2rem',
            zIndex: 100,
        },
        trigger: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: 'var(--radius-full)',
        },
        avatar: {
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 600,
            border: '2px solid white',
            boxShadow: 'var(--shadow-sm)',
        },
        menu: {
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '200px',
            backgroundColor: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--color-border)',
            padding: '0.5rem',
            display: isOpen ? 'block' : 'none',
            animation: 'fadeIn 0.2s ease-out',
        },
        userInfo: {
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--color-border-subtle)',
            marginBottom: '0.5rem',
        },
        userName: {
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
        },
        userEmail: {
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        item: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.625rem 1rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            transition: 'background 0.2s',
        },
        itemHover: {
            backgroundColor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-primary)',
        },
        logout: {
            color: 'var(--color-error)',
            marginTop: '0.5rem',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: '0.75rem',
        }
    };

    return (
        <div style={styles.container} ref={dropdownRef}>
            <button
                style={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                title="Account"
            >
                <div style={styles.avatar}>
                    {user.initials}
                </div>
            </button>

            <div style={styles.menu}>
                <div style={styles.userInfo}>
                    <div style={styles.userName}>{user.name}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                </div>

                <button
                    style={styles.item}
                    onClick={() => handleItemClick(onSettings)}
                    onMouseEnter={(e) => e.target.style.background = 'var(--color-bg-subtle)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                    <span>⚙️</span> {UI_TEXT.PROFILE_DROPDOWN.SETTINGS}
                </button>

                <button
                    style={{ ...styles.item, ...styles.logout }}
                    onClick={() => handleItemClick(onLogout)}
                    onMouseEnter={(e) => e.target.style.background = 'var(--color-error-bg)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                    <span>🚪</span> {UI_TEXT.PROFILE_DROPDOWN.LOGOUT}
                </button>
            </div>
        </div>
    );
};

ProfileDropdown.propTypes = {
    user: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
        initials: PropTypes.string,
    }),
    onLogout: PropTypes.func,
    onSettings: PropTypes.func,
};

export default ProfileDropdown;
