import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { generateQuiz } from '../../services/gemini';
import defaultQuizData from '../../data/quizData.json';
import { encode } from '@toon-format/toon';
import QuizReview from './QuizReview';

// --- MAIN COMPONENT ---
const QuizModeScreen = ({ onExit }) => {
    const { addToast } = useToast();
    const [lectures, setLectures] = useState([]);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [finalAnswers, setFinalAnswers] = useState({});

    // Initial Load & Style Injection
    useEffect(() => {
        // Inject global keyframes locally for this screen
        const styleId = 'quiz-minimal-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .quiz-card-hover {
                    transition: transform 0.2s ease, border-color 0.2s ease;
                }
                .quiz-card-hover:hover {
                    border-color: var(--color-primary);
                    transform: translateY(-2px);
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }

        // Load Lectures Pattern
        const modules = import.meta.glob('/src/assets/*/*');
        const foundLectures = new Set();
        for (const path in modules) {
            const parts = path.split('/');
            const assetIndex = parts.indexOf('assets');
            if (assetIndex !== -1 && parts[assetIndex + 1]) {
                foundLectures.add(parts[assetIndex + 1]);
            }
        }
        setLectures(Array.from(foundLectures).sort());
    }, []);

    const handleStartQuiz = async (lecture) => {
        const displayTitle = lecture
            .replace(/_/g, ' ')
            .replace(/leacture/i, 'Lecture')
            .replace(/\b\w/g, c => c.toUpperCase());

        setIsLoading(true);

        try {
            const generatedData = await generateQuiz(lecture);
            // Ensure title exists
            const title = generatedData.title || displayTitle;

            // Flatten questions for the stepped interface
            const items = [];
            if (generatedData.partA) items.push(...generatedData.partA.map(q => ({ ...q, type: 'mcq' })));
            if (generatedData.partB) items.push(...generatedData.partB.map(q => ({ ...q, type: 'short' })));
            if (generatedData.partC) items.push(...generatedData.partC.map(q => ({ ...q, type: 'essay' })));

            if (items.length === 0) throw new Error("No questions generated");

            setActiveQuiz({
                title: title,
                lectureId: lecture,
                questions: items
            });
            addToast("Quiz Ready", "success");
        } catch (error) {
            console.error("Quiz generation error:", error);
            addToast("Offline Mode Active", "warning");

            // Fallback flatten
            const items = [];
            if (defaultQuizData.partA) items.push(...defaultQuizData.partA.map(q => ({ ...q, type: 'mcq' })));
            if (defaultQuizData.partB) items.push(...defaultQuizData.partB.map(q => ({ ...q, type: 'short' })));

            setActiveQuiz({
                title: displayTitle,
                lectureId: lecture,
                questions: items
            });
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER ---
    if (isLoading) return <LoadingScreen />;

    if (activeQuiz) return <StepperQuizInterface
        quiz={activeQuiz}
        onClose={() => {
            setActiveQuiz(null);
            setShowReview(false);
        }}
        onExit={onExit}
        onReview={(answers) => {
            setFinalAnswers(answers);
            setShowReview(true);
        }}
        showReview={showReview}
    />;

    return <LectureSelection lectures={lectures} onSelect={handleStartQuiz} onExit={onExit} />;
};

// --- SUB-SCREENS ---

const LoadingScreen = () => (
    <div style={styles.centerContainer}>
        <div style={styles.loaderRing}></div>
        <h3 style={styles.loadingText}>Initializing Knowledge Neural Net...</h3>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-tertiary)' }}>Analyzing lecture patterns & generating assessment vectors</p>
    </div>
);

