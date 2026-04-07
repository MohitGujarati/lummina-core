import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT, ROLES } from '../../config/constants';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { useToast } from '../../context/ToastContext';

const LoginScreen = ({ onLogin }) => {
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Sync theme with the landing page preference
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('lummina_landing_theme');
        return saved === 'dark';
    });

    // Hardcoded credentials
    const VALID_USERNAME = 'GeminiTestUser';
    const VALID_PASSWORD = 'ABI$*INTERN#&';

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Validate credentials
        setTimeout(() => {
            if (username === VALID_USERNAME && password === VALID_PASSWORD) {
                onLogin(selectedRole);
                addToast(`Welcome back, ${selectedRole === ROLES.TEACHER ? 'Professor' : 'Student'}!`, 'success');
            } else {
                addToast('Invalid username or password. Please try again.', 'error');
            }
            setIsLoading(false);
        }, 800);
    };

    const handleGoogleSignIn = (e) => {
        e.preventDefault();
        onLogin(selectedRole);
        addToast(`Welcome back via Google, ${selectedRole === ROLES.TEACHER ? 'Professor' : 'Student'}!`, 'success');
    };

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            localStorage.setItem('lummina_landing_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: 'var(--color-bg-app)',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
            transition: 'background-color 0.3s ease, color 0.3s ease',
        },
        themeToggle: {
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'color 0.2s, background-color 0.2s',
            zIndex: 10,
        },
        card: {
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: '24px', // highly rounded
            padding: '3rem 2.5rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: 'var(--shadow-custom)',
            border: '1px solid var(--color-border)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
        },
        header: {
            textAlign: 'center',
            marginBottom: '2.5rem',
        },
        appLogo: {
            fontSize: '1.25rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
        },
        title: {
            fontSize: '2rem', // Equivalent to standard sub-heading
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
        },
        subtitle: {
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
        },
        form: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
        },
        roleToggle: {
            display: 'flex',
            backgroundColor: 'var(--color-bg-app)',
            padding: '0.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)',
        },
        roleButton: (isActive) => ({
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isActive ? 'var(--color-bg-surface)' : 'transparent',
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            fontWeight: 500,
            fontSize: '0.94rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isActive ? '0 0 0 1px var(--color-ring)' : 'none',
        }),
        divider: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.75rem',
            fontWeight: 500,
            margin: '1.5rem 0',
        },
        line: {
            flex: 1,
            height: '1px',
            backgroundColor: 'var(--color-border)',
        },
        googleBtn: {
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: '12px',
        },
        footer: {
            marginTop: '2.5rem',
            textAlign: 'center',
            fontSize: '0.88rem',
            color: 'var(--color-text-tertiary)',
        }
    };

    return (
        <div className={`login-theme ${isDark ? 'dark' : ''}`} style={styles.container}>
            <style>{`
                /* Re-mapping global variables locally to match the Claude Design System */
                .login-theme {
                    /* Typography */
                    --font-serif: 'Anthropic Serif', Georgia, serif;
                    --font-sans: 'Anthropic Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    --font-mono: 'Anthropic Mono', 'Courier New', Courier, monospace;

                    /* Light Theme (Parchment) */
                    --color-bg-app: #f5f4ed;
                    --color-bg-surface: #faf9f5;
                    --color-text-primary: #141413;
                    --color-text-secondary: #5e5d59;
                    --color-text-tertiary: #87867f;
                    --color-text-inverse: #faf9f5;
                    --color-border: #f0eee6;
                    
                    /* Accent from updated LandingPage CSS */
                    --color-primary: #24386c; 
                    --color-primary-light: #1a2a50; 
                    --color-accent: #24386c; 
                    
                    --color-ring: #d1cfc5;
                    --shadow-custom: 0px 4px 24px rgba(0, 0, 0, 0.05);
                    
                    /* Customizing generic components */
                    --radius-md: 12px;
                    --shadow-sm: 0 0 0 1px var(--color-ring);
                    --shadow-md: 0 0 0 1px var(--color-primary);
                }

                .login-theme.dark {
                    /* Dark Theme (Near Black) */
                    --color-bg-app: #141413;
                    --color-bg-surface: #30302e;
                    --color-text-primary: #b0aea5;
                    --color-text-secondary: #87867f;
                    --color-text-tertiary: #5e5d59;
                    --color-text-inverse: #faf9f5;
                    --color-border: #30302e;
                    
                    /* Accent from updated LandingPage CSS */
                    --color-primary: #24386c;
                    --color-primary-light: #304a8b;
                    --color-accent: #24386c;
                    
                    --color-ring: rgba(255, 255, 255, 0.15);
                    --shadow-custom: 0px 4px 24px rgba(0, 0, 0, 0.2);
                }

                .theme-toggle-btn:hover {
                    background-color: var(--color-bg-surface);
                    color: var(--color-text-primary);
                }
            `}</style>
            
            <button onClick={toggleTheme} className="theme-toggle-btn" style={styles.themeToggle} aria-label="Toggle Theme">
                {isDark ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                )}
            </button>

            <div style={styles.card}>
                <header style={styles.header}>
                    <div style={styles.appLogo}>{UI_TEXT.LOGIN.APP_NAME}</div>
                    <h1 style={styles.title}>{UI_TEXT.LOGIN.WELCOME}</h1>
                    <p style={styles.subtitle}>{UI_TEXT.LOGIN.SUBTITLE}</p>
                </header>

                <div style={styles.roleToggle}>
                    <button
                        style={styles.roleButton(selectedRole === ROLES.STUDENT)}
                        onClick={() => setSelectedRole(ROLES.STUDENT)}
                        type="button"
                    >
                        {UI_TEXT.LOGIN.ROLES.STUDENT}
                    </button>
                    <button
                        style={styles.roleButton(selectedRole === ROLES.TEACHER)}
                        onClick={() => setSelectedRole(ROLES.TEACHER)}
                        type="button"
                    >
                        {UI_TEXT.LOGIN.ROLES.TEACHER}
                    </button>
                </div>

                <form style={styles.form} onSubmit={handleLogin}>
                    <Input
                        label="Username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        type="text"
                        required
                    />
                    <Input
                        label={UI_TEXT.LOGIN.PASSWORD_LABEL}
                        placeholder={UI_TEXT.LOGIN.PASSWORD_PLACEHOLDER}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        required
                    />

                    <Button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem', borderRadius: '12px' }}>
                        {isLoading ? 'Signing in...' : UI_TEXT.LOGIN.SUBMIT_BTN}
                    </Button>
                </form>

                <div style={styles.divider}>
                    <div style={styles.line} />
                    <span>{UI_TEXT.LOGIN.DIVIDER}</span>
                    <div style={styles.line} />
                </div>

                <Button variant="secondary" style={styles.googleBtn} onClick={handleGoogleSignIn}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {UI_TEXT.LOGIN.GOOGLE_BTN}
                </Button>

                <div style={styles.footer}>
                    {UI_TEXT.LOGIN.FOOTER}
                </div>
            </div>
        </div>
    );
};

LoginScreen.propTypes = {
    onLogin: PropTypes.func.isRequired,
};

export default LoginScreen;
