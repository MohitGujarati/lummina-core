import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getSubjectByCode, enrollStudent, unenrollStudent } from '../../services/subjectService';
import { useSubjects } from '../../context/SubjectContext';
import { useToast } from '../../context/ToastContext';

const SubjectEnrollmentScreen = ({ onSelectSubject, onRefreshEnrollments }) => {
    const { enrolledSubjects, activeSubjectId, setActiveSubjectId } = useSubjects();
    const { addToast } = useToast();

    const [searchCode, setSearchCode] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [hoveredCardId, setHoveredCardId] = useState(null);
    const [unenrollingId, setUnenrollingId] = useState(null);

    const handleEnroll = async (e) => {
        e.preventDefault();
        if (!searchCode.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const subject = await getSubjectByCode(searchCode);
            if (!subject) {
                setSearchError('No subject found with that code. Please check with your instructor.');
                return;
            }
            await enrollStudent(subject.id);
            await onRefreshEnrollments();
            setSearchCode('');
            addToast(`Enrolled in ${subject.name}.`, 'success');
        } catch (err) {
            if (err.code === '23505') {
                setSearchError('You are already enrolled in this subject.');
            } else {
                setSearchError('Something went wrong. Please try again.');
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleUnenroll = async (e, subjectId, subjectName) => {
        e.stopPropagation();
        setUnenrollingId(subjectId);
        try {
            await unenrollStudent(subjectId);
            if (activeSubjectId === subjectId) setActiveSubjectId(null);
            await onRefreshEnrollments();
            addToast(`Removed ${subjectName} from your library.`, 'info');
        } catch (err) {
            addToast('Could not remove subject. Please try again.', 'error');
        } finally {
            setUnenrollingId(null);
        }
    };

    const handleCardClick = (subjectId) => {
        onSelectSubject(subjectId);
    };

    // Pastel navy shades for card backgrounds (cycles through them)
    const cardColors = ['#24386c', '#1a2a50', '#2d4480', '#1e3060'];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f5f4ed',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                * { box-sizing: border-box; }
                .subject-card {
                    cursor: pointer;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e8e6dc;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    position: relative;
                }
                .subject-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                }
                .unenroll-btn {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.15s, background 0.15s;
                    line-height: 1;
                }
                .subject-card:hover .unenroll-btn { opacity: 1; }
                .unenroll-btn:hover { background: rgba(255,255,255,0.35); color: white; }
                .search-input:focus {
                    outline: none;
                    border-color: #24386c !important;
                    box-shadow: 0 0 0 3px rgba(36,56,108,0.1) !important;
                }
                .enroll-btn:hover:not(:disabled) {
                    background-color: #1a2a50 !important;
                }
                .enroll-btn:disabled { opacity: 0.45; cursor: not-allowed; }
                @keyframes fadein {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .page-fadein { animation: fadein 0.3s ease forwards; }
            `}</style>

            {/* Top bar */}
            <div style={{
                backgroundColor: '#faf9f5',
                borderBottom: '1px solid #f0eee6',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
            }}>
                <div style={{
                    fontSize: '1.1rem',
                    fontFamily: "'Anthropic Serif', Georgia, serif",
                    fontWeight: 500,
                    color: '#141413',
                    letterSpacing: '-0.01em',
                }}>
                    Lummina AI
                </div>

                {/* Search / enroll bar */}
                <form onSubmit={handleEnroll} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: '0.75rem', top: '50%',
                            transform: 'translateY(-50%)', color: '#87867f', fontSize: '0.875rem',
                            pointerEvents: 'none',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            className="search-input"
                            type="text"
                            value={searchCode}
                            onChange={(e) => { setSearchCode(e.target.value.toUpperCase()); setSearchError(''); }}
                            placeholder="Enter subject code to enroll…"
                            style={{
                                padding: '0.6rem 1rem 0.6rem 2.25rem',
                                fontSize: '0.875rem',
                                border: `1px solid ${searchError ? '#b53333' : '#f0eee6'}`,
                                borderRadius: '8px',
                                backgroundColor: '#f5f4ed',
                                color: '#141413',
                                width: '280px',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                letterSpacing: '0.03em',
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || !searchCode.trim()}
                        className="enroll-btn"
                        style={{
                            padding: '0.6rem 1.25rem',
                            backgroundColor: '#24386c',
                            color: '#faf9f5',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {isSearching ? 'Enrolling…' : 'Enroll'}
                    </button>
                </form>
            </div>

            {/* Error banner */}
            {searchError && (
                <div style={{
                    backgroundColor: '#fff5f5',
                    borderBottom: '1px solid #fed7d7',
                    padding: '0.75rem 2rem',
                    fontSize: '0.875rem',
                    color: '#b53333',
                }}>
                    {searchError}
                </div>
            )}

            {/* Main content */}
            <div style={{ padding: '2.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }} className="page-fadein">

                {enrolledSubjects.length === 0 ? (
                    /* Empty state */
                    <div style={{
                        textAlign: 'center',
                        padding: '5rem 2rem',
                        color: '#87867f',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                        <h2 style={{
                            fontFamily: "'Anthropic Serif', Georgia, serif",
                            fontWeight: 500,
                            fontSize: '1.5rem',
                            color: '#141413',
                            margin: '0 0 0.75rem',
                        }}>
                            Your library is empty
                        </h2>
                        <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
                            Enter the subject code from your instructor above to get started.
                        </p>
                    </div>
                ) : (
                    <>
                        <h2 style={{
                            fontFamily: "'Anthropic Serif', Georgia, serif",
                            fontWeight: 500,
                            fontSize: '1.4rem',
                            color: '#141413',
                            margin: '0 0 1.5rem',
                            letterSpacing: '-0.01em',
                        }}>
                            Your Subjects
                        </h2>

                        {/* Card grid — zyBooks style */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '1.25rem',
                        }}>
                            {enrolledSubjects.map((subject, idx) => (
                                <div
                                    key={subject.id}
                                    className="subject-card"
                                    onClick={() => handleCardClick(subject.id)}
                                    onMouseEnter={() => setHoveredCardId(subject.id)}
                                    onMouseLeave={() => setHoveredCardId(null)}
                                    style={{
                                        outline: activeSubjectId === subject.id
                                            ? `2px solid #24386c`
                                            : '2px solid transparent',
                                    }}
                                >
                                    {/* Card top — coloured background like zyBooks */}
                                    <div style={{
                                        backgroundColor: cardColors[idx % cardColors.length],
                                        padding: '1.5rem 1.25rem 1rem',
                                        minHeight: '140px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-start',
                                        position: 'relative',
                                    }}>
                                        {/* Terminal icon (like zyBooks >_ ) */}
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255,255,255,0.5)',
                                            fontFamily: 'monospace',
                                            marginBottom: '0.75rem',
                                            letterSpacing: '0.02em',
                                        }}>
                                            &gt;_
                                        </div>
                                        <div style={{
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            lineHeight: 1.25,
                                            letterSpacing: '-0.01em',
                                        }}>
                                            {subject.name}
                                        </div>

                                        {/* Unenroll button */}
                                        <button
                                            className="unenroll-btn"
                                            onClick={(e) => handleUnenroll(e, subject.id, subject.name)}
                                            disabled={unenrollingId === subject.id}
                                            title="Remove from library"
                                        >
                                            ×
                                        </button>

                                        {/* Active indicator */}
                                        {activeSubjectId === subject.id && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '8px',
                                                right: '10px',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: 'rgba(255,255,255,0.7)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}>
                                                Active
                                            </div>
                                        )}
                                    </div>

                                    {/* Card footer */}
                                    <div style={{
                                        backgroundColor: '#ffffff',
                                        padding: '0.75rem 1.25rem',
                                        borderTop: '1px solid #f0eee6',
                                    }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#141413',
                                            marginBottom: '0.2rem',
                                        }}>
                                            {subject.code}
                                        </div>
                                        {subject.description && (
                                            <div style={{
                                                fontSize: '0.72rem',
                                                color: '#87867f',
                                                lineHeight: 1.4,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {subject.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>


        </div>
    );
};

SubjectEnrollmentScreen.propTypes = {
    onSelectSubject: PropTypes.func.isRequired,
    onRefreshEnrollments: PropTypes.func.isRequired,
};

export default SubjectEnrollmentScreen;
