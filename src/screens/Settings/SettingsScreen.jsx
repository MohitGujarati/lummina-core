import React, { useState } from 'react';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { UI_TEXT } from '../../config/constants';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

const SettingsScreen = ({ onBack }) => {
    const { theme, toggleTheme } = useTheme();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('general');

    // Mock user state
    const [formData, setFormData] = useState({
        displayName: 'Student Name',
        email: 'student@university.edu',
        bio: 'Physics major, class of 2026.',
        theme: 'light',
        emailNotifs: true,
        marketingNotifs: false,
        twoFactor: false
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Mock auto-save feedback for toggles
        if (typeof value === 'boolean') {
            addToast('Preference updated', 'success', 2000);
        }
    };

    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'var(--color-bg-app)',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 50,
        },
        sidebar: {
            width: '240px',
            borderRight: '1px solid var(--color-border)',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            backgroundColor: 'var(--color-bg-sidebar)',
        },
        backButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.5rem',
            marginBottom: '1.5rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s',
        },
        sidebarTitle: {
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            padding: '0 0.75rem',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        navItem: (isActive) => ({
            padding: '0.625rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            backgroundColor: isActive ? 'var(--color-border)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'all 0.2s',
        }),
        contentArea: {
            flex: 1,
            overflowY: 'auto',
            padding: '3rem 4rem',
            maxWidth: '1000px', // slightly wider
            margin: '0 auto',
            width: '100%',
        },
        pageHeader: {
            marginBottom: '3rem',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '1.5rem',
        },
        pageTitle: {
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
        },
        pageSubtitle: {
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
        },
        section: {
            marginBottom: '3rem',
        },
        sectionTitle: {
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        card: {
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1.5rem',
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        label: {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
        },
        helperText: {
            fontSize: '0.8rem',
            color: 'var(--color-text-tertiary)',
        },
        toggleRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 0',
        },
        toggleSwitch: (checked) => ({
            width: '2.5rem',
            height: '1.5rem',
            backgroundColor: checked ? 'var(--color-success)' : 'var(--color-text-tertiary)',
            borderRadius: 'var(--radius-pill)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        }),
        toggleKnob: (checked) => ({
            width: '1.125rem',
            height: '1.125rem',
            backgroundColor: 'white',
            borderRadius: '50%',
            position: 'absolute',
            top: '3px',
            left: checked ? 'calc(100% - 1.125rem - 3px)' : '3px',
            transition: 'left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }),
        dangerZone: {
            marginTop: '3rem',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-error)',
            backgroundColor: '#fef2f2',
        },
        dangerTitle: {
            color: 'var(--color-error)',
            fontWeight: 600,
            marginBottom: '0.5rem',
        },
        avatarPlaceholder: {
            width: '5rem',
            height: '5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-md)',
        }
    };

    const Toggle = ({ checked, onChange }) => (
        <div style={styles.toggleSwitch(checked)} onClick={() => onChange(!checked)}>
            <div style={styles.toggleKnob(checked)} />
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div>
                        <header style={styles.pageHeader}>
                            <h2 style={styles.pageTitle}>{UI_TEXT.SETTINGS.PROFILE.TITLE}</h2>
                            <p style={styles.pageSubtitle}>{UI_TEXT.SETTINGS.PROFILE.SUBTITLE}</p>
                        </header>

                        <div style={styles.section}>
                            <div style={styles.card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                                    <div style={styles.avatarPlaceholder}>SN</div>
                                    <div>
                                        <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{UI_TEXT.SETTINGS.PROFILE.AVATAR_TITLE}</h3>
                                        <p style={{ ...styles.helperText, marginBottom: '0.75rem' }}>{UI_TEXT.SETTINGS.PROFILE.AVATAR_HELPER}</p>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <Button size="sm" variant="secondary">{UI_TEXT.SETTINGS.PROFILE.UPLOAD_BTN}</Button>
                                            <Button size="sm" variant="ghost" style={{ color: 'var(--color-text-tertiary)' }}>{UI_TEXT.SETTINGS.PROFILE.REMOVE_BTN}</Button>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>{UI_TEXT.SETTINGS.PROFILE.DISPLAY_NAME_LABEL}</label>
                                        <Input
                                            value={formData.displayName}
                                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>{UI_TEXT.SETTINGS.PROFILE.BIO_LABEL}</label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => handleInputChange('bio', e.target.value)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border)',
                                                resize: 'vertical',
                                                minHeight: '100px',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <span style={styles.helperText}>{UI_TEXT.SETTINGS.PROFILE.BIO_HELPER}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'general':
            default:
                return (
                    <div>
                        <header style={styles.pageHeader}>
                            <h2 style={styles.pageTitle}>{UI_TEXT.SETTINGS.GENERAL.TITLE}</h2>
                            <p style={styles.pageSubtitle}>{UI_TEXT.SETTINGS.GENERAL.SUBTITLE}</p>
                        </header>

                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>{UI_TEXT.SETTINGS.GENERAL.ACCOUNT_INFO_TITLE}</h3>
                            <div style={styles.card}>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_LABEL}</label>
                                        <Input value={formData.email} disabled />
                                        <span style={styles.helperText}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_HELPER}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>{UI_TEXT.SETTINGS.GENERAL.PREFERENCES_TITLE}</h3>
                            <div style={styles.card}>
                                <div style={styles.toggleRow}>
                                    <div>
                                        <div style={styles.label}>{UI_TEXT.SETTINGS.GENERAL.DARK_MODE_LABEL}</div>
                                        <div style={styles.helperText}>{UI_TEXT.SETTINGS.GENERAL.DARK_MODE_DESC}</div>
                                    </div>
                                    <Toggle
                                        checked={theme === 'dark'}
                                        onChange={toggleTheme}
                                    />
                                </div>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                                <div style={styles.toggleRow}>
                                    <div>
                                        <div style={styles.label}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_NOTIFS_LABEL}</div>
                                        <div style={styles.helperText}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_NOTIFS_DESC}</div>
                                    </div>
                                    <Toggle
                                        checked={formData.emailNotifs}
                                        onChange={(v) => handleInputChange('emailNotifs', v)}
                                    />
                                </div>
                                <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                                <div style={styles.toggleRow}>
                                    <div>
                                        <div style={styles.label}>{UI_TEXT.SETTINGS.GENERAL.MARKETING_LABEL}</div>
                                        <div style={styles.helperText}>{UI_TEXT.SETTINGS.GENERAL.MARKETING_DESC}</div>
                                    </div>
                                    <Toggle
                                        checked={formData.marketingNotifs}
                                        onChange={(v) => handleInputChange('marketingNotifs', v)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.dangerZone}>
                            <h3 style={styles.dangerTitle}>{UI_TEXT.SETTINGS.GENERAL.DANGER_ZONE_TITLE}</h3>
                            <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#b91c1c' }}>
                                {UI_TEXT.SETTINGS.GENERAL.DANGER_WARNING}
                            </p>
                            <Button
                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                                onClick={() => alert('Delete account flow')}
                            >
                                {UI_TEXT.SETTINGS.GENERAL.DELETE_BTN}
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div style={styles.container}>
            {/* Settings Sidebar */}
            <aside style={styles.sidebar}>
                <button
                    style={styles.backButton}
                    onClick={onBack}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-border)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    {UI_TEXT.SETTINGS.BACK_BTN}
                </button>
                <div style={styles.sidebarTitle}>{UI_TEXT.SETTINGS.SIDEBAR.ACCOUNT_TITLE}</div>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div
                        style={styles.navItem(activeTab === 'general')}
                        onClick={() => setActiveTab('general')}
                    >
                        <span>⚙️</span> {UI_TEXT.SETTINGS.SIDEBAR.GENERAL}
                    </div>
                    <div
                        style={styles.navItem(activeTab === 'profile')}
                        onClick={() => setActiveTab('profile')}
                    >
                        <span>👤</span> {UI_TEXT.SETTINGS.SIDEBAR.PROFILE}
                    </div>
                    <div
                        style={styles.navItem(activeTab === 'security')}
                        onClick={() => setActiveTab('security')}
                    >
                        <span>🔒</span> {UI_TEXT.SETTINGS.SIDEBAR.SECURITY}
                    </div>
                    <div
                        style={styles.navItem(activeTab === 'billing')}
                        onClick={() => setActiveTab('billing')}
                    >
                        <span>💳</span> {UI_TEXT.SETTINGS.SIDEBAR.BILLING}
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={styles.contentArea}>
                {renderContent()}
            </main>
        </div>
    );
};

export default SettingsScreen;
