import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { useSubjects } from '../../context/SubjectContext';
import { useColors, palette } from '../../styles';
import { startVivaSession, processVivaTurn, endVivaSession } from '../../services/vivagemini';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VivaModeScreen = ({ onExit }) => {
    const { enrolledSubjects, teacherSubjects } = useSubjects();
    const subjects = (enrolledSubjects?.length > 0 ? enrolledSubjects : teacherSubjects) ?? [];
    const [activeSession, setActiveSession] = useState(null);

    if (activeSession) {
        return <VivaInterface session={activeSession} onExit={() => setActiveSession(null)} />;
    }

    return (
        <LectureSelection
            subjects={subjects}
            onSelect={(subject) => setActiveSession({ lectureTitle: subject.name, lectureId: subject.id })}
            onExit={onExit}
        />
    );
};

// ============================================================================
// LECTURE SELECTION
// ============================================================================

const LectureSelection = ({ subjects, onSelect, onExit }) => {
    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>
                <button onClick={onExit} style={styles.backBtn}>← Exit Viva Mode</button>
            </header>
            <div style={styles.contentWrapper}>
                <div style={styles.heroSection}>
                    <h1 style={styles.mainTitle}>Oral Examination</h1>
                    <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
                        Select a topic to begin your 10-question assessment
                    </p>
                </div>
                <div style={styles.grid}>
                    {subjects?.map((subject, i) => (
                        <LectureCard key={subject.id} subject={subject} index={i} onSelect={onSelect} />
                    ))}
                    {(!subjects || subjects.length === 0) && (
                        <div style={styles.emptyState}>
                            <p>No subjects enrolled.</p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Enroll in a subject first.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LectureCard = ({ subject, index, onSelect }) => {
    const colors = useColors();
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                ...styles.card,
                backgroundColor: colors.bg.surface,
                border: `1px solid ${colors.border.default}`,
                animationDelay: `${index * 0.1}s`,
                transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: hovered ? `0 8px 24px ${colors.shadow}` : `0 2px 8px ${colors.shadow}`,
            }}
            onClick={() => onSelect(subject)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={styles.cardContent}>
                <div style={{
                    ...styles.iconBox,
                    backgroundColor: colors.brand.subtle,
                    border: `1px solid ${colors.brand.subtleHover}`,
                    color: colors.brand.primary,
                }}>
                    🎙️
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>{subject.name}</h3>
                    <span style={styles.cardMeta}>10-Question Voice Assessment</span>
                </div>
                <span style={styles.arrowIcon}>→</span>
            </div>
        </div>
    );
};

// ============================================================================
// VIVA INTERFACE — HTTP + Web Speech API
// ============================================================================

const TOTAL_QUESTIONS = 10;

const VivaInterface = ({ session, onExit }) => {
    const { addToast } = useToast();
    const colors = useColors();

    // UI state
    const [phase, setPhase] = useState('loading'); // loading|speaking|listening|processing|complete|error
    const [questionNum, setQuestionNum] = useState(1);
    const [transcript, setTranscript] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [statusMsg, setStatusMsg] = useState('Generating your exam questions...');
    const [useTextInput, setUseTextInput] = useState(false);
    const [textAnswer, setTextAnswer] = useState('');

    // Refs — readable synchronously inside callbacks
    const isMountedRef = useRef(true);
    const isSpeakingRef = useRef(false);
    const sessionIdRef = useRef(null);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll transcript
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const addMessage = useCallback((sender, text) => {
        if (isMountedRef.current) {
            setTranscript(prev => [...prev, { id: Date.now() + Math.random(), sender, text }]);
        }
    }, []);

    // ── TTS speak ─────────────────────────────────────────────────────────────
    const speak = useCallback((text, onDone) => {
        if (!isMountedRef.current) return;
        isSpeakingRef.current = true;
        setPhase('speaking');
        setStatusMsg('Examiner is speaking...');
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 0.92;

        // Safety timeout — Chrome's onend sometimes doesn't fire
        const safetyMs = Math.max(text.length * 75, 3000) + 1500;
        let fired = false;
        const safety = setTimeout(() => {
            if (!fired && isMountedRef.current) {
                fired = true;
                isSpeakingRef.current = false;
                onDone?.();
            }
        }, safetyMs);

        const done = () => {
            if (fired) return;
            fired = true;
            clearTimeout(safety);
            if (!isMountedRef.current) return;
            isSpeakingRef.current = false;
            onDone?.();
        };

        utter.onend = done;
        utter.onerror = done;
        window.speechSynthesis.speak(utter);
    }, []);

    // ── STT listen ────────────────────────────────────────────────────────────
    const listen = useCallback(() => {
        if (!isMountedRef.current || isSpeakingRef.current) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setUseTextInput(true);
            setPhase('listening');
            setStatusMsg('Type your answer below...');
            return;
        }

        setPhase('listening');
        setStatusMsg('🎙️ Speak your answer...');

        const recog = new SR();
        recog.lang = 'en-US';
        recog.interimResults = false;
        recog.continuous = false;
        recognitionRef.current = recog;

        let resultFired = false;

        recog.onresult = (e) => {
            resultFired = true;
            const text = e.results[0][0].transcript.trim();
            if (text) {
                submitAnswer(text);
            } else {
                listen(); // empty result — retry
            }
        };

        recog.onerror = (e) => {
            if (e.error === 'no-speech') {
                if (isMountedRef.current) listen();
            } else if (e.error === 'not-allowed') {
                setUseTextInput(true);
                setPhase('listening');
                setStatusMsg('Microphone blocked — type your answer below.');
            } else {
                setUseTextInput(true);
                setPhase('listening');
                setStatusMsg('Voice unavailable — type your answer below.');
            }
        };

        recog.onend = () => {
            if (!resultFired && isMountedRef.current && !isSpeakingRef.current) {
                listen(); // ended without result — restart
            }
        };

        try { recog.start(); } catch {
            setUseTextInput(true);
            setPhase('listening');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Submit answer ─────────────────────────────────────────────────────────
    const submitAnswer = useCallback(async (text) => {
        if (!isMountedRef.current) return;
        recognitionRef.current?.abort();
        addMessage('user', text);
        setPhase('processing');
        setStatusMsg('Examiner is reviewing your answer...');

        try {
            const res = await processVivaTurn(sessionIdRef.current, text);
            if (!isMountedRef.current) return;

            if (res.done) {
                const fullFeedback = res.feedback;
                setFeedback(fullFeedback);
                addMessage('ai', fullFeedback);
                speak('Here is your examination feedback. ' + fullFeedback, () => {
                    if (isMountedRef.current) setPhase('complete');
                });
            } else {
                setQuestionNum(res.questionNumber);
                const qText = `Question ${res.questionNumber}. ${res.nextQuestion}`;
                addMessage('ai', res.nextQuestion);
                speak(qText, listen);
            }
        } catch (err) {
            if (!isMountedRef.current) return;
            addToast(err.message, 'error');
            setPhase('error');
            setStatusMsg('Something went wrong. End the session and try again.');
        }
    }, [addMessage, addToast, speak, listen]);

    // ── Setup on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        const setup = async () => {
            try {
                const data = await startVivaSession(session.lectureId, session.lectureTitle);
                if (!isMountedRef.current) return;

                sessionIdRef.current = data.sessionId;
                setQuestionNum(1);

                addMessage('ai', data.greeting);
                addMessage('ai', data.firstQuestion);

                const openingText = `${data.greeting} ${data.firstQuestion}`;
                speak(openingText, listen);
            } catch (err) {
                if (!isMountedRef.current) return;
                addToast(err.message, 'error');
                setPhase('error');
                setStatusMsg('Failed to start exam. Check server connection.');
            }
        };
        setup();

        return () => {
            isMountedRef.current = false;
            isSpeakingRef.current = false;
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                try { recognitionRef.current.abort(); } catch { /* already stopped */ }
            }
            if (sessionIdRef.current) {
                endVivaSession(sessionIdRef.current).catch(() => {});
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Interrupt (barge-in) ──────────────────────────────────────────────────
    const handleInterrupt = () => {
        if (phase !== 'speaking') return;
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        listen();
    };

    // ── End session ───────────────────────────────────────────────────────────
    const handleEnd = () => {
        if (phase !== 'complete' && !window.confirm('End examination early?')) return;
        window.speechSynthesis.cancel();
        recognitionRef.current?.abort();
        onExit();
    };

    // ── Text submit ───────────────────────────────────────────────────────────
    const handleTextSubmit = (e) => {
        e.preventDefault();
        const val = textAnswer.trim();
        if (!val) return;
        setTextAnswer('');
        submitAnswer(val);
    };

    const progress = Math.min(((questionNum - 1) / TOTAL_QUESTIONS) * 100, 100);

    return (
        <div style={styles.splitLayout}>
            {/* LEFT — visualizer */}
            <div style={styles.leftColumn}>
                <div style={styles.leftHeader}>
                    <button onClick={handleEnd} style={styles.ghostBtn}>
                        ← {phase === 'complete' ? 'Exit' : 'End Session'}
                    </button>
                    <h2 style={styles.sessionTitle}>{session.lectureTitle}</h2>

                    <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, backgroundColor: colors.brand.primary, width: `${progress}%` }} />
                        </div>
                        <span style={styles.progressText}>
                            Question {Math.min(questionNum, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}
                        </span>
                    </div>

                    <div style={styles.statusBadge}>
                        <StatusDot phase={phase} colors={colors} />
                        <span>{phaseLabel(phase)}</span>
                    </div>
                </div>

                <div style={styles.visualizerContainer}>
                    <div
                        className="liquid-blob"
                        style={{
                            ...styles.liquidBlob,
                            background: blobGradient(phase),
                            animationDuration: phase === 'speaking' ? '3s' : phase === 'listening' ? '4s' : '8s',
                            transform: phase === 'speaking' ? 'scale(1.12)' : 'scale(1)',
                        }}
                    />
                    <div style={styles.stateText}>
                        {phase === 'complete' ? 'Examination Complete' : phaseDescription(phase)}
                    </div>
                    {phase === 'speaking' && (
                        <button onClick={handleInterrupt} style={{ ...styles.interruptBtn, borderColor: palette.orange, color: palette.orange }}>
                            ✋ Interrupt
                        </button>
                    )}
                </div>
            </div>

            {/* RIGHT — transcript + controls */}
            <div style={styles.rightColumn}>
                <div style={styles.transcriptArea}>
                    {transcript.length === 0 && (
                        <div style={styles.emptyTranscript}>
                            <p style={{ color: colors.text.tertiary }}>{statusMsg}</p>
                        </div>
                    )}
                    {transcript.map(msg => <MessageBubble key={msg.id} message={msg} colors={colors} />)}
                    <div ref={messagesEndRef} />
                </div>

                <div style={styles.inputArea}>
                    {phase === 'complete' ? (
                        <div style={styles.completeCard}>
                            <p style={{ ...styles.completeText, color: colors.text.secondary }}>
                                Examination complete. Review your session transcript above.
                            </p>
                            <button
                                onClick={handleEnd}
                                style={{ ...styles.finishBtn, backgroundColor: colors.brand.primary, color: colors.text.inverse }}
                            >
                                Exit Viva Mode
                            </button>
                        </div>
                    ) : (
                        <div style={styles.controls}>
                            <p style={{ ...styles.statusText, color: colors.text.tertiary }}>{statusMsg}</p>

                            {useTextInput && phase === 'listening' && (
                                <form onSubmit={handleTextSubmit} style={styles.textRow}>
                                    <input
                                        autoFocus
                                        value={textAnswer}
                                        onChange={e => setTextAnswer(e.target.value)}
                                        placeholder="Type your answer..."
                                        style={{ ...styles.textInput, backgroundColor: colors.bg.elevated, borderColor: colors.border.default, color: colors.text.primary }}
                                    />
                                    <button type="submit" style={{ ...styles.sendBtn, backgroundColor: colors.brand.primary, color: colors.text.inverse }}>
                                        Send
                                    </button>
                                </form>
                            )}

                            <button onClick={handleEnd} style={styles.endBtn}>
                                End Session
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes morph {
                    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                }
                .liquid-blob { animation: morph 8s ease-in-out infinite; transition: all 0.5s ease; }
            `}</style>
        </div>
    );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusDot = ({ phase, colors }) => {
    const color = phase === 'listening' ? colors.status.errorText
        : phase === 'speaking' ? colors.brand.primary
        : phase === 'complete' ? colors.status.warning
        : phase === 'error' ? colors.status.errorText
        : colors.text.tertiary;

    return (
        <span style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: color,
            boxShadow: (phase === 'listening' || phase === 'speaking') ? `0 0 8px ${color}` : 'none',
        }} />
    );
};

const MessageBubble = ({ message, colors }) => {
    const isUser = message.sender === 'user';
    return (
        <div style={{ ...styles.messageRow, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            {!isUser && (
                <div style={{ ...styles.avatar, background: colors.brand.primary, color: colors.text.inverse }}>
                    AI
                </div>
            )}
            <div style={{
                ...styles.bubble,
                backgroundColor: isUser ? colors.chat.userBg : colors.chat.botBg,
                color: isUser ? colors.chat.userText : colors.chat.botText,
                border: isUser ? 'none' : `1px solid ${colors.chat.botBorder}`,
            }}>
                <p style={styles.msgText}>{message.text}</p>
            </div>
        </div>
    );
};

// ============================================================================
// UTILS
// ============================================================================

const phaseLabel = (p) => ({ loading: 'Setting up...', speaking: 'Speaking', listening: 'Listening', processing: 'Thinking...', complete: 'Complete', error: 'Error' }[p] ?? 'Ready');

const phaseDescription = (p) => ({
    loading: 'Generating your exam questions...',
    speaking: 'Examiner is asking a question...',
    listening: 'Speak your answer — examiner is listening',
    processing: 'Examiner is reviewing your answer...',
    error: 'Something went wrong. Please end the session.',
}[p] ?? '');

const blobGradient = (p) => {
    if (p === 'listening') return `linear-gradient(135deg, ${palette.redText}, ${palette.orange})`;
    if (p === 'speaking')  return `linear-gradient(135deg, ${palette.navy[600]}, ${palette.navy[400]})`;
    if (p === 'complete')  return `linear-gradient(135deg, ${palette.yellow}, ${palette.orange})`;
    if (p === 'error')     return `linear-gradient(135deg, ${palette.red}, ${palette.redText})`;
    return `linear-gradient(135deg, ${palette.warm[700]}, ${palette.warm[600]})`;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
    pageContainer: { minHeight: '100vh', width: '100vw', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-primary)', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflowY: 'auto' },
    header: { padding: '1.5rem 3rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)' },
    backBtn: { background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 },
    contentWrapper: { margin: '0 auto', padding: '2rem' },
    heroSection: { marginBottom: '3rem', textAlign: 'center' },
    mainTitle: { fontSize: '2.5rem', fontFamily: "'Anthropic Serif', Georgia, serif", fontWeight: 500, letterSpacing: '-0.025em' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' },
    card: { borderRadius: '16px', padding: '1.5rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
    cardContent: { display: 'flex', alignItems: 'center', gap: '1rem' },
    iconBox: { width: 50, height: 50, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.2rem' },
    cardMeta: { fontSize: '0.85rem', color: 'var(--color-text-tertiary)' },
    arrowIcon: { color: 'var(--color-text-tertiary)', fontSize: '1.2rem' },
    emptyState: { textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)', gridColumn: '1 / -1' },

    splitLayout: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--color-bg-app)', position: 'fixed', top: 0, left: 0, zIndex: 9999, overflow: 'hidden' },
    leftColumn: { flex: '0 0 42%', backgroundColor: 'var(--color-bg-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '2rem' },
    rightColumn: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
    leftHeader: { position: 'absolute', top: 0, left: 0, width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    ghostBtn: { background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.5rem 0', textAlign: 'left' },
    sessionTitle: { fontSize: '1.4rem', fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-text-primary)' },
    progressContainer: { width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    progressBar: { width: '100%', height: 6, backgroundColor: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', transition: 'width 0.5s ease-out', borderRadius: 3 },
    progressText: { fontSize: '0.8rem', color: 'var(--color-text-tertiary)', textAlign: 'right' },
    statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 20, fontSize: '0.85rem', fontWeight: 500, width: 'fit-content', color: 'var(--color-text-secondary)' },
    visualizerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' },
    liquidBlob: { width: 260, height: 260 },
    stateText: { fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' },
    interruptBtn: { padding: '0.6rem 1.4rem', borderRadius: 20, backgroundColor: 'transparent', border: '1px solid', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', transition: 'opacity 0.15s' },

    transcriptArea: { flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    emptyTranscript: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
    messageRow: { display: 'flex', gap: '0.75rem', alignItems: 'flex-end' },
    avatar: { width: 32, height: 32, borderRadius: '50%', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    bubble: { padding: '1rem 1.25rem', borderRadius: '14px', lineHeight: 1.6, maxWidth: '78%' },
    msgText: { margin: 0, fontSize: '1rem', lineHeight: 1.6 },

    inputArea: { padding: '1.5rem 2rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)' },
    controls: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
    statusText: { fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', minHeight: '1.2rem' },
    textRow: { display: 'flex', gap: '0.5rem', width: '100%', maxWidth: 540 },
    textInput: { flex: 1, padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid', fontSize: '1rem', outline: 'none' },
    sendBtn: { padding: '0.75rem 1.25rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem' },
    endBtn: { padding: '0.6rem 1.4rem', borderRadius: 20, backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' },

    completeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' },
    completeText: { fontSize: '1rem', lineHeight: 1.6, margin: 0 },
    finishBtn: { padding: '0.875rem 2.5rem', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '1rem' },
};

export default VivaModeScreen;
