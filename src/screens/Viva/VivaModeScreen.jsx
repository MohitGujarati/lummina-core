import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';

import { startVivaSession, processVivaTurn, endVivaSession } from '../../services/vivagemini';

// ============================================================================
// MAIN VIVA MODE COMPONENT
// ============================================================================

const VivaModeScreen = ({ onExit }) => {
    const { addToast } = useToast();
    const [lectures, setLectures] = useState();
    const [activeSession, setActiveSession] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load available lectures on mount
    useEffect(() => {
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

    const handleStartSession = async (lecture) => {
        setIsLoading(true);
        const formattedTitle = lecture
            .replace(/_/g, ' ')
            .replace(/leacture/i, 'Lecture')
            .replace(/\b\w/g, c => c.toUpperCase());

        try {
            // Extended timeout for the "Kickstart" initialization
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Examiner is not responding. Please try again.")), 15000)
            );

            const startPromise = startVivaSession(lecture);
            const result = await Promise.race([startPromise, timeoutPromise]);

            console.log('✅ Session initialized:', result);

            setActiveSession({
                lectureTitle: formattedTitle,
                lectureId: lecture,
                sessionId: result.sessionId,
                initialMessage: result.message
            });
        } catch (error) {
            console.error("Failed to start session:", error);
            addToast("Failed to initialize: " + error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (activeSession) {
        return (
            <VivaInterface
                session={activeSession}
                onExit={() => setActiveSession(null)}
            />
        );
    }

    return (
        <LectureSelection
            lectures={lectures}
            onSelect={handleStartSession}
            onExit={onExit}
        />
    );
};

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = () => (
    <div style={styles.centerContainer}>
        <div style={styles.liquidBlobSmall}></div>
        <h3 style={styles.loadingText}>Summoning Examiner...</h3>
        <p style={styles.loadingSubtext}>Reviewing lecture materials</p>
        <style>{`
            @keyframes morph-small {
                0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
            }
        `}</style>
    </div>
);

// ============================================================================
// LECTURE SELECTION SCREEN
// ============================================================================

const LectureSelection = ({ lectures, onSelect, onExit }) => {
    return (
        <div style={styles.pageContainer}>
            <header style={styles.header}>
                <button onClick={onExit} style={styles.backBtn}>
                    <span style={{ fontSize: '1.2rem' }}>←</span> Exit Viva Mode
                </button>
            </header>

            <div style={styles.contentWrapper}>
                <div style={styles.heroSection}>
                    <h1 style={styles.mainTitle}>Oral Examination</h1>
                    <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Select a topic to begin your 10-question assessment</p>
                </div>

                <div style={styles.grid}>
                    {lectures?.map((lecture, i) => (
                        <LectureCard
                            key={lecture}
                            lecture={lecture}
                            index={i}
                            onSelect={onSelect}
                        />
                    ))}

                    {(!lectures || lectures.length === 0) && (
                        <div style={styles.emptyState}>
                            <p>No lecture materials found.</p>
                            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                Add lecture files to /src/assets/
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LectureCard = ({ lecture, index, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{
                ...styles.card,
                animationDelay: `${index * 0.1}s`,
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? '0 8px 24px rgba(0,0,0,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.05)'
            }}
            onClick={() => onSelect(lecture)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={styles.cardContent}>
                <div style={styles.iconBox}>
                    <span style={styles.cardIcon}>🎙️</span>
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={styles.cardTitle}>
                        {lecture.replace(/_/g, ' ').replace(/leacture/i, 'Lecture')}
                    </h3>
                    <span style={styles.cardMeta}>Voice-based Assessment</span>
                </div>
                <span style={styles.arrowIcon}>→</span>
            </div>
        </div>
    );
};

// ============================================================================
// VIVA INTERFACE - MAIN CONVERSATION SCREEN
// ============================================================================

const VivaInterface = ({ session, onExit }) => {
    const { addToast } = useToast();
    const TOTAL_ROUNDS = 10;

    // State
    const [agentState, setAgentState] = useState('initializing');
    const [transcript, setTranscript] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [currentRound, setCurrentRound] = useState(1);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    // NEW: Text input fallback
    const [textInput, setTextInput] = useState('');
    const [useTextMode, setUseTextMode] = useState(false);
    const [speechFailCount, setSpeechFailCount] = useState(0);

    // NEW: Exam results for final feedback
    const [examResults, setExamResults] = useState(null);

    // Refs
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const isMountedRef = useRef(true);
    const hasSpokenRef = useRef(false);
    const shouldAutoListenRef = useRef(false);
    const textInputRef = useRef(null);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis?.getVoices() || [];
            if (voices.length > 0) setVoicesLoaded(true);
        };
        loadVoices();
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    // Cleanup
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            window.speechSynthesis?.cancel();
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    // Session initialization
    useEffect(() => {
        if (voicesLoaded && !hasSpokenRef.current) {
            hasSpokenRef.current = true;
            setSessionId(session.sessionId);

            // Format initial message with Round info
            const introMsg = `(Round 1/${TOTAL_ROUNDS}) ${session.initialMessage}`;
            addMessage('agent', introMsg);
            setAgentState('idle');

            setTimeout(() => {
                if (isMountedRef.current) {
                    shouldAutoListenRef.current = true;
                    speak(session.initialMessage);
                }
            }, 500);
        }
    }, [voicesLoaded, session]);

    const addMessage = (sender, text) => {
        setTranscript(prev => [...prev, { sender, text }]);
    };

    const speak = (text) => {
        if (!window.speechSynthesis) return;

        try { window.speechSynthesis.cancel(); } catch (e) { }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        const voices = window.speechSynthesis.getVoices() || [];
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google')) || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => {
            if (isMountedRef.current) setAgentState('speaking');
        };

        utterance.onend = () => {
            if (isMountedRef.current) {
                if (isSessionComplete) {
                    setAgentState('idle');
                } else {
                    setAgentState('idle');
                    if (shouldAutoListenRef.current) {
                        setTimeout(() => {
                            if (isMountedRef.current && agentState !== 'listening') {
                                startListening();
                            }
                        }, 800);
                    }
                }
            }
        };

        utterance.onerror = () => {
            if (isMountedRef.current) setAgentState('idle');
        };

        window.speechSynthesis.speak(utterance);
    };

    const requestMicrophonePermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error("Microphone permission denied:", error);
            if (error.name === 'NotAllowedError') {
                addToast("Microphone access denied. Please allow microphone access to use voice features.", "error");
            } else if (error.name === 'NotFoundError') {
                addToast("No microphone found. Please connect a microphone.", "error");
            } else {
                addToast("Could not access microphone: " + error.message, "error");
            }
            return false;
        }
    };

    const startListening = async () => {
        if (isSessionComplete) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            addToast("Browser doesn't support speech recognition. Please use Chrome or Edge.", "error");
            return;
        }

        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            setAgentState('idle');
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            if (isMountedRef.current) setAgentState('listening');
        };

        recognition.onresult = async (event) => {
            // Correctly access the speech recognition results
            const lastResultIndex = event.results.length - 1;
            const result = event.results[lastResultIndex];
            const text = result[0].transcript;

            if (result.isFinal && text.trim()) {
                if (isMountedRef.current) {
                    addMessage('user', text.trim());
                    await handleUserResponse(text.trim());
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (isMountedRef.current) {
                if (event.error === 'not-allowed') {
                    addToast("Microphone access was denied. Use text input instead.", "error");
                    setUseTextMode(true);
                } else if (event.error === 'network') {
                    setSpeechFailCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 2) {
                            addToast("Voice unavailable. Switched to text input.", "info");
                            setUseTextMode(true);
                        } else {
                            addToast("Network error. Try again or use text input below.", "error");
                        }
                        return newCount;
                    });
                } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    addToast("Speech error: " + event.error + ". Try text input.", "error");
                }
                setAgentState('idle');
            }
        };

        recognition.onend = () => {
            if (isMountedRef.current && agentState === 'listening') {
                setAgentState('idle');
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            console.log("🎤 Speech recognition started");
        } catch (e) {
            console.error("Failed to start recognition:", e);
            addToast("Failed to start speech recognition.", "error");
            setAgentState('idle');
        }
    };

    const handleMicClick = async () => {
        if (isSessionComplete) return;
        if (agentState === 'listening') {
            recognitionRef.current?.stop();
        } else if (agentState === 'idle') {
            await startListening();
        }
    };

    // NEW: Handle text input submission
    const handleTextSubmit = async () => {
        if (!textInput.trim() || agentState !== 'idle') return;
        const text = textInput.trim();
        setTextInput('');
        addMessage('user', text);
        await handleUserResponse(text);
    };

    // NEW: Handle skip question
    const handleSkip = async () => {
        if (agentState !== 'idle') return;
        addMessage('user', "I don't know / Skip");
        await handleUserResponse("I don't know");
    };

    // NEW: Handle key press in text input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleTextSubmit();
        }
    };

    // NEW: Switch to text mode
    const switchToTextMode = () => {
        setUseTextMode(true);
        addToast("Switched to text input mode", "info");
        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    const handleUserResponse = async (text) => {
        setAgentState('thinking');

        // 1. Advance Round Logic
        const nextRound = currentRound + 1;
        const isLastQuestion = nextRound > TOTAL_ROUNDS;

        try {
            const response = await processVivaTurn(sessionId, text, currentRound, TOTAL_ROUNDS);
            const message = response?.message;

            if (!message) {
                console.warn('No message received from AI');
                throw new Error('Empty response from AI');
            }

            // Update UI - removed isMountedRef check that was incorrectly blocking updates

            if (isLastQuestion) {
                setIsSessionComplete(true);
                shouldAutoListenRef.current = false;
                addMessage('agent', "🏁 Exam Complete. " + message);
            } else {
                setCurrentRound(nextRound);
                addMessage('agent', `(Round ${nextRound}/${TOTAL_ROUNDS}) ${message}`);
            }

            setAgentState('idle');

            // Speak the response
            setTimeout(() => {
                if (message) speak(message);
            }, 100);

        } catch (err) {
            console.error('Turn processing error:', err);
            setAgentState('idle');
            const fallbackMsg = "I didn't catch that. Could you please repeat?";
            addMessage('agent', fallbackMsg);
            speak(fallbackMsg);
        }
    };

    const handleEndSession = async () => {
        if (!isSessionComplete) {
            const confirmEnd = window.confirm("End examination early?");
            if (!confirmEnd) return;
        }
        try {
            if (sessionId) await endVivaSession(sessionId);
            addToast("Session ended", "success");
        } catch (err) { }
        onExit();
    };

    return (
        <div style={styles.splitLayout}>
            {/* LEFT COLUMN: VISUALIZER */}
            <div style={styles.leftColumn}>
                <div style={styles.leftHeader}>
                    <button onClick={handleEndSession} style={styles.ghostBtn}>
                        ← {isSessionComplete ? "Exit Results" : "End Session"}
                    </button>
                    <h2 style={styles.sessionTitle}>{session.lectureTitle}</h2>

                    {/* Progress Indicator */}
                    <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                            <div style={{
                                ...styles.progressFill,
                                width: `${(currentRound / TOTAL_ROUNDS) * 100}%`
                            }} />
                        </div>
                        <span style={styles.progressText}>
                            Question {Math.min(currentRound, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
                        </span>
                    </div>

                    <div style={styles.statusBadge}>
                        <StatusIndicator state={agentState} />
                        <span>{getStateLabel(agentState)}</span>
                    </div>
                </div>

                <div style={styles.visualizerContainer}>
                    <div
                        className="liquid-blob"
                        style={{
                            ...styles.liquidBlob,
                            animationDuration: agentState === 'speaking' ? '3s' :
                                agentState === 'thinking' ? '2s' : '8s',
                            background: getStateColor(agentState),
                            boxShadow: agentState === 'speaking'
                                ? '0 0 60px rgba(139, 92, 246, 0.6)'
                                : '0 0 30px rgba(var(--primary-rgb), 0.2)',
                            transform: agentState === 'speaking' ? 'scale(1.15)' : 'scale(1)'
                        }}
                    />

                    <div style={styles.stateText}>
                        {isSessionComplete ? "Examination Complete" : getStateDescription(agentState)}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: TRANSCRIPT & CONTROLS */}
            <div style={styles.rightColumn}>
                <div style={styles.transcriptArea}>
                    {transcript.length === 0 && (
                        <div style={styles.emptyTranscript}>
                            <p>Initializing exam...</p>
                        </div>
                    )}

                    {transcript.map((msg, idx) => (
                        <MessageBubble key={idx} message={msg} />
                    ))}

                    <div ref={messagesEndRef} />
                </div>

                <div style={styles.inputArea}>
                    {isSessionComplete ? (
                        <button onClick={handleEndSession} style={styles.finishBtn}>
                            View Results & Exit
                        </button>
                    ) : (
                        <div style={styles.inputControls}>
                            {/* Text Input Section */}
                            <div style={styles.textInputRow}>
                                <input
                                    ref={textInputRef}
                                    type="text"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder={useTextMode ? "Type your answer here..." : "Or type your answer..."}
                                    disabled={agentState !== 'idle'}
                                    style={{
                                        ...styles.textInput,
                                        opacity: agentState === 'idle' ? 1 : 0.5
                                    }}
                                />
                                <button
                                    onClick={handleTextSubmit}
                                    disabled={!textInput.trim() || agentState !== 'idle'}
                                    style={{
                                        ...styles.sendBtn,
                                        opacity: textInput.trim() && agentState === 'idle' ? 1 : 0.5
                                    }}
                                >
                                    Send
                                </button>
                            </div>

                            {/* Voice & Skip Controls */}
                            <div style={styles.controlsRow}>
                                {!useTextMode && (
                                    <button
                                        onClick={handleMicClick}
                                        disabled={agentState === 'thinking' || agentState === 'speaking' || agentState === 'initializing'}
                                        style={{
                                            ...styles.micBtn,
                                            backgroundColor: agentState === 'listening' ? '#ef4444' : 'var(--color-primary)',
                                            opacity: (agentState === 'idle' || agentState === 'listening') ? 1 : 0.5,
                                        }}
                                    >
                                        {agentState === 'listening' ? '⏹ Stop' : '🎙️ Speak'}
                                    </button>
                                )}

                                <button
                                    onClick={handleSkip}
                                    disabled={agentState !== 'idle'}
                                    style={{
                                        ...styles.skipBtn,
                                        opacity: agentState === 'idle' ? 1 : 0.5
                                    }}
                                >
                                    ⏭ Skip Question
                                </button>

                                {!useTextMode && (
                                    <button
                                        onClick={switchToTextMode}
                                        style={styles.modeToggleBtn}
                                    >
                                        ⌨️ Text Only
                                    </button>
                                )}
                            </div>

                            {/* Status Text */}
                            <div style={styles.statusText}>
                                {agentState === 'listening' && '🔴 Listening...'}
                                {agentState === 'thinking' && '💭 Processing your answer...'}
                                {agentState === 'speaking' && '🔊 Examiner is speaking...'}
                                {agentState === 'idle' && useTextMode && '⌨️ Type your answer and press Enter or Send'}
                                {agentState === 'idle' && !useTextMode && '🎙️ Click Speak or type below'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes morph {
                    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                }
               .liquid-blob {
                    animation: morph 8s ease-in-out infinite;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
        </div>
    );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StatusIndicator = ({ state }) => {
    const getColor = () => {
        switch (state) {
            case 'listening': return '#ef4444';
            case 'speaking': return '#8b5cf6';
            case 'thinking': return '#f59e0b';
            case 'error': return '#dc2626';
            default: return '#10b981';
        }
    };

    return (
        <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getColor(),
            boxShadow: state === 'listening' |

                state === 'speaking'
                ? `0 0 8px ${getColor()}`
                : 'none',
            animation: state === 'listening' ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }} />
    );
};

const MessageBubble = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div style={{
            ...styles.messageRow,
            justifyContent: isUser ? 'flex-end' : 'flex-start'
        }}>
            {!isUser && <div style={styles.avatarTiny}>AI</div>}
            <div style={{
                ...styles.bubble,
                backgroundColor: isUser
                    ? 'var(--color-primary)'
                    : 'rgba(255, 255, 255, 0.08)',
                color: isUser ? '#fff' : '#f1f5f9',
                border: isUser
                    ? 'none'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: isUser
                    ? '0 2px 8px rgba(var(--primary-rgb), 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}>
                <p style={{ ...styles.msgText, color: 'inherit', fontWeight: isUser ? 500 : 400 }}>{message.text}</p>
            </div>
        </div>
    );
};

// ============================================================================
// STYLES & UTILS
// ============================================================================

const getStateLabel = (state) => {
    const labels = {
        initializing: 'Initializing...',
        idle: 'Ready',
        listening: 'Listening',
        thinking: 'Grading...',
        speaking: 'Speaking',
        error: 'Error'
    };
    return labels[state] |

        'Unknown';
};

const getStateDescription = (state) => {
    const descriptions = {
        initializing: 'Setting up your examination...',
        idle: 'Waiting for your answer...',
        listening: 'I\'m listening...',
        thinking: 'Analyzing your response...',
        speaking: 'Asking question...',
        error: 'Connection interrupted'
    };
    return descriptions[state] |

        '';
};

const getStateColor = (state) => {
    switch (state) {
        case 'listening': return 'linear-gradient(135deg, #ef4444, #f87171)';
        case 'speaking': return 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
        case 'thinking': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
        default: return 'linear-gradient(135deg, var(--color-primary), #a78bfa)';
    }
};

const styles = {
    pageContainer: {
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--color-bg-app)',
        color: 'var(--color-text-primary)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        overflowY: 'auto'
    },
    header: {
        padding: '1.5rem 3rem',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-surface)'
    },
    backBtn: {
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        padding: '0.6rem 1.2rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s'
    },
    contentWrapper: {
        margin: '0 auto',
        padding: '2rem'
    },
    heroSection: {
        marginBottom: '3rem',
        textAlign: 'center'
    },
    mainTitle: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: 'var(--color-text-primary)'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem'
    },
    card: {
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    cardContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    iconBox: {
        width: '50px',
        height: '50px',
        borderRadius: '12px',
        backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary)',
        fontSize: '1.5rem'
    },
    cardIcon: {
        fontSize: '1.5rem'
    },
    cardTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        marginBottom: '0.2rem'
    },
    cardMeta: {
        fontSize: '0.85rem',
        color: 'var(--color-text-tertiary)'
    },
    arrowIcon: {
        color: 'var(--color-text-tertiary)',
        fontSize: '1.2rem',
        transition: 'transform 0.2s'
    },
    splitLayout: {
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--color-bg-app)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        overflow: 'hidden'
    },
    leftColumn: {
        flex: '0 0 45%',
        backgroundColor: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '2rem'
    },
    rightColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
    },
    leftHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    ghostBtn: {
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0.5rem 0',
        textAlign: 'left',
        transition: 'color 0.2s'
    },
    sessionTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#f1f5f9'
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        fontSize: '0.85rem',
        fontWeight: '500',
        width: 'fit-content',
        color: '#e2e8f0'
    },
    visualizerContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3rem',
        justifyContent: 'center'
    },
    liquidBlob: {
        width: '300px',
        height: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
    },
    stateText: {
        fontSize: '1.1rem',
        fontWeight: '500',
        color: '#cbd5e1',
        letterSpacing: '0.02em',
        textAlign: 'center'
    },
    transcriptArea: {
        flex: 1,
        padding: '2rem 3rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        backgroundImage: 'radial-gradient(circle at center, rgba(var(--primary-rgb), 0.03) 0%, transparent 70%)'
    },
    emptyTranscript: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
        opacity: 0.7
    },
    messageRow: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        animation: 'fadeIn 0.3s ease'
    },
    avatarTiny: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
    },
    bubble: {
        padding: '1.25rem 1.75rem',
        borderRadius: '16px',
        lineHeight: '1.6',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        transition: 'all 0.2s',
        border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: '80%'
    },
    msgText: {
        margin: 0,
        marginBottom: '0.25rem',
        fontSize: '1.05rem',
        lineHeight: '1.6'
    },
    inputArea: {
        padding: '2rem',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: 'var(--color-bg-app)'
    },
    micBtnLarge: {
        padding: '1rem 2.5rem',
        borderRadius: '50px',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        fontSize: '1rem',
        fontWeight: '600'
    },
    finishBtn: {
        padding: '1rem 3rem',
        borderRadius: '50px',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '1.1rem',
        boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)'
    },
    micIcon: {
        fontSize: '1.3rem'
    },
    micLabel: {
        fontSize: '1rem'
    },
    centerContainer: {
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
        zIndex: 9999,
        padding: '2rem'
    },
    liquidBlobSmall: {
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
        animation: 'morph-small 2s ease-in-out infinite',
        marginBottom: '2rem'
    },
    loadingText: {
        fontSize: '1.3rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        marginBottom: '0.5rem'
    },
    loadingSubtext: {
        fontSize: '0.95rem',
        color: 'var(--color-text-secondary)'
    },
    progressContainer: {
        width: '100%',
        marginTop: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    progressBar: {
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--color-border)',
        borderRadius: '3px',
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.5s ease-out'
    },
    progressText: {
        fontSize: '0.8rem',
        color: 'var(--color-text-tertiary)',
        textAlign: 'right'
    },
    emptyState: {
        textAlign: 'center',
        padding: '3rem',
        color: 'var(--color-text-tertiary)',
        gridColumn: '1 / -1'
    },
    // NEW: Input controls styles
    inputControls: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '600px'
    },
    textInputRow: {
        display: 'flex',
        gap: '0.75rem',
        width: '100%'
    },
    textInput: {
        flex: 1,
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        color: '#f1f5f9',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        caretColor: '#a78bfa'
    },
    sendBtn: {
        padding: '0.875rem 1.5rem',
        borderRadius: '12px',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.95rem',
        transition: 'all 0.2s'
    },
    controlsRow: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
    },
    micBtn: {
        padding: '0.75rem 1.5rem',
        borderRadius: '25px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9rem',
        color: '#fff',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    skipBtn: {
        padding: '0.75rem 1.5rem',
        borderRadius: '25px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#cbd5e1',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '0.9rem',
        transition: 'all 0.2s'
    },
    modeToggleBtn: {
        padding: '0.75rem 1.25rem',
        borderRadius: '25px',
        backgroundColor: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-tertiary)',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '0.85rem',
        transition: 'all 0.2s'
    },
    statusText: {
        fontSize: '0.85rem',
        color: '#94a3b8',
        textAlign: 'center',
        minHeight: '1.25rem',
        fontWeight: '500'
    }
};

export default VivaModeScreen;