import React, { useState, useEffect } from 'react';
import { gradeQuizResponses } from '../../services/gemini';

const QuizReview = ({ quiz, answers, lectureId, onExit }) => {
    const [gradingResults, setGradingResults] = useState(null);
    const [isGrading, setIsGrading] = useState(true);

    useEffect(() => {
        const performGrading = async () => {
            setIsGrading(true);
            try {
                const results = await gradeQuizResponses(quiz, answers, lectureId);
                setGradingResults(results);
            } catch (error) {
                console.error("Grading failed:", error);
                // Set a basic fallback
                setGradingResults({
                    overallScore: { percentage: 0, grade: 'N/A', earned: 0, total: 0 },
                    questionGrades: [],
                    overallFeedback: {
                        strengths: [],
                        areasForImprovement: ["Grading system encountered an error"],
                        studyRecommendations: []
                    }
                });
            } finally {
                setIsGrading(false);
            }
        };

        performGrading();
    }, [quiz, answers, lectureId]);

    if (isGrading) {
        return <GradingLoader />;
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={styles.title}>Assessment Results</h1>
                <button onClick={onExit} style={styles.exitBtn}>Exit</button>
            </header>

            <div style={styles.content}>
                {/* Score Summary Card */}
                <div style={styles.scoreCard}>
                    <div style={styles.gradeCircle}>
                        <div style={styles.gradeText}>{gradingResults.overallScore.grade}</div>
                        <div style={styles.percentageText}>
                            {gradingResults.overallScore.percentage.toFixed(1)}%
                        </div>
                    </div>
                    <div style={styles.scoreDetails}>
                        <h2 style={styles.quizTitle}>{quiz.title}</h2>
                        <div style={styles.scoreBreakdown}>
                            <div style={styles.scoreItem}>
                                <span style={styles.scoreLabel}>Points Earned</span>
                                <span style={styles.scoreValue}>
                                    {gradingResults.overallScore.earned} / {gradingResults.overallScore.total}
                                </span>
                            </div>
                            {gradingResults.sectionScores && (
                                <>
                                    <div style={styles.scoreItem}>
                                        <span style={styles.scoreLabel}>Part A (MCQ)</span>
                                        <span style={styles.scoreValue}>
                                            {gradingResults.sectionScores.partA.earned} / {gradingResults.sectionScores.partA.total}
                                        </span>
                                    </div>
                                    <div style={styles.scoreItem}>
                                        <span style={styles.scoreLabel}>Part B (Short)</span>
                                        <span style={styles.scoreValue}>
                                            {gradingResults.sectionScores.partB.earned} / {gradingResults.sectionScores.partB.total}
                                        </span>
                                    </div>
                                    {gradingResults.sectionScores.partC && (
                                        <div style={styles.scoreItem}>
                                            <span style={styles.scoreLabel}>Part C (Essay)</span>
                                            <span style={styles.scoreValue}>
                                                {gradingResults.sectionScores.partC.earned} / {gradingResults.sectionScores.partC.total}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overall Feedback Card */}
                {gradingResults.overallFeedback && (
                    <div style={styles.feedbackCard}>
                        <h3 style={styles.feedbackTitle}>Overall Performance</h3>

                        {gradingResults.detailedAnalysis?.encouragement && (
                            <p style={styles.encouragement}>
                                {gradingResults.detailedAnalysis.encouragement}
                            </p>
                        )}

                        <div style={styles.feedbackGrid}>
                            {gradingResults.overallFeedback.strengths?.length > 0 && (
                                <div style={styles.feedbackSection}>
                                    <h4 style={styles.feedbackSectionTitle}>✓ Strengths</h4>
                                    <ul style={styles.feedbackList}>
                                        {gradingResults.overallFeedback.strengths.map((strength, i) => (
                                            <li key={i} style={styles.feedbackListItem}>{strength}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {gradingResults.overallFeedback.areasForImprovement?.length > 0 && (
                                <div style={styles.feedbackSection}>
                                    <h4 style={styles.feedbackSectionTitle}>→ Areas for Growth</h4>
                                    <ul style={styles.feedbackList}>
                                        {gradingResults.overallFeedback.areasForImprovement.map((area, i) => (
                                            <li key={i} style={styles.feedbackListItem}>{area}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {gradingResults.overallFeedback.conceptsToReview?.length > 0 && (
                            <div style={styles.conceptsBox}>
                                <h4 style={styles.conceptsTitle}>📚 Concepts to Review</h4>
                                <div style={styles.conceptTags}>
                                    {gradingResults.overallFeedback.conceptsToReview.map((concept, i) => (
                                        <span key={i} style={styles.conceptTag}>{concept}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Individual Question Reviews */}
                <div style={styles.questionsList}>
                    <h3 style={styles.sectionHeader}>Question-by-Question Review</h3>

                    {gradingResults.questionGrades.map((grade, index) => (
                        <div key={grade.id} style={styles.questionCard}>
                            <div style={styles.questionHeader}>
                                <div style={styles.questionHeaderLeft}>
                                    <span style={styles.questionNumber}>Q{index + 1}</span>
                                    <span style={styles.questionType}>{grade.type.toUpperCase()}</span>
                                </div>
                                <div style={styles.scoreChip}>
                                    <span style={styles.scoreEarned}>{grade.score}</span>
                                    <span style={styles.scoreSeparator}>/</span>
                                    <span style={styles.scoreMax}>{grade.maxScore}</span>
                                </div>
                            </div>

                            <h3 style={styles.questionText}>{grade.question}</h3>

                            <div style={styles.answerSection}>
                                {grade.type === 'mcq' ? (
                                    <MCQGradedFeedback grade={grade} />
                                ) : (
                                    <TextGradedFeedback grade={grade} />
                                )}
                            </div>

                            {/* Detailed Feedback */}
                            {grade.feedback && (
                                <div style={styles.detailedFeedback}>
                                    <div style={styles.feedbackSummary}>
                                        <span style={styles.mentorLabel}>Feedback:</span>
                                        <p style={styles.feedbackText}>{grade.feedback.summary}</p>
                                    </div>

                                    {grade.feedback.strengths?.length > 0 && (
                                        <div style={styles.feedbackPoints}>
                                            <strong style={styles.pointsTitle}>What you did well:</strong>
                                            <ul style={styles.pointsList}>
                                                {grade.feedback.strengths.map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {grade.feedback.improvements?.length > 0 && (
                                        <div style={styles.feedbackPoints}>
                                            <strong style={styles.pointsTitle}>How to improve:</strong>
                                            <ul style={styles.pointsList}>
                                                {grade.feedback.improvements.map((imp, i) => (
                                                    <li key={i}>{imp}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Rubric Breakdown for Short/Essay */}
                                    {grade.rubricBreakdown && grade.type !== 'mcq' && (
                                        <div style={styles.rubricBox}>
                                            <strong style={styles.rubricTitle}>Score Breakdown:</strong>
                                            <div style={styles.rubricItems}>
                                                {Object.entries(grade.rubricBreakdown).map(([criterion, score]) => (
                                                    <div key={criterion} style={styles.rubricItem}>
                                                        <span style={styles.rubricLabel}>
                                                            {criterion.charAt(0).toUpperCase() + criterion.slice(1)}
                                                        </span>
                                                        <div style={styles.rubricBar}>
                                                            <div
                                                                style={{
                                                                    ...styles.rubricFill,
                                                                    width: `${(score / 10) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span style={styles.rubricScore}>{score}/10</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const GradingLoader = () => (
    <div style={styles.loaderContainer}>
        <div style={styles.loaderRing}></div>
        <h3 style={styles.loaderText}>Grading your responses...</h3>
        <p style={styles.loaderSubtext}>Our AI is carefully reviewing your answers</p>
    </div>
);

const MCQGradedFeedback = ({ grade }) => {
    return (
        <div style={styles.mcqFeedback}>
            <div style={styles.answerComparison}>
                <div style={styles.answerBox}>
                    <span style={styles.answerBoxLabel}>Your Answer:</span>
                    <p style={{
                        ...styles.answerBoxText,
                        color: grade.isCorrect ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                        {grade.isCorrect ? '✓ ' : '✗ '}
                        {grade.userAnswer}
                    </p>
                </div>

                {!grade.isCorrect && (
                    <div style={styles.answerBox}>
                        <span style={styles.answerBoxLabel}>Correct Answer:</span>
                        <p style={{ ...styles.answerBoxText, color: 'var(--color-success)' }}>
                            ✓ {grade.correctAnswer}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const TextGradedFeedback = ({ grade }) => (
    <div style={styles.textFeedback}>
        <div style={styles.textAnswer}>
            <h4 style={styles.answerLabel}>Your Answer:</h4>
            <p style={styles.answerText}>
                {grade.userAnswer || <span style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>No answer provided</span>}
            </p>
        </div>

        {grade.feedback?.keyPointsCovered?.length > 0 && (
            <div style={styles.keyPointsBox}>
                <h4 style={styles.keyPointsTitle}>✓ Key Points You Covered:</h4>
                <ul style={styles.keyPointsList}>
                    {grade.feedback.keyPointsCovered.map((point, i) => (
                        <li key={i} style={styles.keyPointCovered}>{point}</li>
                    ))}
                </ul>
            </div>
        )}

        {grade.feedback?.keyPointsMissed?.length > 0 && (
            <div style={styles.keyPointsBox}>
                <h4 style={styles.keyPointsTitle}>→ Key Points to Include:</h4>
                <ul style={styles.keyPointsList}>
                    {grade.feedback.keyPointsMissed.map((point, i) => (
                        <li key={i} style={styles.keyPointMissed}>{point}</li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

const styles = {
    container: {
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--color-bg-app)',
        color: 'var(--color-text-primary)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
    },
    header: {
        padding: '1.5rem 3rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)'
    },
    exitBtn: {
        padding: '0.6rem 1.2rem',
        borderRadius: '6px',
        border: '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500'
    },
    content: {
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
    },

    // Score Card
    scoreCard: {
        padding: '2.5rem',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        display: 'flex',
        gap: '2.5rem',
        alignItems: 'center'
    },
    gradeCircle: {
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(var(--primary-rgb), 0.05))',
        border: '3px solid var(--color-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    gradeText: {
        fontSize: '3rem',
        fontWeight: '700',
        color: 'var(--color-primary)',
        lineHeight: 1
    },
    percentageText: {
        fontSize: '1rem',
        color: 'var(--color-text-secondary)',
        fontWeight: '600',
        marginTop: '0.25rem'
    },
    scoreDetails: {
        flex: 1
    },
    quizTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        color: 'var(--color-text-primary)'
    },
    scoreBreakdown: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem'
    },
    scoreItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    },
    scoreLabel: {
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)',
        fontWeight: '600'
    },
    scoreValue: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)'
    },

    // Feedback Card
    feedbackCard: {
        padding: '2rem',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)'
    },
    feedbackTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: 'var(--color-text-primary)'
    },
    encouragement: {
        fontSize: '1rem',
        color: 'var(--color-text-secondary)',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: 'rgba(var(--primary-rgb), 0.05)',
        borderLeft: '3px solid var(--color-primary)',
        borderRadius: '4px'
    },
    feedbackGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem'
    },
    feedbackSection: {
        padding: '1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    feedbackSectionTitle: {
        fontSize: '0.9rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
        color: 'var(--color-text-primary)'
    },
    feedbackList: {
        margin: 0,
        paddingLeft: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    feedbackListItem: {
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.5'
    },
    conceptsBox: {
        padding: '1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    conceptsTitle: {
        fontSize: '0.9rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
        color: 'var(--color-text-primary)'
    },
    conceptTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem'
    },
    conceptTag: {
        padding: '0.4rem 0.8rem',
        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
        color: 'var(--color-primary)',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontWeight: '500'
    },

    // Questions List
    questionsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
    },
    sectionHeader: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        marginBottom: '0.5rem'
    },
    questionCard: {
        padding: '2rem',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
    },
    questionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
    },
    questionHeaderLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    questionNumber: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase'
    },
    questionType: {
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0.2rem 0.6rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
        color: 'var(--color-primary)',
        textTransform: 'uppercase'
    },
    scoreChip: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.25rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    scoreEarned: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--color-primary)'
    },
    scoreSeparator: {
        fontSize: '1rem',
        color: 'var(--color-text-tertiary)'
    },
    scoreMax: {
        fontSize: '1rem',
        fontWeight: '500',
        color: 'var(--color-text-secondary)'
    },
    questionText: {
        fontSize: '1.15rem',
        fontWeight: '500',
        marginBottom: '1.5rem',
        lineHeight: '1.5',
        color: 'var(--color-text-primary)'
    },
    answerSection: {
        marginBottom: '1.5rem'
    },

    // MCQ Feedback
    mcqFeedback: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    answerComparison: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
    },
    answerBox: {
        padding: '1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    answerBoxLabel: {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: '0.5rem',
        letterSpacing: '0.05em'
    },
    answerBoxText: {
        fontSize: '1rem',
        fontWeight: '500',
        lineHeight: '1.5',
        margin: 0
    },

    // Text Feedback
    textFeedback: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    textAnswer: {
        padding: '1.25rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    answerLabel: {
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: '0.75rem',
        letterSpacing: '0.05em'
    },
    answerText: {
        fontSize: '1rem',
        lineHeight: '1.6',
        color: 'var(--color-text-primary)',
        whiteSpace: 'pre-wrap'
    },
    keyPointsBox: {
        padding: '1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    keyPointsTitle: {
        fontSize: '0.85rem',
        fontWeight: '600',
        marginBottom: '0.75rem',
        color: 'var(--color-text-primary)'
    },
    keyPointsList: {
        margin: 0,
        paddingLeft: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    keyPointCovered: {
        fontSize: '0.9rem',
        color: 'var(--color-success)',
        lineHeight: '1.5'
    },
    keyPointMissed: {
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.5'
    },

    // Detailed Feedback
    detailedFeedback: {
        padding: '1.25rem',
        backgroundColor: 'rgba(var(--primary-rgb), 0.03)',
        borderLeft: '3px solid var(--color-primary)',
        borderRadius: '0 8px 8px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    feedbackSummary: {
        marginBottom: '0.5rem'
    },
    mentorLabel: {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: '600',
        color: 'var(--color-primary)',
        marginBottom: '0.5rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    feedbackText: {
        fontSize: '0.95rem',
        lineHeight: '1.6',
        color: 'var(--color-text-secondary)',
        margin: 0
    },
    feedbackPoints: {
        marginTop: '0.5rem'
    },
    pointsTitle: {
        fontSize: '0.85rem',
        color: 'var(--color-text-primary)',
        display: 'block',
        marginBottom: '0.5rem'
    },
    pointsList: {
        margin: 0,
        paddingLeft: '1.25rem',
        color: 'var(--color-text-secondary)',
        fontSize: '0.9rem',
        lineHeight: '1.6',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
    },

    // Rubric
    rubricBox: {
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    rubricTitle: {
        fontSize: '0.85rem',
        color: 'var(--color-text-primary)',
        display: 'block',
        marginBottom: '0.75rem'
    },
    rubricItems: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
    },
    rubricItem: {
        display: 'grid',
        gridTemplateColumns: '100px 1fr 50px',
        alignItems: 'center',
        gap: '1rem'
    },
    rubricLabel: {
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
        fontWeight: '500'
    },
    rubricBar: {
        height: '8px',
        backgroundColor: 'var(--color-border)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    rubricFill: {
        height: '100%',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.5s ease'
    },
    rubricScore: {
        fontSize: '0.85rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        textAlign: 'right'
    },

    // Loader
    loaderContainer: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-app)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
    },
    loaderRing: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '4px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 1s linear infinite',
        marginBottom: '1.5rem'
    },
    loaderText: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        marginBottom: '0.5rem'
    },
    loaderSubtext: {
        fontSize: '0.9rem',
        color: 'var(--color-text-tertiary)'
    }
};

// Add keyframes for loader
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`, styleSheet.cssRules.length);

export default QuizReview;