const LectureSelection = ({ lectures, onSelect, onExit }) => {
    return (
        <div style={styles.pageContainer}>


            <header style={styles.header}>
                <button onClick={onExit} style={styles.backBtn}>
                    <span style={{ fontSize: '1.2rem' }}>←</span> Exit Focus Mode
                </button>
            </header>

            <div style={styles.contentWrapper}>
                <div style={styles.heroSection}>
                    <h1 style={styles.mainTitle}>Knowledge Assessment</h1>
                    <p style={styles.subTitle}>Select a neural module to begin your evaluation.</p>
                </div>

                <div style={styles.grid}>
                    {lectures.map((lecture, i) => (
                        <div
                            key={lecture}
                            style={{ ...styles.card, animationDelay: `${i * 0.1}s` }}
                            onClick={() => onSelect(lecture)}
                            className="quiz-card-hover"
                        >

                            <div style={styles.cardContent}>
                                <div style={styles.iconBox}>
                                    <span style={styles.cardIcon}>⚡</span>
                                </div>
                                <div>
                                    <h3 style={styles.cardTitle}>
                                        {lecture.replace(/_/g, ' ').replace(/leacture/i, 'Lecture')}
                                    </h3>
                                    <span style={styles.cardMeta}>Adaptive Difficulty • AI Generated</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* Placeholder to show grid effect even with 1 item */}
                    {lectures.length === 0 && <p style={{ color: 'var(--color-text-tertiary)' }}>No lecture modules found.</p>}
                </div>
            </div>
        </div>
    );
};



// --- STEPPER QUIZ ENGINE ---

const StepperQuizInterface = ({ quiz, onClose, onExit, onReview, showReview }) => {
    const { addToast } = useToast();
    const [answers, setAnswers] = useState({});
    // State for new submission flow
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const total = quiz.questions.length;
    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / total) * 100;

    const handleAttemptFinish = () => {
        setShowSubmitModal(true);
    };

    const confirmSubmit = async () => {
        setShowSubmitModal(false);
        setIsSubmitting(true);

        // Simulate review time (5-10 seconds)
        const delay = Math.floor(Math.random() * 5000) + 5000;
        await new Promise(resolve => setTimeout(resolve, delay));

        await saveToonResult();
        setIsSubmitting(false);
        addToast("Assessment Completed", "success");
        onReview(answers);
    };

    const saveToonResult = async () => {
        try {
            const resultData = {
                quizTitle: quiz.title,
                timestamp: new Date().toISOString(),
                totalQuestions: total,
                responses: quiz.questions.map(q => {
                    const answer = answers[q.id];
                    let formattedAnswer = answer;

                    if (q.type === 'mcq') {
                        // For MCQs, answers is the index
                        const idx = parseInt(answer);
                        if (!isNaN(idx) && q.options && q.options[idx]) {
                            formattedAnswer = `(${String.fromCharCode(65 + idx)}) ${q.options[idx]}`;
                        }
                    }

                    return {
                        id: q.id,
                        question: q.question,
                        type: q.type,
                        userAnswer: formattedAnswer || "No Answer"
                    };
                })
            };

            const toonContent = encode(resultData);

            // Send to local API to save to file
            const response = await fetch('/api/save-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: toonContent
            });

            if (!response.ok) {
                throw new Error('Server failed to save file');
            }

            addToast("Results saved to project folder", "success");

        } catch (error) {
            console.error("Failed to save TOON file:", error);
            addToast("Failed to save results file", "error");
        }
    };

    // Removed finishQuiz as it's replaced by confirmSubmit logic

    const updateAnswer = (qId, val) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    if (isSubmitting) {
        return <ReviewingLoader />;
    }

    if (showReview) {
        return <QuizReview quiz={quiz} answers={answers} lectureId={quiz.lectureId} onExit={onClose} />;
    }

    return (
        <div style={styles.quizContainer}>
            {/* Top Bar */}
            <div style={styles.quizHeader}>
                <button onClick={onExit} style={styles.ghostBtn}>✕ End Session</button>
                <div style={styles.progressSection}>
                    <div style={styles.progressContainer}>
                        <div style={{ ...styles.progressBar, width: `${progress}%` }}></div>
                    </div>
                    <span style={styles.stepIndicator}>{answeredCount} <span style={{ opacity: 0.5 }}>/ {total}</span></span>
                </div>
            </div>

            {/* Question Area - Scrollable List */}
            <div style={styles.questionWrapper}>
                <div style={styles.scrollListContainer}>
                    {quiz.questions.map((question, index) => (
                        <div key={question.id} style={styles.questionCard}>
                            <div style={styles.cardHeader}>
                                <span style={styles.questionNumber}>Q{index + 1}</span>
                                <span style={styles.sectionTag}>{question.type.toUpperCase()}</span>
                            </div>

                            <h2 style={styles.questionText}>{question.question}</h2>

                            <div style={styles.inputArea}>
                                {question.type === 'mcq' && (
                                    <div style={styles.optionsGrid}>
                                        {question.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => updateAnswer(question.id, idx)}
                                                style={{
                                                    ...styles.optionBtn,
                                                    borderColor: answers[question.id] === idx ? 'var(--color-primary)' : 'var(--color-border)',
                                                    backgroundColor: answers[question.id] === idx ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                                    color: answers[question.id] === idx ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                                }}
                                                className="hover-card"
                                            >
                                                <span style={styles.optKey}>
                                                    {answers[question.id] === idx ? '●' : '○'}
                                                </span>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {(question.type === 'short' || question.type === 'essay') && (
                                    <textarea
                                        placeholder="Type your detailed answer here..."
                                        value={answers[question.id] || ''}
                                        onChange={(e) => updateAnswer(question.id, e.target.value)}
                                        style={styles.textArea}
                                    />
                                )}
                            </div>
                        </div>
                    ))}

                    <div style={styles.submitContainer}>
                        <button onClick={handleAttemptFinish} style={styles.submitBtn}>
                            Submit Assessment
                        </button>
                    </div>
                </div>
            </div>

            {showSubmitModal && (
                <SubmitConfirmationModal
                    onCancel={() => setShowSubmitModal(false)}
                    onConfirm={confirmSubmit}
                />
            )}
        </div>
    );
};

const SubmitConfirmationModal = ({ onCancel, onConfirm }) => {
    const [isChecked, setIsChecked] = useState(false);

    return (
        <div style={styles.modalBackdrop}>
            <div style={styles.modalCard}>
                <h2 style={styles.modalTitle}>Ready to submit?</h2>

                <div style={styles.honorCodeBox}>
                    <label style={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                            style={styles.checkbox}
                        />
                        <span style={styles.checkboxText}>
                            I understand that submitting this assessment will lock my answers for grading.
                            I confirm these are my own responses.
                        </span>
                    </label>
                </div>

                <div style={styles.modalActions}>
                    <button onClick={onCancel} style={styles.secondaryBtn}>
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isChecked}
                        style={{
                            ...styles.primaryBtn,
                            opacity: isChecked ? 1 : 0.5,
                            cursor: isChecked ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReviewingLoader = () => (
    <div style={styles.centerContainer}>
        {/* Custom C Loader */}
        <div style={styles.cLoaderContainer}>
            <svg width="80" height="80" viewBox="0 0 100 100" style={styles.svgLoader}>
                <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    style={styles.cCircle}
                />
            </svg>
        </div>

        <h3 style={styles.loadingText}>Reviewing your submission...</h3>
        <p style={{ marginTop: '0.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
            Hang tight! This shouldn't take too long.
        </p>
    </div>
);

const ResultScreen = ({ onClose }) => (
    <div style={styles.centerContainer}>
        <div style={styles.backgroundOrb} />
        <div style={styles.resultCard}>
            <div style={styles.resultIconWrapper}>
                <div style={styles.checkIcon}>✓</div>
            </div>
            <h2 style={styles.resultTitle}>Assessment Complete</h2>
            <p style={styles.resultText}>Your responses have been recorded in the neural database.</p>
            <div style={styles.resultStats}>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>Status</span>
                    <span style={styles.statValue}>Submitted</span>
                </div>
            </div>
            <button onClick={onClose} style={styles.primaryBtn}>Return to Dashboard</button>
        </div>
    </div>
);


// --- STYLES (Professional Minimalist UI) ---
const styles = {
    // ... existing styles ...
    // Layouts
    pageContainer: {
        minHeight: '100vh',
        width: '100vw',
        padding: '0',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg-app)', // Standard app background
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
    },
    // Removed backgroundOrb
    centerContainer: {
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg-surface)' // Ensuring consistent background
    },
    quizContainer: {
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-app)',
        color: 'var(--color-text-primary)',
        overflow: 'hidden'
    },
    contentWrapper: {
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '3rem 2rem'
    },

    // Header
    header: {
        padding: '1.5rem 3rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-bg-surface)'
    },
    backBtn: {
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'background 0.2s',
        position: 'relative',
        zIndex: 99999, // Ensure it's on top of everything
        pointerEvents: 'auto'
    },

    // Hero
    heroSection: {
        marginBottom: '3rem',
        textAlign: 'left'
    },
    mainTitle: {
        fontSize: '2.5rem', // Standard H1 size
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.02em',
    },
    subTitle: {
        fontSize: '1.1rem',
        color: 'var(--color-text-secondary)',
        fontWeight: '400'
    },

    // Grid
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
        width: '100%'
    },
    card: {
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px', // Standard radius
        padding: '1.5rem',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column', // Changed to column for better alignment
        alignItems: 'flex-start',
        gap: '1rem'
    },
    // Removed cardGlow
    cardContent: {
        width: '100%'
    },
    iconBox: {
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        backgroundColor: 'var(--color-bg-app)',
        display: 'flex', // Re-enabled
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)'
    },
    cardIcon: { fontSize: '1.2rem' },
    cardTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        marginBottom: '0.25rem',
        lineHeight: '1.4'
    },
    cardMeta: {
        fontSize: '0.85rem',
        color: 'var(--color-text-tertiary)',
        display: 'block'
    },

    // Quiz Views
    quizHeader: {
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-surface)'
    },
    progressSection: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    progressBar: {
        height: '4px',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.3s ease',
        borderRadius: '2px'
    },
    progressContainer: {
        flex: 1,
        backgroundColor: 'var(--color-border)',
        height: '4px',
        borderRadius: '2px',
        overflow: 'hidden'
    },
    stepIndicator: {
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        fontWeight: '500',
        fontVariantNumeric: 'tabular-nums',
        minWidth: '50px',
        textAlign: 'right'
    },
    ghostBtn: {
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500'
    },

    // Question Area
    questionWrapper: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '2rem 1rem', // Reduced side padding for mobile friendliness, adjusted top/bottom
        backgroundColor: 'var(--color-bg-app)',
        overflowY: 'auto'
    },
    scrollListContainer: {
        maxWidth: '800px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        paddingBottom: '4rem' // Space for scrolling past last element
    },
    // Removed slideInContainer as we are listing all
    questionCard: {
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '2rem',
    },
    // ...
    submitContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '2rem',
        marginBottom: '2rem'
    },
    submitBtn: {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-bg-surface)',
        border: 'none',
        padding: '1rem 3rem',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
        transition: 'transform 0.2s',
    },
    cardHeader: {
        display: 'flex', // Renamed usage in component to match this or update component to use questionHeader
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem'
    },
    // Added badges style
    questionNumber: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase'
    },
    sectionTag: { // Reusing for Type badge
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.2rem 0.6rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(var(--primary-rgb), 0.1)', // Ensure primary-rgb variable exists or use fallback
        color: 'var(--color-primary)',
        textTransform: 'uppercase'
    },
    questionText: {
        fontSize: '1.25rem', // Match review
        fontWeight: '500',
        lineHeight: '1.5',
        marginBottom: '2rem',
        color: 'var(--color-text-primary)',
    },
    inputArea: { width: '100%' },

    // Inputs
    optionsGrid: {
        display: 'flex', // Changed to flex col for list look
        flexDirection: 'column',
        gap: '1rem' // Increased gap
    },
    optionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'transparent', // Transparent by default inside card
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        textAlign: 'left',
        transition: 'all 0.1s',
    },
    optKey: {
        fontSize: '1.2rem',
        width: '24px',
        textAlign: 'center',
        fontWeight: '400',
        border: 'none' // Remove border from key, just text
    },
    textArea: {
        width: '100%',
        minHeight: '200px',
        padding: '1.25rem',
        borderRadius: '8px',
        backgroundColor: 'var(--color-bg-app)', // Contrast against card
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        fontSize: '1rem',
        lineHeight: '1.6',
        fontFamily: 'inherit',
        resize: 'none',
        outline: 'none'
    },

    // Footer
    footer: {
        padding: '1.5rem 3rem',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-surface)',
    },
    navBtn: {
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        fontWeight: '500'
    },
    primaryBtn: {
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-bg-surface)', // High contrast text on primary button
        border: '1px solid transparent',
        padding: '0.6rem 1.5rem',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s'
    },
    secondaryBtn: {
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        padding: '0.6rem 1.5rem',
        borderRadius: '6px',
        fontSize: '0.9rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '1rem' // Added spacing
    },

    // Result
    resultCard: {
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: 'var(--shadow-lg)' // Added shadow for popped effect
    },
    resultIconWrapper: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'rgba(var(--color-success-rgb, 16, 185, 129), 0.1)', // Fixed RGBA
        color: 'var(--color-success)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem auto',
        border: '1px solid rgba(var(--color-success-rgb, 16, 185, 129), 0.2)' // Fixed RGBA
    },
    checkIcon: {
        fontSize: '2.5rem',
    },
    resultTitle: {
        fontSize: '1.75rem',
        marginBottom: '0.5rem',
        color: 'var(--color-text-primary)',
        fontWeight: '600'
    },
    resultText: {
        fontSize: '1rem',
        color: 'var(--color-text-secondary)',
        marginBottom: '2rem'
    },
    resultStats: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        justifyContent: 'center'
    },
    statItem: {
        backgroundColor: 'var(--color-bg-app)',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        textAlign: 'center'
    },
    statLabel: {
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)',
        display: 'block',
        marginBottom: '0.25rem'
    },
    statValue: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)'
    },

    // Loading & Modal
    modalBackdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalCard: {
        backgroundColor: 'var(--color-bg-surface)',
        padding: '2rem',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-float)' // Stronger shadow
    },
    modalTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        color: 'var(--color-text-primary)'
    },
    honorCodeBox: {
        backgroundColor: 'var(--color-bg-app)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '1px solid var(--color-border)'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        cursor: 'pointer'
    },
    checkbox: {
        marginTop: '0.25rem',
        accentColor: 'var(--color-primary)',
        width: '16px',
        height: '16px'
    },
    checkboxText: {
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.4'
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '0.5rem'
    },

    // Custom Loader C
    cLoaderContainer: {
        marginBottom: '1.5rem',
        animation: 'spin 1.5s linear infinite', // Subtle rotation or adjust as needed
    },
    svgLoader: {
        transform: 'rotate(-90deg)', // Initial orientation
    },
    cCircle: {
        strokeDasharray: '200', // Create the gap for "C" shape approx
        strokeDashoffset: '50',
    },
    // Standard Loading
    loaderRing: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem',
    },
    loadingText: {
        fontSize: '1.25rem', // Slightly larger
        fontWeight: '600',
        color: 'var(--color-text-primary)'
    }
};

export default QuizModeScreen;
