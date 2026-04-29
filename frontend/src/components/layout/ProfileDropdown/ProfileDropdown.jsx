import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT } from '../../../config/constants';

const ProfileDropdown = ({ user, onLogout, onSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

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

    return (
        <div ref={dropdownRef} style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.5rem',
            zIndex: 100,
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                @keyframes pd-fadein {
                    from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .pd-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    width: 100%;
                    padding: 0.5rem 0.875rem;
                    font-size: 0.875rem;
                    color: #4d4c48;
                    background: none;
                    border: none;
                    text-align: left;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: background 0.12s, color 0.12s;
                    font-family: inherit;
                    box-sizing: border-box;
                }
                .pd-menu-item:hover { background: #f5f4ed; color: #141413; }
                .pd-menu-item.danger { color: #b53333; }
                .pd-menu-item.danger:hover { background: #fff5f5; color: #b53333; }
            `}</style>

            {/* Avatar trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '50%',
                }}
                title="Account"
            >
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#24386c',
                    color: '#faf9f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    boxShadow: '#24386c 0px 0px 0px 0px, rgba(36,56,108,0.2) 0px 0px 0px 2px',
                    transition: 'box-shadow 0.15s',
                }}>
                    {user.initials}
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.5rem)',
                    right: 0,
                    width: '220px',
                    backgroundColor: '#faf9f5',
                    borderRadius: '14px',
                    border: '1px solid #f0eee6',
                    boxShadow: 'rgba(0,0,0,0.08) 0px 8px 30px, rgba(0,0,0,0.04) 0px 2px 8px',
                    padding: '0.5rem',
                    animation: 'pd-fadein 0.18s ease forwards',
                }}>
                    {/* User info */}
                    <div style={{
                        padding: '0.625rem 0.875rem 0.75rem',
                        borderBottom: '1px solid #f0eee6',
                        marginBottom: '0.375rem',
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#141413',
                            marginBottom: '0.125rem',
                        }}>
                            {user.name}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#87867f',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {user.email}
                        </div>
                    </div>

                    <button
                        className="pd-menu-item"
                        onClick={() => handleItemClick(onSettings)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        {UI_TEXT.PROFILE_DROPDOWN.SETTINGS}
                    </button>

                    <div style={{ borderTop: '1px solid #f0eee6', margin: '0.375rem 0' }} />

                    <button
                        className="pd-menu-item danger"
                        onClick={() => handleItemClick(onLogout)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        {UI_TEXT.PROFILE_DROPDOWN.LOGOUT}
                    </button>
                </div>
            )}
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
