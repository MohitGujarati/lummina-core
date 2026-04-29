import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { validateSubjectCode } from '../../config/subjectCodes';
import { useToast } from '../../context/ToastContext';

const SubjectCodeScreen = ({ onUnlock }) => {
    const { addToast } = useToast();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!code.trim()) return;

        setIsLoading(true);
        setError('');
        setTimeout(() => {
            const subject = validateSubjectCode(code);
            if (subject) {
                addToast(`Access granted — welcome to ${subject.label}.`, 'success');
                onUnlock(subject.lectureId);
            } else {
                setError('Invalid subject code. Please check with your instructor.');
                setIsLoading(false);
            }
        }, 600);
    };

    return (
        <div className="sc-theme" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#f5f4ed',
            padding: '2rem',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                .sc-theme * { box-sizing: border-box; }
                .sc-input:focus {
                    border-color: #24386c !important;
                    box-shadow: 0 0 0 3px rgba(36, 56, 108, 0.10) !important;
                    outline: none;
                }
                .sc-submit-btn:hover:not(:disabled) {
                    background-color: #1a2a50 !important;
                    box-shadow: 0 0 0 1px #1a2a50 !important;
                }
                .sc-submit-btn:disabled {
                    opacity: 0.45;
                    cursor: not-allowed;
                }
                @keyframes sc-fadein {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .sc-card { animation: sc-fadein 0.35s ease forwards; }
            `}</style>

            <div className="sc-card" style={{ width: '100%', maxWidth: '440px' }}>

                {/* Header */}
                <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#141413',
                        marginBottom: '1rem',
                        letterSpacing: '-0.01em',
                    }}>
                        Lummina AI
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: '#141413',
                        margin: '0 0 0.5rem',
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                    }}>
                        Access your course
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#5e5d59',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        Enter the subject code provided by your instructor.
                    </p>
                </header>

                {/* Card */}
                <div style={{
                    backgroundColor: '#faf9f5',
                    borderRadius: '24px',
                    padding: '3rem 2.5rem',
                    border: '1px solid #f0eee6',
                    boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.05)',
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#141413',
                                marginBottom: '0.5rem',
                            }}>
                                Subject Code
                            </label>
                            <input
                                className="sc-input"
                                type="text"
                                value={code}
                                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
                                placeholder="e.g. PHYS101"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    letterSpacing: '0.06em',
                                    backgroundColor: '#f5f4ed',
                                    border: `1px solid ${error ? '#b53333' : '#f0eee6'}`,
                                    borderRadius: '12px',
                                    color: '#141413',
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
                            disabled={isLoading || !code.trim()}
                            className="sc-submit-btn"
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
                                transition: 'background-color 0.2s, box-shadow 0.2s',
                                boxShadow: '0 0 0 1px #24386c',
                                letterSpacing: '0.01em',
                            }}
                        >
                            {isLoading ? 'Verifying…' : 'Continue'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    color: '#87867f',
                    lineHeight: 1.6,
                }}>
                    Don't have a code? Contact your instructor.
                </p>

            </div>
        </div>
    );
};

SubjectCodeScreen.propTypes = {
    onUnlock: PropTypes.func.isRequired,
};

export default SubjectCodeScreen;
