import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { registerAsTeacher } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

const TeacherRegistrationScreen = ({ onRegistered, onContinueAsStudent }) => {
    const { addToast } = useToast();
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await registerAsTeacher(fullName);
            if (result?.success === false) {
                setError(result.error === 'not_authenticated'
                    ? 'Session expired. Please sign in again.'
                    : 'Registration failed. Please try again.');
                setIsLoading(false);
                return;
            }
            addToast('Welcome aboard! Your teacher account is ready.', 'success');
            onRegistered();
        } catch (err) {
            const schemaNotReady = err?.message?.includes('Could not find') || err?.code === 'PGRST202';
            setError(schemaNotReady
                ? 'Database not configured. Run supabase/schema.sql in your Supabase SQL Editor first.'
                : 'Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="tr-theme" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#141413',
            padding: '2rem',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                .tr-theme * { box-sizing: border-box; }
                .tr-input {
                    caret-color: #faf9f5;
                }
                .tr-input:focus {
                    border-color: #faf9f5 !important;
                    box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.25) !important;
                    outline: none;
                }
                .tr-input::placeholder { color: #4d4c48; }
                .tr-submit-btn:hover:not(:disabled) {
                    background-color: #faf9f5 !important;
                    color: #141413 !important;
                    box-shadow: 0 0 0 1px #faf9f5 !important;
                }
                .tr-submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
                .tr-ghost-btn:hover {
                    border-color: rgba(250, 249, 245, 0.25) !important;
                    color: #b0aea5 !important;
                }
                @keyframes tr-fadein {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .tr-card { animation: tr-fadein 0.35s ease forwards; }
            `}</style>

            <div className="tr-card" style={{ width: '100%', maxWidth: '440px' }}>

                {/* Header */}
                <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#faf9f5',
                        marginBottom: '1rem',
                        letterSpacing: '-0.01em',
                    }}>
                        Lummina AI
                    </div>

                    {/* Mortarboard icon */}
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: '#24386c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#faf9f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                        </svg>
                    </div>

                    <h1 style={{
                        fontSize: '2rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#faf9f5',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                    }}>
                        Set up your tutor profile
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#87867f',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        Tell us your name and we'll create your teacher account instantly.
                    </p>
                </header>

                {/* Card */}
                <div style={{
                    backgroundColor: '#30302e',
                    borderRadius: '24px',
                    padding: '3rem 2.5rem',
                    border: '1px solid #3d3d3a',
                    boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.2)',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#b0aea5',
                                marginBottom: '0.5rem',
                            }}>
                                Full name
                            </label>
                            <input
                                className="tr-input"
                                type="text"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                                placeholder="e.g. Dr. Jane Smith"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    fontSize: '1rem',
                                    backgroundColor: '#141413',
                                    border: `1px solid ${error ? '#b53333' : '#3d3d3a'}`,
                                    borderRadius: '12px',
                                    color: '#faf9f5',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxShadow: error ? '0 0 0 1px #b53333' : 'none',
                                }}
                            />
                            {error && (
                                <p style={{
                                    margin: '0.5rem 0 0',
                                    fontSize: '0.875rem',
                                    color: '#b53333',
                                    lineHeight: 1.4,
                                }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !fullName.trim()}
                            className="tr-submit-btn"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                marginTop: '0.25rem',
                                backgroundColor: '#24386c',
                                color: '#faf9f5',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, color 0.2s, box-shadow 0.2s',
                                boxShadow: '0 0 0 1px #24386c',
                                letterSpacing: '0.01em',
                            }}
                        >
                            {isLoading ? 'Creating your account…' : 'Register as teacher'}
                        </button>

                        {/* Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            color: '#4d4c48',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                        }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#3d3d3a' }} />
                            <span>OR</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#3d3d3a' }} />
                        </div>

                        <button
                            type="button"
                            onClick={onContinueAsStudent}
                            className="tr-ghost-btn"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                backgroundColor: 'transparent',
                                border: '1px solid #3d3d3a',
                                borderRadius: '12px',
                                fontSize: '0.94rem',
                                fontWeight: 500,
                                color: '#5e5d59',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s, color 0.2s',
                                letterSpacing: '0.01em',
                            }}
                        >
                            Continue as Student
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#4d4c48',
                    lineHeight: 1.6,
                }}>
                    © 2026 Lummina AI. All rights reserved.
                </p>
            </div>
        </div>
    );
};

TeacherRegistrationScreen.propTypes = {
    onRegistered: PropTypes.func.isRequired,
    onContinueAsStudent: PropTypes.func.isRequired,
};

export default TeacherRegistrationScreen;
