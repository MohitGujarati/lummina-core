import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { claimTeacherRole } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

const TeacherCodeScreen = ({ onVerified, onContinueAsStudent }) => {
    const { addToast } = useToast();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCode, setShowCode] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const result = await claimTeacherRole(code);
            if (result.success) {
                addToast('Faculty access verified. Welcome.', 'success');
                onVerified();
            } else {
                setError('Invalid or expired invitation. Please check with your administrator.');
                setIsLoading(false);
            }
        } catch (err) {
            // RPC function missing = schema not yet applied in Supabase
            const schemaNotReady = err?.message?.includes('Could not find') || err?.code === 'PGRST202';
            setError(schemaNotReady
                ? 'Database not configured. Run supabase/schema.sql in your Supabase SQL Editor first.'
                : 'Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="tc-theme" style={{
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
                .tc-theme * { box-sizing: border-box; }
                .tc-input {
                    caret-color: #faf9f5;
                }
                .tc-input:focus {
                    border-color: #faf9f5 !important;
                    box-shadow: 0 0 0 1px rgba(250, 249, 245, 0.25) !important;
                    outline: none;
                }
                .tc-input::placeholder { color: #4d4c48; }
                .tc-submit-btn:hover:not(:disabled) {
                    background-color: #faf9f5 !important;
                    color: #141413 !important;
                    box-shadow: 0 0 0 1px #faf9f5 !important;
                }
                .tc-submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
                .tc-ghost-btn:hover {
                    border-color: rgba(250, 249, 245, 0.25) !important;
                    color: #b0aea5 !important;
                }
                .tc-toggle-btn:hover { color: #87867f !important; }
                @keyframes tc-fadein {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .tc-card { animation: tc-fadein 0.35s ease forwards; }
            `}</style>

            <div className="tc-card" style={{ width: '100%', maxWidth: '440px' }}>

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
                    <h1 style={{
                        fontSize: '2rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#faf9f5',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                    }}>
                        Faculty verification
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#87867f',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        Enter your faculty access code to continue as a teacher.
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
                                Access Code
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="tc-input"
                                    type={showCode ? 'text' : 'password'}
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value); setError(''); }}
                                    placeholder="Enter faculty code"
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 3rem 0.75rem 1rem',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        backgroundColor: '#141413',
                                        border: `1px solid ${error ? '#b53333' : '#3d3d3a'}`,
                                        borderRadius: '12px',
                                        color: '#faf9f5',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        boxShadow: error ? '0 0 0 1px #b53333' : 'none',
                                    }}
                                />
                                {/* Show / hide toggle */}
                                <button
                                    type="button"
                                    className="tc-toggle-btn"
                                    onClick={() => setShowCode(v => !v)}
                                    tabIndex={-1}
                                    style={{
                                        position: 'absolute',
                                        right: '0.875rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#5e5d59',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    {showCode ? (
                                        /* Eye-off icon */
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                            <line x1="1" y1="1" x2="23" y2="23"/>
                                        </svg>
                                    ) : (
                                        /* Eye icon */
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                            <circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
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
                            disabled={isLoading || !code.trim()}
                            className="tc-submit-btn"
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
                            {isLoading ? 'Verifying…' : 'Verify access'}
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
                            className="tc-ghost-btn"
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
                    Restricted access — authorised faculty only.
                </p>
                <p style={{
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#4d4c48',
                }}>
                    © 2026 Lummina AI. All rights reserved.
                </p>
            </div>
        </div>
    );
};

TeacherCodeScreen.propTypes = {
    onVerified: PropTypes.func.isRequired,
    onContinueAsStudent: PropTypes.func.isRequired,
};

export default TeacherCodeScreen;
