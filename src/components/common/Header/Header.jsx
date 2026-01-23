import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT } from '../../../config/constants';

const Header = ({ style, onBack }) => {
    const [isBackHovered, setIsBackHovered] = useState(false);



    const styles = {
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 2rem',
            backgroundColor: 'var(--color-bg-surface)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            transition: 'all 0.3s ease',
            ...style
        },
        logoContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        backButton: {
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: isBackHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-full)',
            transition: 'all 0.2s var(--ease-snappy)',
            backgroundColor: isBackHovered ? 'var(--color-bg-app)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        title: {
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
        },
        subtitle: {
            fontSize: '0.85rem',
            color: 'var(--color-text-tertiary)',
            marginTop: '0.125rem',
        },
        profileIcon: {
            /* Container for profile - keeping it simple for now */
        },
        avatar: {
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
            border: '2px solid white',
            cursor: 'pointer',
        }
    };

    return (
        <header style={styles.header}>
            <div style={styles.logoContainer}>
                {onBack && (
                    <button
                        onClick={onBack}
                        style={styles.backButton}
                        onMouseEnter={() => setIsBackHovered(true)}
                        onMouseLeave={() => setIsBackHovered(false)}
                        aria-label="Go back"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                )}
                <div>
                    <h1 style={styles.title}>{UI_TEXT.HEADER.TITLE}</h1>
                    <p style={styles.subtitle}>{UI_TEXT.HEADER.SUBTITLE}</p>
                </div>
            </div>
            <div style={styles.profileIcon} title="User Profile">
                <div style={styles.avatar}>LM</div>
            </div>
        </header>
    );
};

Header.propTypes = {
    style: PropTypes.object,
    onBack: PropTypes.func,
};

export default Header;
