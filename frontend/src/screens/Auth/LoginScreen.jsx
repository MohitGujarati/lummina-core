import React, { useState } from 'react';
import { UI_TEXT, ROLES } from '../../config/constants';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';

const LoginScreen = () => {
    const { addToast } = useToast();
    const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Store the intended role so the auth state change handler can route correctly
        localStorage.setItem('lummina_pending_role', selectedRole);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                addToast(error.message, 'error');
                localStorage.removeItem('lummina_pending_role');
            } else {
                addToast('Check your email to confirm your account, then sign in.', 'info');
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                addToast(error.message, 'error');
                localStorage.removeItem('lummina_pending_role');
            }
            // On success: onAuthStateChange in App.jsx handles routing
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = async (e) => {
        e.preventDefault();
        setIsGoogleLoading(true);
        localStorage.setItem('lummina_pending_role', selectedRole);
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) {
            addToast('Google sign-in failed. Please try again.', 'error');
            localStorage.removeItem('lummina_pending_role');
            setIsGoogleLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#f5f4ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                .login-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    font-size: 1rem;
                    font-family: inherit;
                    background: #ffffff;
                    border: 1px solid #f0eee6;
                    border-radius: 12px;
                    color: #141413;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-shadow: #f0eee6 0px 0px 0px 0px, #d1cfc5 0px 0px 0px 1px;
                    box-sizing: border-box;
                }
                .login-input:focus {
                    border-color: #3898ec;
                    box-shadow: #ffffff 0px 0px 0px 2px, #3898ec 0px 0px 0px 4px;
                }
                .login-input::placeholder { color: #87867f; }

                .role-btn {
                    flex: 1;
                    padding: 0.625rem 1rem;
                    border-radius: 8px;
                    border: none;
                    font-size: 0.94rem;
                    font-weight: 500;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .role-btn.active {
                    background: #ffffff;
                    color: #141413;
                    box-shadow: #e8e6dc 0px 0px 0px 0px, #d1cfc5 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px;
                }
                .role-btn.inactive {
                    background: transparent;
                    color: #87867f;
                }
                .role-btn.inactive:hover { color: #5e5d59; }

                .btn-primary {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    background: #24386c;
                    color: #faf9f5;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 500;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: #24386c 0px 0px 0px 0px, #24386c 0px 0px 0px 1px;
                    letter-spacing: 0.01em;
                }
                .btn-primary:hover:not(:disabled) {
                    background: #1a2a50;
                    box-shadow: #1a2a50 0px 0px 0px 0px, #1a2a50 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 4px 12px;
                }
                .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

                .btn-secondary {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: #e8e6dc;
                    color: #4d4c48;
                    border: none;
                    border-radius: 12px;
                    font-size: 0.94rem;
                    font-weight: 500;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                    box-shadow: #e8e6dc 0px 0px 0px 0px, #d1cfc5 0px 0px 0px 1px;
                }
                .btn-secondary:hover:not(:disabled) {
                    background: #dddbd1;
                    box-shadow: #dddbd1 0px 0px 0px 0px, #c2c0b6 0px 0px 0px 1px;
                }
                .btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }

                @keyframes lm-fadein {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .lm-card { animation: lm-fadein 0.4s ease forwards; }
            `}</style>

            <div className="lm-card" style={{ width: '100%', maxWidth: '440px' }}>
                {/* Brand mark */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '2rem',
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '2rem',
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#24386c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#faf9f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                            </svg>
                        </div>
                        <span style={{
                            fontSize: '1.125rem',
                            fontFamily: "'Anthropic Serif', Georgia, serif",
                            fontWeight: 500,
                            color: '#141413',
                            letterSpacing: '-0.02em',
                        }}>
                            Lummina
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: '2rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#141413',
                        margin: '0 0 0.625rem',
                        lineHeight: 1.1,
                        letterSpacing: '-0.025em',
                    }}>
                        {UI_TEXT.LOGIN.WELCOME}
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#5e5d59',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        {UI_TEXT.LOGIN.SUBTITLE}
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    backgroundColor: '#faf9f5',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    border: '1px solid #f0eee6',
                    boxShadow: 'rgba(0,0,0,0.05) 0px 4px 24px',
                }}>
                    {/* Role toggle */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: '#f5f4ed',
                        padding: '0.25rem',
                        borderRadius: '10px',
                        marginBottom: '1.75rem',
                        border: '1px solid #f0eee6',
                    }}>
                        <button
                            className={`role-btn ${selectedRole === ROLES.STUDENT ? 'active' : 'inactive'}`}
                            onClick={() => setSelectedRole(ROLES.STUDENT)}
                            type="button"
                        >
                            {UI_TEXT.LOGIN.ROLES.STUDENT}
                        </button>
                        <button
                            className={`role-btn ${selectedRole === ROLES.TEACHER ? 'active' : 'inactive'}`}
                            onClick={() => setSelectedRole(ROLES.TEACHER)}
                            type="button"
                        >
                            {UI_TEXT.LOGIN.ROLES.TEACHER}
                        </button>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#4d4c48',
                                marginBottom: '0.5rem',
                            }}>
                                Email
                            </label>
                            <input
                                className="login-input"
                                type="email"
                                placeholder="you@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#4d4c48',
                                marginBottom: '0.5rem',
                            }}>
                                {UI_TEXT.LOGIN.PASSWORD_LABEL}
                            </label>
                            <input
                                className="login-input"
                                type="password"
                                placeholder={UI_TEXT.LOGIN.PASSWORD_PLACEHOLDER}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading}
                            style={{ marginTop: '0.5rem' }}
                        >
                            {isLoading ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : UI_TEXT.LOGIN.SUBMIT_BTN)}
                        </button>

                        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#87867f', margin: 0 }}>
                            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                            <button
                                type="button"
                                onClick={() => setIsSignUp(v => !v)}
                                style={{ background: 'none', border: 'none', padding: 0, color: '#24386c', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                            >
                                {isSignUp ? 'Sign in' : 'Sign up'}
                            </button>
                        </p>
                    </form>

                    {/* Divider */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.875rem',
                        margin: '1.5rem 0',
                    }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#f0eee6' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#87867f', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {UI_TEXT.LOGIN.DIVIDER}
                        </span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#f0eee6' }} />
                    </div>

                    {/* Google OAuth */}
                    <button
                        className="btn-secondary"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4d4c48" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#4d4c48" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#4d4c48" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#4d4c48" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {isGoogleLoading ? 'Redirecting…' : UI_TEXT.LOGIN.GOOGLE_BTN}
                    </button>
                </div>

                {/* Footer */}
                <p style={{
                    marginTop: '1.75rem',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    color: '#87867f',
                    lineHeight: 1.6,
                }}>
                    {UI_TEXT.LOGIN.FOOTER}
                </p>
            </div>
        </div>
    );
};

LoginScreen.propTypes = {};

export default LoginScreen;
