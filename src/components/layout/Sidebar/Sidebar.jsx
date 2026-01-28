import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT, ROLES } from '../../../config/constants';

const Sidebar = ({
    isOpen,
    currentRole,
    onToggleRole,
    onNewChat,
    onNavigateKB,
    onNavigateQuiz,
    onSelectLecture,
    selectedLecture // Receive current selection
}) => {
    // State for hover effects
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const [isNewChatHovered, setIsNewChatHovered] = useState(false);
    const [hoveredRecentIndex, setHoveredRecentIndex] = useState(null);
    const [isKBButtonHovered, setIsKBButtonHovered] = useState(false);
    const [isQuizButtonHovered, setIsQuizButtonHovered] = useState(false);
    const [isProfileHovered, setIsProfileHovered] = useState(false);
    const [isSwitchHovered, setIsSwitchHovered] = useState(false);

    // Lecture Selection State
    const [lectures, setLectures] = useState([]);
    const [isLectureDropdownOpen, setIsLectureDropdownOpen] = useState(false);
    const [isLectureButtonHovered, setIsLectureButtonHovered] = useState(false);
    const [hoveredLectureIndex, setHoveredLectureIndex] = useState(null);

    const listHovered = (index) => hoveredRecentIndex === index;
    const lectureHovered = (index) => hoveredLectureIndex === index;

    // Load available lectures from assets
    React.useEffect(() => {
        // Use Vite's glob import to find files in assets. 
        // We look for any file 2 levels deep to identify lecture folders.
        const modules = import.meta.glob('/src/assets/*/*');
        const foundLectures = new Set();

        for (const path in modules) {
            // Path structure: /src/assets/<lecture_name>/<file>
            const parts = path.split('/');
            const assetIndex = parts.indexOf('assets');
            if (assetIndex !== -1 && parts[assetIndex + 1]) {
                foundLectures.add(parts[assetIndex + 1]);
            }
        }

        const sortedLectures = Array.from(foundLectures).sort();
        setLectures(sortedLectures);
    }, []);

    // Helper to format lecture name (e.g. "leacture_1" -> "Lecture 1")
    const formatLectureName = (name) => {
        return name
            .replace(/_/g, ' ')
            .replace(/leacture/i, 'Lecture') // Fix common typo
            .replace(/\b\w/g, c => c.toUpperCase()); // Title Case
    };

    // Mock history data - in real app this would come from props/store
    const recentChats = [
        'Quantum Physics Intro',
        'History of Rome',
        'Calculus 101 Notes',
    ];





    const styles = {
        sidebar: {
            width: isOpen ? '280px' : '72px', // Slightly wider expanded, narrower collapsed
            height: '100vh',
            backgroundColor: 'var(--color-bg-sidebar)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            transition: 'width 0.4s var(--ease-snappy)',
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative', // For consistent stacking
            boxShadow: isOpen ? 'var(--shadow-lg)' : 'none', // Subtle lifted look when open
            zIndex: 20
        },
        topSection: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            marginBottom: '1.5rem',
        },
        headerRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            height: '40px',
        },
        menuButton: {
            background: isMenuHovered ? 'var(--color-bg-app)' : 'transparent',
            border: 'none',
            padding: '0.5rem',
            cursor: 'pointer',
            color: isMenuHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        brandTitle: {
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            letterSpacing: '-0.02em',
            display: isOpen ? 'block' : 'none',
            whiteSpace: 'nowrap',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s ease 0.1s'
        },
        newChatButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: isNewChatHovered ? 'var(--color-primary)' : 'var(--color-bg-surface)',
            border: '1px solid',
            borderColor: isNewChatHovered ? 'transparent' : 'var(--color-border)',
            padding: isOpen ? '0.75rem 1rem' : '0.75rem',
            borderRadius: isOpen ? 'var(--radius-md)' : '50%',
            cursor: 'pointer',
            transition: 'all 0.2s var(--ease-snappy)',
            color: isNewChatHovered ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
            width: '100%',
            justifyContent: isOpen ? 'flex-start' : 'center',
            boxShadow: isNewChatHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            marginBottom: '0.5rem'
        },
        selectLectureButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: isLectureButtonHovered ? 'var(--color-bg-surface-hover)' : 'transparent',
            border: '1px solid',
            borderColor: isLectureButtonHovered ? 'var(--color-border)' : 'var(--color-border-light)',
            padding: isOpen ? '0.75rem 1rem' : '0.75rem',
            borderRadius: isOpen ? 'var(--radius-md)' : '50%',
            cursor: 'pointer',
            transition: 'all 0.2s var(--ease-snappy)',
            color: 'var(--color-text-primary)',
            width: '100%',
            justifyContent: isOpen ? 'flex-start' : 'center',
            position: 'relative',
        },
        plusIcon: {
            fontSize: '1.1rem',
            fontWeight: 400,
            color: isNewChatHovered ? 'white' : 'var(--color-text-secondary)',
        },
        buttonText: {
            fontSize: '0.9rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: isOpen ? 'block' : 'none',
        },
        dropdownList: {
            listStyle: 'none',
            padding: '0.5rem 0',
            margin: '0.5rem 0 0 0',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            position: 'relative', // Changed from absolute to flow naturally in sidebar or use absolute if preferred
            zIndex: 30,
            width: '100%',
            maxHeight: '200px', // Limit height
            overflowY: 'auto'
        },
        dropdownItem: (index) => ({
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: lectureHovered(index) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            backgroundColor: lectureHovered(index) ? 'var(--color-bg-app)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease',
        }),
        // Recent Chats
        recentSection: {
            flex: 1,
            overflowY: 'auto',
            marginRight: '-0.5rem', // Optical adjustment for scrollbar
            paddingRight: '0.5rem',
            marginTop: '1rem',
        },
        sectionLabel: {
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '0.5rem',
            paddingLeft: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: isOpen ? 'block' : 'none',
        },
        recentList: {
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem', // Tighter list
        },
        recentItem: (index) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: listHovered(index) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            transition: 'all 0.15s ease',
            backgroundColor: listHovered(index) ? 'var(--color-bg-app)' : 'transparent',
            position: 'relative',
        }),
        chatIcon: {
            fontSize: '1rem',
            opacity: 0.6,
        },
        chatTitle: {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s',
            fontWeight: 400
        },
        // Bottom Section
        bottomSection: {
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-border)',
        },
        actionButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: isKBButtonHovered ? 'var(--color-accent)' : 'transparent',
            border: 'none',
            padding: isOpen ? '0.625rem 0.75rem' : '0.75rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: isKBButtonHovered ? 'white' : 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            justifyContent: isOpen ? 'flex-start' : 'center',
            transition: 'all 0.2s',
        },
        quizActionButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: isQuizButtonHovered ? 'var(--color-accent)' : 'transparent',
            border: 'none',
            padding: isOpen ? '0.625rem 0.75rem' : '0.75rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: isQuizButtonHovered ? 'white' : 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            justifyContent: isOpen ? 'flex-start' : 'center',
            transition: 'all 0.2s',
        },
        actionText: {
            display: isOpen ? 'block' : 'none',
        },
        // Profile
        profileSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            transition: 'background 0.2s',
            cursor: 'pointer',
            backgroundColor: isProfileHovered ? 'var(--color-bg-app)' : 'transparent',
        },
        avatar: {
            width: '2rem',
            height: '2rem',
            borderRadius: 'var(--radius-sm)', // Squircle avatar
            backgroundColor: 'var(--color-primary)',
            background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
            color: 'var(--color-text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
        roleToggle: {
            display: isOpen ? 'flex' : 'none',
            flexDirection: 'column',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s',
        },
        roleName: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
        },
        switchLink: {
            background: 'none',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            fontSize: '0.75rem',
            color: isSwitchHovered ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            cursor: 'pointer',
            textDecoration: 'none',
        }
    };



    return (
        <aside style={styles.sidebar}>
            {/* Top Section: Header & New Chat */}
            <div style={styles.topSection}>
                <div style={styles.headerRow}>
                    <div style={styles.brandTitle}>
                        Lummina AI
                    </div>
                    <button
                        style={styles.menuButton}
                        title={isOpen ? "Collapse" : "Expand"}
                        onClick={() => { }} // In a real app this would trigger the parent's toggle
                        onMouseEnter={() => setIsMenuHovered(true)}
                        onMouseLeave={() => setIsMenuHovered(false)}
                    >
                        {/* Using simpler SVG for cleaner look */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                        onClick={onNewChat}
                        style={styles.newChatButton}
                        onMouseEnter={() => setIsNewChatHovered(true)}
                        onMouseLeave={() => setIsNewChatHovered(false)}
                    >
                        <span style={styles.plusIcon}>+</span>
                        <span style={styles.buttonText}>{UI_TEXT.SIDEBAR.NEW_CHAT}</span>
                    </button>

                    {/* Lecture Selection Button */}
                    <button
                        onClick={() => setIsLectureDropdownOpen(!isLectureDropdownOpen)}
                        style={styles.selectLectureButton}
                        onMouseEnter={() => setIsLectureButtonHovered(true)}
                        onMouseLeave={() => setIsLectureButtonHovered(false)}
                        title={isOpen ? "" : "Select Lecture"}
                    >
                        <span style={{ fontSize: '1.2rem' }}>
                            {selectedLecture ? '📖' : '📂'}
                        </span>
                        <span style={styles.buttonText}>
                            {selectedLecture ? formatLectureName(selectedLecture) : 'Select Lecture'}
                        </span>
                        {/* Chevron */}
                        {isOpen && (
                            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{
                                        transform: isLectureDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </span>
                        )}
                    </button>

                    {/* Lecture Dropdown List */}
                    {isLectureDropdownOpen && isOpen && (
                        <div style={styles.dropdownList}>
                            {lectures.length > 0 ? (
                                lectures.map((lecture, index) => (
                                    <div
                                        key={lecture}
                                        style={styles.dropdownItem(index)}
                                        onClick={() => {
                                            if (onSelectLecture) onSelectLecture(lecture);
                                            setIsLectureDropdownOpen(false);
                                        }}
                                        onMouseEnter={() => setHoveredLectureIndex(index)}
                                        onMouseLeave={() => setHoveredLectureIndex(null)}
                                    >
                                        <span>{selectedLecture === lecture ? '●' : '○'}</span>
                                        <span>{formatLectureName(lecture)}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '0.5rem 1rem', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                                    No lectures found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Chats Section */}
            <div style={styles.recentSection}>
                {isOpen && <div style={styles.sectionLabel}>{UI_TEXT.SIDEBAR.RECENT_TITLE}</div>}
                <ul style={styles.recentList}>
                    {recentChats.map((chat, index) => (
                        <li
                            key={index}
                            style={styles.recentItem(index)}
                            onMouseEnter={() => setHoveredRecentIndex(index)}
                            onMouseLeave={() => setHoveredRecentIndex(null)}
                            title={!isOpen ? chat : ''}
                        >
                            <span style={styles.chatIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </span>
                            {isOpen && <span style={styles.chatTitle}>{chat}</span>}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Bottom Section: Role & Interactions */}
            <div style={styles.bottomSection}>
                {currentRole === ROLES.TEACHER && (
                    <button
                        onClick={onNavigateKB}
                        style={styles.actionButton}
                        onMouseEnter={() => setIsKBButtonHovered(true)}
                        onMouseLeave={() => setIsKBButtonHovered(false)}
                        title={!isOpen ? UI_TEXT.SIDEBAR.KB_LINK : ''}
                    >
                        <span>📚</span>
                        <span style={styles.actionText}>{UI_TEXT.SIDEBAR.KB_LINK}</span>
                    </button>
                )}

                <button
                    onClick={onNavigateQuiz}
                    style={styles.quizActionButton}
                    onMouseEnter={() => setIsQuizButtonHovered(true)}
                    onMouseLeave={() => setIsQuizButtonHovered(false)}
                    title={!isOpen ? "Quiz Mode" : ''}
                >
                    <span>🧩</span>
                    <span style={styles.actionText}>Quiz Mode</span>
                </button>

                <div
                    style={styles.profileSection}
                    onMouseEnter={() => setIsProfileHovered(true)}
                    onMouseLeave={() => setIsProfileHovered(false)}
                >
                    <div style={styles.avatar}>
                        {currentRole === ROLES.TEACHER ? 'T' : 'S'}
                    </div>
                    {isOpen && (
                        <div style={styles.roleToggle}>
                            <span style={styles.roleName}>
                                {currentRole === ROLES.TEACHER ? 'Teacher' : 'Student'}
                            </span>
                            {/* <button
                                style={styles.switchLink}
                                onClick={onToggleRole}
                                onMouseEnter={() => setIsSwitchHovered(true)}
                                onMouseLeave={() => setIsSwitchHovered(false)}
                            >
                                Switch Role
                            </button> */}
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
    onToggleRole: PropTypes.func,
    onNewChat: PropTypes.func,
    onNavigateKB: PropTypes.func,
    onNavigateQuiz: PropTypes.func,
};





export default Sidebar;
