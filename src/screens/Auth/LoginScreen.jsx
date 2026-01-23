import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT, ROLES } from '../../config/constants';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import { useToast } from '../../context/ToastContext';

const LoginScreen = ({ onLogin }) => {
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            onLogin(selectedRole);
            addToast(`Welcome back, ${selectedRole === ROLES.TEACHER ? 'Professor' : 'Student'}!`, 'success');
            setIsLoading(false);
        }, 1000);
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
        },
        backgroundDecoration: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 50% 0%, var(--color-primary-light) 0%, transparent 60%)',
            opacity: 0.3,
            zIndex: 0,
            pointerEvents: 'none',
        },
        card: {
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2.5rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
        },
        header: {
            textAlign: 'center',
            marginBottom: '2.5rem',
        },
        appLogo: {
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
        },
        subtitle: {
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
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
            borderRadius: 'var(--radius-lg)',
            marginBottom: '0.5rem',
            border: '1px solid var(--color-border)',
        },
        roleButton: (isActive) => ({
            flex: 1,
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: isActive ? 'var(--color-bg-surface)' : 'transparent',
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s var(--ease-snappy)',
            boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
        }),
        divider: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.75rem',
            fontWeight: 600,
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
        },
        footer: {
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--color-text-tertiary)',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.backgroundDecoration} />

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
                        label={UI_TEXT.LOGIN.EMAIL_LABEL}
                        placeholder={UI_TEXT.LOGIN.EMAIL_PLACEHOLDER}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
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

                    <Button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        {isLoading ? 'Signing in...' : UI_TEXT.LOGIN.SUBMIT_BTN}
                    </Button>
                </form>

                <div style={styles.divider}>
                    <div style={styles.line} />
                    <span>{UI_TEXT.LOGIN.DIVIDER}</span>
                    <div style={styles.line} />
                </div>

                <Button variant="secondary" style={styles.googleBtn} onClick={() => onLogin(selectedRole)}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
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
