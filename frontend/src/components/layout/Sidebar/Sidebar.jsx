import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT, ROLES } from '../../../config/constants';
import { getSubjectChapters } from '../../../services/subjectService';
import LumminaMascot from '../../common/Mascot/Mascot';

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

const Sidebar = ({
    isOpen,
    currentRole,
    onNewChat,
    onNavigateKB,
    onNavigateQuiz,
    onNavigateViva,
    onSelectLecture,
    selectedLecture,
    selectedChapterId,
    onGoToEnrollment,
    enrolledSubjects,
    teacherSubjects,
    recentConversations,
    activeConversationId,
    onSelectConversation,
}) => {
    const [hoveredSubjectId, setHoveredSubjectId] = useState(null);
    const [hoveredRecentIndex, setHoveredRecentIndex] = useState(null);

    // Chapter expansion state
    const [expandedSubjectId, setExpandedSubjectId] = useState(null);
    const [chaptersCache, setChaptersCache] = useState({});
    const [hoveredChapterId, setHoveredChapterId] = useState(null);

    const isTeacher = currentRole === ROLES.TEACHER;
    const subjects = isTeacher ? (teacherSubjects || []) : (enrolledSubjects || []);

    useEffect(() => {
        if (!expandedSubjectId || chaptersCache[expandedSubjectId]) return;
        getSubjectChapters(expandedSubjectId)
            .then(data => setChaptersCache(prev => ({ ...prev, [expandedSubjectId]: data })))
            .catch(() => setChaptersCache(prev => ({ ...prev, [expandedSubjectId]: [] })));
    }, [expandedSubjectId]);

    const handleSubjectClick = (subjectId) => {
        onSelectLecture && onSelectLecture(subjectId, null);
        setExpandedSubjectId(prev => prev === subjectId ? null : subjectId);
    };

    const handleChapterClick = (subjectId, chapterId) => {
        onSelectLecture && onSelectLecture(subjectId, chapterId);
    };

    const convList = recentConversations || [];

    return (
        <aside style={{
            width: isOpen ? '264px' : '64px',
            height: '100vh',
            backgroundColor: 'var(--color-bg-sidebar)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.35s ease',
            flexShrink: 0,
            overflow: 'hidden',
            fontFamily: "'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}>
            <style>{`
                .sb-new-chat {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    width: calc(100% - 1.75rem);
                    margin: 0 0.875rem;
                    padding: 0.6rem 0.875rem;
                    border-radius: 10px;
                    border: 1px solid #e2e0d6;
                    background: #ffffff;
                    color: #141413;
                    font-size: 0.875rem;
                    font-weight: 500;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    justify-content: ${isOpen ? 'flex-start' : 'center'};
                    box-sizing: border-box;
                }
                .sb-new-chat:hover {
                    background: #faf9f5;
                    border-color: #ccc9be;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                }

                .sb-subject-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 7px;
                    cursor: pointer;
                    font-size: 0.845rem;
                    transition: background 0.12s ease, color 0.12s ease;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border: none;
                    background: none;
                    font-family: inherit;
                    width: 100%;
                    text-align: left;
                    line-height: 1.3;
                }

                .sb-chapter-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem 0.375rem 0.875rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: background 0.12s ease, color 0.12s ease;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    border: none;
                    background: none;
                    font-family: inherit;
                    width: 100%;
                    text-align: left;
                    line-height: 1.3;
                }

                .sb-action-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding: 0.5rem 0.875rem;
                    border-radius: 8px;
                    border: none;
                    background: none;
                    font-size: 0.845rem;
                    font-family: inherit;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                    transition: background 0.12s ease, color 0.12s ease;
                    color: #5e5d59;
                    justify-content: ${isOpen ? 'flex-start' : 'center'};
                }
                .sb-action-btn:hover { background: #eeece4; color: #141413; }

                .sb-enroll-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem 0.75rem;
                    border-radius: 7px;
                    border: none;
                    background: none;
                    font-size: 0.8rem;
                    font-family: inherit;
                    cursor: pointer;
                    color: #9e9d97;
                    transition: color 0.12s, background 0.12s;
                    width: 100%;
                    text-align: left;
                }
                .sb-enroll-btn:hover { color: #4d4c48; background: #eeece4; }

                .sb-section-label {
                    font-size: 0.6625rem;
                    font-weight: 700;
                    color: #a09f99;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    padding: 0 0.75rem;
                    margin-bottom: 0.3rem;
                }

                .sb-recent-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.45rem 0.75rem;
                    border-radius: 7px;
                    cursor: pointer;
                    font-size: 0.845rem;
                    color: #5e5d59;
                    transition: background 0.12s, color 0.12s;
                    white-space: nowrap;
                    overflow: hidden;
                }
                .sb-recent-item:hover { background: #eeece4; color: #141413; }

                /* Thin scrollbar */
                .sb-scroll::-webkit-scrollbar { width: 4px; }
                .sb-scroll::-webkit-scrollbar-track { background: transparent; }
                .sb-scroll::-webkit-scrollbar-thumb { background: #dddbd2; border-radius: 4px; }
                .sb-scroll::-webkit-scrollbar-thumb:hover { background: #c9c7bd; }
            `}</style>

            {/* ── Brand header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '1.1rem 1rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                flexShrink: 0,
                justifyContent: isOpen ? 'flex-start' : 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}   >
                    <LumminaMascot size={42} trickNumber={0} />
                </div>
                {isOpen && (
                    <span style={{
                        fontSize: '1rem',
                        fontFamily: "'Anthropic Serif', Georgia, serif",
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '-0.02em',
                        whiteSpace: 'nowrap',
                    }}>
                        Lummina AI
                    </span>
                )}
            </div>

            {/* ── New Chat button ── */}
            <div style={{ padding: '0.875rem 0 0.625rem', flexShrink: 0 }}>
                <button
                    className="sb-new-chat"
                    onClick={onNewChat}
                    title={!isOpen ? 'New Chat' : ''}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {isOpen && <span>{UI_TEXT.SIDEBAR.NEW_CHAT}</span>}
                </button>
            </div>

            {/* ── Scrollable middle ── */}
            <div className="sb-scroll" style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.75rem',
                padding: '0.375rem 0.375rem 1rem',
            }}>
                {/* My Subjects */}
                <div>
                    {isOpen && <div className="sb-section-label">My Subjects</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {subjects.map((subject) => {
                            const isActive = selectedLecture === subject.id && !selectedChapterId;
                            const isHovered = hoveredSubjectId === subject.id;
                            const isExpanded = expandedSubjectId === subject.id;
                            const chapters = chaptersCache[subject.id] || [];
                            return (
                                <React.Fragment key={subject.id}>
                                    <button
                                        className="sb-subject-item"
                                        style={{
                                            background: isActive ? '#e6e4d9' : isHovered ? '#eceae1' : 'none',
                                            color: isActive ? '#141413' : isHovered ? '#141413' : '#4d4c48',
                                            fontWeight: isActive ? 600 : 400,
                                        }}
                                        onClick={() => handleSubjectClick(subject.id)}
                                        onMouseEnter={() => setHoveredSubjectId(subject.id)}
                                        onMouseLeave={() => setHoveredSubjectId(null)}
                                        title={!isOpen ? subject.name : ''}
                                    >
                                        {/* Indicator dot */}
                                        <span style={{
                                            width: '6px', height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? '#24386c' : isHovered ? '#9e9d97' : '#d5d3c9',
                                            flexShrink: 0,
                                            transition: 'background 0.12s',
                                        }} />
                                        {isOpen && (
                                            <>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                                    {subject.name}
                                                </span>
                                                {/* Chevron */}
                                                <svg
                                                    width="10" height="10"
                                                    viewBox="0 0 24 24"
                                                    fill="none" stroke="currentColor"
                                                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                                    style={{
                                                        flexShrink: 0,
                                                        opacity: 0.4,
                                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s ease',
                                                    }}
                                                >
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </>
                                        )}
                                    </button>

                                    {/* Chapters — indented with a left track line */}
                                    {isOpen && isExpanded && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1px',
                                            marginLeft: '0.875rem',
                                            paddingLeft: '0.75rem',
                                            borderLeft: '1.5px solid #dddbd2',
                                            marginTop: '2px',
                                            marginBottom: '4px',
                                        }}>
                                            {chapters.length === 0 ? (
                                                <span style={{
                                                    fontSize: '0.775rem',
                                                    color: '#b0afa9',
                                                    padding: '0.3rem 0.5rem',
                                                    fontStyle: 'italic',
                                                }}>
                                                    No chapters yet
                                                </span>
                                            ) : chapters.map(ch => {
                                                const isChActive = selectedLecture === subject.id && selectedChapterId === ch.id;
                                                const isChHovered = hoveredChapterId === ch.id;
                                                return (
                                                    <button
                                                        key={ch.id}
                                                        className="sb-chapter-item"
                                                        style={{
                                                            background: isChActive ? '#e6e4d9' : isChHovered ? '#eceae1' : 'none',
                                                            color: isChActive ? '#24386c' : isChHovered ? '#141413' : '#6b6a65',
                                                            fontWeight: isChActive ? 600 : 400,
                                                        }}
                                                        onClick={() => handleChapterClick(subject.id, ch.id)}
                                                        onMouseEnter={() => setHoveredChapterId(ch.id)}
                                                        onMouseLeave={() => setHoveredChapterId(null)}
                                                    >
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {ch.title}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {subjects.length === 0 && isOpen && (
                            <p style={{
                                fontSize: '0.8rem',
                                color: '#9e9d97',
                                padding: '0.25rem 0.75rem',
                                margin: 0,
                                lineHeight: 1.5,
                            }}>
                                {isTeacher ? 'No subjects yet.' : 'Not enrolled in any subjects yet.'}
                            </p>
                        )}

                        {isOpen && (
                            <button
                                className="sb-enroll-btn"
                                onClick={isTeacher ? onNavigateKB : onGoToEnrollment}
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                {isTeacher ? 'Add Subject' : 'Enroll in Subject'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Recent conversations */}
                <div>
                    {isOpen && <div className="sb-section-label">{UI_TEXT.SIDEBAR.RECENT_TITLE}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {convList.length === 0 && isOpen && (
                            <p style={{ fontSize: '0.8rem', color: '#9e9d97', padding: '0.25rem 0.75rem', margin: 0 }}>
                                No recent chats yet.
                            </p>
                        )}
                        {convList.map((conv, i) => {
                            const isActive = activeConversationId === conv.id;
                            const isHovered = hoveredRecentIndex === i;
                            return (
                                <div
                                    key={conv.id}
                                    className="sb-recent-item"
                                    style={{
                                        background: isActive ? '#e6e4d9' : isHovered ? '#eceae1' : 'none',
                                        color: isActive ? '#141413' : isHovered ? '#141413' : '#5e5d59',
                                        fontWeight: isActive ? 500 : 400,
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        gap: '0.15rem',
                                        padding: '0.45rem 0.75rem',
                                    }}
                                    onMouseEnter={() => setHoveredRecentIndex(i)}
                                    onMouseLeave={() => setHoveredRecentIndex(null)}
                                    onClick={() => onSelectConversation?.(conv)}
                                    title={!isOpen ? conv.title : ''}
                                >
                                    {isOpen ? (
                                        <>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontSize: '0.845rem' }}>
                                                {conv.title}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: '#a09f99', display: 'flex', gap: '0.4rem' }}>
                                                {conv.subjects?.name && (
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                                        {conv.subjects.name}
                                                    </span>
                                                )}
                                                {conv.subjects?.name && <span>·</span>}
                                                <span>{timeAgo(conv.updated_at)}</span>
                                            </span>
                                        </>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* Mascot above KB */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0.5rem 0 0.75rem',
            }}>
                {/* <LumminaMascot size={52} trickNumber={1} /> */}
            </div>
            {/* ── Bottom actions ── */}
            <div style={{
                borderTop: '1px solid var(--color-border)',
                padding: '0.625rem 0.375rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                flexShrink: 0,
            }}>



                {isTeacher && (
                    <button
                        className="sb-action-btn"
                        onClick={onNavigateKB}
                        title={!isOpen ? UI_TEXT.SIDEBAR.KB_LINK : ''}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        {isOpen && <span>{UI_TEXT.SIDEBAR.KB_LINK}</span>}
                    </button>
                )}

                <button
                    className="sb-action-btn"
                    onClick={onNavigateQuiz}
                    title={!isOpen ? 'Quiz Mode' : ''}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {isOpen && <span>Quiz Mode</span>}
                </button>

                <button
                    className="sb-action-btn"
                    onClick={onNavigateViva}
                    title={!isOpen ? 'Oral Viva Mode' : ''}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    {isOpen && <span>Oral Viva Mode</span>}
                </button>

                {/* Profile row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5rem 0.875rem',
                    marginTop: '0.375rem',
                    borderTop: '1px solid var(--color-border)',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                }}>
                    <div style={{
                        width: '28px', height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #24386c 0%, #3a5298 100%)',
                        color: '#faf9f5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                        flexShrink: 0,
                        letterSpacing: '0.02em',
                    }}>
                        {isTeacher ? 'T' : 'S'}
                    </div>
                    {isOpen && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#3a3a38' }}>
                                {isTeacher ? 'Teacher' : 'Student'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

Sidebar.propTypes = {
    isOpen: PropTypes.bool,
    currentRole: PropTypes.string,
    onNewChat: PropTypes.func,
    onNavigateKB: PropTypes.func,
    onNavigateQuiz: PropTypes.func,
    onNavigateViva: PropTypes.func,
    onSelectLecture: PropTypes.func,
    selectedLecture: PropTypes.string,
    selectedChapterId: PropTypes.string,
    onGoToEnrollment: PropTypes.func,
    enrolledSubjects: PropTypes.array,
    teacherSubjects: PropTypes.array,
    recentConversations: PropTypes.array,
    activeConversationId: PropTypes.string,
    onSelectConversation: PropTypes.func,
};

export default Sidebar;
