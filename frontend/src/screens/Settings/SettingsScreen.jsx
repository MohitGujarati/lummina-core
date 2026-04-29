import { useState, useEffect } from 'react';
import { UI_TEXT } from '../../config/constants';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';
import { deleteAccount } from '../../services/authService';

const SettingsScreen = ({ onBack, currentUser: propUser, currentRole, onLogout }) => {
    const { theme, toggleTheme } = useTheme();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [supaUser, setSupaUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setSupaUser(user);
            setLoadingUser(false);
        });
    }, []);

    const resolvedName = supaUser?.user_metadata?.full_name
        || supaUser?.user_metadata?.name
        || supaUser?.email?.split('@')[0]
        || propUser?.name
        || 'User';

    const resolvedEmail = supaUser?.email || propUser?.email || '';
    const resolvedInitials = resolvedName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setIsDeleting(true);
        try {
            await deleteAccount(currentRole === 'teacher');
            // Auth user is now gone — clear state explicitly then sign out.
            // onLogout handles localStorage + React state; signOut fires SIGNED_OUT as backup.
            onLogout();
            await supabase.auth.signOut();
        } catch (err) {
            const schemaNotReady = err?.message?.includes('Could not find') || err?.code === 'PGRST202';
            addToast(
                schemaNotReady
                    ? 'Database not configured. Run supabase/schema.sql first.'
                    : 'Failed to delete account. Please try again.',
                'error'
            );
            setIsDeleting(false);
        }
    };

    const [formData, setFormData] = useState({
        displayName: propUser?.name || 'User',
        bio: currentRole === 'teacher' ? 'Educator and content creator.' : 'Physics major, class of 2026.',
        emailNotifs: true,
        marketingNotifs: false,
    });

    // Sync once supabase user loads
    useEffect(() => {
        if (supaUser) {
            setFormData(prev => ({
                ...prev,
                displayName: supaUser.user_metadata?.full_name
                    || supaUser.user_metadata?.name
                    || supaUser.email?.split('@')[0]
                    || prev.displayName,
            }));
        }
    }, [supaUser]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (typeof value === 'boolean') {
            addToast('Preference updated', 'success', 2000);
        }
    };

    // ─── Design tokens (Design.md) ───────────────────────────────────────────
    const C = {
        parchment:   '#f5f4ed',
        ivory:       '#faf9f5',
        navy:        '#24386c',
        nearBlack:   '#141413',
        charcoal:    '#4d4c48',
        olive:       '#5e5d59',
        stone:       '#87867f',
        warmSand:    '#e8e6dc',
        borderCream: '#f0eee6',
        borderWarm:  '#e8e6dc',
        ring:        '#d1cfc5',
        focusBlue:   '#3898ec',
        darkSurface: '#30302e',
        warmSilver:  '#b0aea5',
        ivory2:      '#faf9f5',
        error:       '#b53333',
        errorBg:     '#fff5f5',
    };

    const isDark = theme === 'dark';

    const styles = {
        container: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: isDark ? C.nearBlack : C.parchment,
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 50,
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        sidebar: {
            width: '220px',
            flexShrink: 0,
            borderRight: `1px solid ${isDark ? C.darkSurface : C.borderCream}`,
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: isDark ? C.darkSurface : C.ivory,
        },
        backButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: 'none',
            color: isDark ? C.warmSilver : C.olive,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            marginBottom: '2rem',
            borderRadius: '8px',
            transition: 'all 0.15s',
        },
        sidebarLabel: {
            fontSize: '0.65rem',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDark ? C.warmSilver : C.stone,
            padding: '0 0.75rem',
            marginBottom: '0.75rem',
        },
        navItem: (active) => ({
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: active ? 500 : 400,
            color: active
                ? (isDark ? C.ivory : C.nearBlack)
                : (isDark ? C.warmSilver : C.olive),
            backgroundColor: active
                ? (isDark ? 'rgba(255,255,255,0.08)' : C.warmSand)
                : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            transition: 'all 0.15s',
            marginBottom: '2px',
        }),
        content: {
            flex: 1,
            overflowY: 'auto',
            padding: '3rem 4rem',
        },
        pageTitle: {
            fontFamily: "'Anthropic Serif', Georgia, serif",
            fontSize: '1.75rem',
            fontWeight: 500,
            color: isDark ? C.ivory : C.nearBlack,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            marginBottom: '0.375rem',
        },
        pageSubtitle: {
            fontSize: '0.9375rem',
            color: isDark ? C.warmSilver : C.olive,
            lineHeight: 1.6,
            marginBottom: '2.5rem',
            paddingBottom: '1.5rem',
            borderBottom: `1px solid ${isDark ? C.darkSurface : C.borderCream}`,
        },
        sectionTitle: {
            fontFamily: "'Anthropic Serif', Georgia, serif",
            fontSize: '1.0625rem',
            fontWeight: 500,
            color: isDark ? C.ivory : C.nearBlack,
            marginBottom: '1rem',
            letterSpacing: '-0.01em',
        },
        card: {
            backgroundColor: isDark ? C.darkSurface : C.ivory,
            border: `1px solid ${isDark ? '#3d3d3a' : C.borderCream}`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: isDark ? 'none' : 'rgba(0,0,0,0.04) 0px 2px 12px',
        },
        label: {
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: isDark ? C.warmSilver : C.charcoal,
            marginBottom: '0.375rem',
            display: 'block',
        },
        helper: {
            fontSize: '0.75rem',
            color: isDark ? '#6b6b66' : C.stone,
            marginTop: '0.375rem',
            lineHeight: 1.5,
        },
        fieldGroup: {
            marginBottom: '1.25rem',
        },
        input: {
            width: '100%',
            padding: '0.625rem 0.875rem',
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
            backgroundColor: isDark ? '#1a1a18' : '#fff',
            border: `1px solid ${isDark ? C.darkSurface : C.borderWarm}`,
            borderRadius: '10px',
            color: isDark ? C.ivory : C.nearBlack,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: `${isDark ? C.darkSurface : C.borderCream} 0px 0px 0px 0px, ${isDark ? '#3d3d3a' : C.ring} 0px 0px 0px 1px`,
        },
        inputDisabled: {
            width: '100%',
            padding: '0.625rem 0.875rem',
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
            backgroundColor: isDark ? '#111110' : C.parchment,
            border: `1px solid ${isDark ? C.darkSurface : C.borderCream}`,
            borderRadius: '10px',
            color: isDark ? C.warmSilver : C.stone,
            outline: 'none',
            boxSizing: 'border-box',
            cursor: 'not-allowed',
        },
        textarea: {
            width: '100%',
            padding: '0.625rem 0.875rem',
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
            backgroundColor: isDark ? '#1a1a18' : '#fff',
            border: `1px solid ${isDark ? C.darkSurface : C.borderWarm}`,
            borderRadius: '10px',
            color: isDark ? C.ivory : C.nearBlack,
            outline: 'none',
            resize: 'vertical',
            minHeight: '90px',
            lineHeight: 1.6,
            boxSizing: 'border-box',
            boxShadow: `${isDark ? C.darkSurface : C.borderCream} 0px 0px 0px 0px, ${isDark ? '#3d3d3a' : C.ring} 0px 0px 0px 1px`,
        },
        divider: {
            height: '1px',
            background: isDark ? C.darkSurface : C.borderCream,
            margin: '1rem 0',
        },
        toggleRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 0',
        },
        toggleLabel: {
            fontSize: '0.875rem',
            fontWeight: 500,
            color: isDark ? C.ivory : C.nearBlack,
        },
        toggleHelper: {
            fontSize: '0.75rem',
            color: isDark ? C.warmSilver : C.stone,
            marginTop: '2px',
        },
        navyBtn: {
            padding: '0.5625rem 1.25rem',
            backgroundColor: C.navy,
            color: C.ivory,
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: `${C.navy} 0px 0px 0px 0px, ${C.navy} 0px 0px 0px 1px`,
            transition: 'opacity 0.15s',
        },
        sandBtn: {
            padding: '0.5rem 1rem',
            backgroundColor: isDark ? C.darkSurface : C.warmSand,
            color: isDark ? C.warmSilver : C.charcoal,
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            boxShadow: `${isDark ? C.darkSurface : C.warmSand} 0px 0px 0px 0px, ${isDark ? '#3d3d3a' : C.ring} 0px 0px 0px 1px`,
            transition: 'opacity 0.15s',
        },
        dangerCard: {
            marginTop: '1rem',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            border: `1px solid ${C.error}`,
            backgroundColor: isDark ? '#1c0c0c' : C.errorBg,
        },
        dangerTitle: {
            fontFamily: "'Anthropic Serif', Georgia, serif",
            fontSize: '1rem',
            fontWeight: 500,
            color: C.error,
            marginBottom: '0.375rem',
        },
        avatarCircle: {
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: C.navy,
            color: C.ivory,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.625rem',
            fontFamily: "'Anthropic Serif', Georgia, serif",
            fontWeight: 500,
            flexShrink: 0,
            boxShadow: `${C.navy} 0px 0px 0px 0px, rgba(36,56,108,0.18) 0px 4px 16px`,
        },
    };

    const Toggle = ({ checked, onChange }) => (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '2.375rem',
                height: '1.375rem',
                backgroundColor: checked ? C.navy : (isDark ? '#3d3d3a' : C.ring),
                borderRadius: '999px',
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.2s',
                boxShadow: `0px 0px 0px 1px ${checked ? C.navy : (isDark ? '#3d3d3a' : C.ring)}`,
            }}
        >
            <div style={{
                width: '1rem',
                height: '1rem',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: checked ? 'calc(100% - 1rem - 3px)' : '3px',
                transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }} />
        </div>
    );

    const renderGeneral = () => (
        <div>
            <h2 style={styles.pageTitle}>{UI_TEXT.SETTINGS.GENERAL.TITLE}</h2>
            <p style={styles.pageSubtitle}>{UI_TEXT.SETTINGS.GENERAL.SUBTITLE}</p>

            <h3 style={styles.sectionTitle}>Account</h3>
            <div style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={styles.avatarCircle}>
                        {loadingUser ? '…' : resolvedInitials}
                    </div>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: isDark ? C.ivory : C.nearBlack, marginBottom: '2px' }}>
                            {loadingUser ? '—' : resolvedName}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: isDark ? C.warmSilver : C.stone }}>
                            {loadingUser ? '—' : resolvedEmail}
                        </div>
                    </div>
                </div>

                <div style={styles.fieldGroup}>
                    <label style={styles.label}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_LABEL}</label>
                    <input
                        style={styles.inputDisabled}
                        value={loadingUser ? 'Loading…' : resolvedEmail}
                        disabled
                        readOnly
                    />
                    <span style={styles.helper}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_HELPER}</span>
                </div>
            </div>

            <h3 style={styles.sectionTitle}>Preferences</h3>
            <div style={styles.card}>
                <div style={styles.toggleRow}>
                    <div>
                        <div style={styles.toggleLabel}>{UI_TEXT.SETTINGS.GENERAL.DARK_MODE_LABEL}</div>
                        <div style={styles.toggleHelper}>{UI_TEXT.SETTINGS.GENERAL.DARK_MODE_DESC}</div>
                    </div>
                    <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
                </div>
                <div style={styles.divider} />
                <div style={styles.toggleRow}>
                    <div>
                        <div style={styles.toggleLabel}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_NOTIFS_LABEL}</div>
                        <div style={styles.toggleHelper}>{UI_TEXT.SETTINGS.GENERAL.EMAIL_NOTIFS_DESC}</div>
                    </div>
                    <Toggle checked={formData.emailNotifs} onChange={(v) => handleInputChange('emailNotifs', v)} />
                </div>
                <div style={styles.divider} />
                <div style={styles.toggleRow}>
                    <div>
                        <div style={styles.toggleLabel}>{UI_TEXT.SETTINGS.GENERAL.MARKETING_LABEL}</div>
                        <div style={styles.toggleHelper}>{UI_TEXT.SETTINGS.GENERAL.MARKETING_DESC}</div>
                    </div>
                    <Toggle checked={formData.marketingNotifs} onChange={(v) => handleInputChange('marketingNotifs', v)} />
                </div>
            </div>

            <div style={styles.dangerCard}>
                <h3 style={styles.dangerTitle}>{UI_TEXT.SETTINGS.GENERAL.DANGER_ZONE_TITLE}</h3>
                <p style={{ fontSize: '0.8125rem', color: C.error, marginBottom: '1rem', lineHeight: 1.5 }}>
                    {UI_TEXT.SETTINGS.GENERAL.DANGER_WARNING}
                </p>
                <button
                    style={{ ...styles.sandBtn, backgroundColor: C.error, color: 'white', boxShadow: 'none' }}
                    onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
                >
                    {UI_TEXT.SETTINGS.GENERAL.DELETE_BTN}
                </button>
            </div>
        </div>
    );

    const renderProfile = () => (
        <div>
            <h2 style={styles.pageTitle}>{UI_TEXT.SETTINGS.PROFILE.TITLE}</h2>
            <p style={styles.pageSubtitle}>{UI_TEXT.SETTINGS.PROFILE.SUBTITLE}</p>

            <div style={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.75rem' }}>
                    <div style={styles.avatarCircle}>
                        {loadingUser ? '…' : resolvedInitials}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: isDark ? C.ivory : C.nearBlack, marginBottom: '0.25rem' }}>
                            {UI_TEXT.SETTINGS.PROFILE.AVATAR_TITLE}
                        </div>
                        <p style={{ ...styles.helper, marginTop: 0, marginBottom: '0.75rem' }}>
                            {UI_TEXT.SETTINGS.PROFILE.AVATAR_HELPER}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={styles.navyBtn}>{UI_TEXT.SETTINGS.PROFILE.UPLOAD_BTN}</button>
                            <button style={styles.sandBtn}>{UI_TEXT.SETTINGS.PROFILE.REMOVE_BTN}</button>
                        </div>
                    </div>
                </div>

                <div style={styles.fieldGroup}>
                    <label style={styles.label}>{UI_TEXT.SETTINGS.PROFILE.DISPLAY_NAME_LABEL}</label>
                    <input
                        style={styles.input}
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        onFocus={(e) => {
                            e.target.style.borderColor = C.focusBlue;
                            e.target.style.boxShadow = `#ffffff 0px 0px 0px 2px, ${C.focusBlue} 0px 0px 0px 4px`;
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = isDark ? C.darkSurface : C.borderWarm;
                            e.target.style.boxShadow = `${isDark ? C.darkSurface : C.borderCream} 0px 0px 0px 0px, ${isDark ? '#3d3d3a' : C.ring} 0px 0px 0px 1px`;
                        }}
                    />
                </div>

                <div style={styles.fieldGroup}>
                    <label style={styles.label}>{UI_TEXT.SETTINGS.PROFILE.BIO_LABEL}</label>
                    <textarea
                        style={styles.textarea}
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        onFocus={(e) => {
                            e.target.style.borderColor = C.focusBlue;
                            e.target.style.boxShadow = `#ffffff 0px 0px 0px 2px, ${C.focusBlue} 0px 0px 0px 4px`;
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = isDark ? C.darkSurface : C.borderWarm;
                            e.target.style.boxShadow = `${isDark ? C.darkSurface : C.borderCream} 0px 0px 0px 0px, ${isDark ? '#3d3d3a' : C.ring} 0px 0px 0px 1px`;
                        }}
                    />
                    <span style={styles.helper}>{UI_TEXT.SETTINGS.PROFILE.BIO_HELPER}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        style={styles.navyBtn}
                        onClick={() => addToast('Profile saved', 'success')}
                    >
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );

    const NAV_ITEMS = [
        { key: 'general', icon: '⚙', label: UI_TEXT.SETTINGS.SIDEBAR.GENERAL },
        { key: 'profile', icon: '◌', label: UI_TEXT.SETTINGS.SIDEBAR.PROFILE },
        { key: 'security', icon: '⬡', label: UI_TEXT.SETTINGS.SIDEBAR.SECURITY },
        { key: 'billing', icon: '▭', label: UI_TEXT.SETTINGS.SIDEBAR.BILLING },
    ];

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <aside style={styles.sidebar}>
                <button
                    style={styles.backButton}
                    onClick={onBack}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : C.warmSand}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    {UI_TEXT.SETTINGS.BACK_BTN}
                </button>

                <div style={styles.sidebarLabel}>{UI_TEXT.SETTINGS.SIDEBAR.ACCOUNT_TITLE}</div>

                {NAV_ITEMS.map(item => (
                    <div
                        key={item.key}
                        style={styles.navItem(activeTab === item.key)}
                        onClick={() => setActiveTab(item.key)}
                        onMouseEnter={(e) => {
                            if (activeTab !== item.key) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : C.borderCream;
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== item.key) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <span style={{ fontSize: '0.875rem' }}>{item.icon}</span>
                        {item.label}
                    </div>
                ))}
            </aside>

            {/* Content */}
            <main style={styles.content}>
                <div style={{ maxWidth: '580px' }}>
                    {activeTab === 'general' && renderGeneral()}
                    {activeTab === 'profile' && renderProfile()}
                    {(activeTab === 'security' || activeTab === 'billing') && (
                        <div>
                            <h2 style={styles.pageTitle}>
                                {activeTab === 'security' ? UI_TEXT.SETTINGS.SIDEBAR.SECURITY : UI_TEXT.SETTINGS.SIDEBAR.BILLING}
                            </h2>
                            <p style={styles.pageSubtitle}>This section is coming soon.</p>
                            <div style={{ ...styles.card, color: isDark ? C.warmSilver : C.stone, fontSize: '0.9375rem' }}>
                                Nothing here yet — check back later.
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Delete account confirmation modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    padding: '1.5rem',
                }}>
                    <div style={{
                        backgroundColor: isDark ? '#1e1e1c' : C.ivory,
                        border: `1px solid ${C.error}`,
                        borderRadius: '16px',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                        fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    }}>
                        {/* Icon + title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                backgroundColor: '#fff0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                            </div>
                            <h2 style={{
                                fontFamily: "'Anthropic Serif', Georgia, serif",
                                fontSize: '1.125rem',
                                fontWeight: 500,
                                color: C.error,
                                margin: 0,
                                letterSpacing: '-0.01em',
                            }}>
                                Delete account
                            </h2>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: isDark ? C.warmSilver : C.charcoal, lineHeight: 1.6, marginBottom: '0.75rem' }}>
                            This will permanently delete your account and cannot be undone.
                            {currentRole === 'teacher' && (
                                <> All your <strong>subjects, enrolled students, and uploaded materials</strong> will also be deleted.</>
                            )}
                        </p>

                        <p style={{ fontSize: '0.8125rem', color: isDark ? C.warmSilver : C.olive, marginBottom: '1rem' }}>
                            Type <strong style={{ color: C.error }}>DELETE</strong> to confirm.
                        </p>

                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '0.625rem 0.875rem',
                                fontSize: '0.9375rem',
                                fontFamily: 'inherit',
                                backgroundColor: isDark ? '#141413' : '#fff',
                                border: `1px solid ${deleteConfirmText === 'DELETE' ? C.error : (isDark ? '#3d3d3a' : C.ring)}`,
                                borderRadius: '10px',
                                color: isDark ? C.ivory : C.nearBlack,
                                outline: 'none',
                                marginBottom: '1.25rem',
                                boxSizing: 'border-box',
                                letterSpacing: '0.05em',
                            }}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                disabled={isDeleting}
                                style={{
                                    flex: 1,
                                    padding: '0.625rem 1rem',
                                    backgroundColor: isDark ? '#30302e' : C.warmSand,
                                    color: isDark ? C.warmSilver : C.charcoal,
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    opacity: isDeleting ? 0.5 : 1,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                style={{
                                    flex: 1,
                                    padding: '0.625rem 1rem',
                                    backgroundColor: deleteConfirmText === 'DELETE' && !isDeleting ? C.error : '#d08080',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    fontFamily: 'inherit',
                                    cursor: deleteConfirmText === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                                    opacity: deleteConfirmText === 'DELETE' || isDeleting ? 1 : 0.5,
                                    transition: 'background-color 0.15s',
                                }}
                            >
                                {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsScreen;
