import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { UI_TEXT, ROLES } from '../../config/constants';
import { sendMessageToGemini } from '../../services/gemini';
import Skeleton from '../../components/common/Skeleton/Skeleton';

const ChatScreen = ({ currentRole, selectedLecture }) => {
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsThinking(true); // Start thinking

        try {
            // Call Gemini API
            const responseText = await sendMessageToGemini(inputValue, selectedLecture);

            const responseMsg = {
                id: Date.now() + 1,
                text: responseText,
                sender: 'system'
            };
            setMessages(prev => [...prev, responseMsg]);
        } catch (error) {
            console.error("Chat Error:", error);
            const errorMsg = {
                id: Date.now() + 1,
                text: `Error: ${error.message || "An unexpected error occurred."}`,
                sender: 'system',
                isError: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false); // Stop thinking
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    // Helper to format lecture name (e.g. "leacture_1" -> "Lecture 1")
    const formatLectureName = (name) => {
        if (!name) return '';
        return name
            .replace(/_/g, ' ')
            .replace(/leacture/i, 'Lecture')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    const isTeacher = currentRole === ROLES.TEACHER;
    const greeting = isTeacher ? UI_TEXT.CHAT.GREETING.TEACHER : UI_TEXT.CHAT.GREETING.STUDENT;

    // Customized sub-greeting based on selection
    const subGreeting = selectedLecture
        ? `You are chatting with ${formatLectureName(selectedLecture)}`
        : UI_TEXT.CHAT.SUB_GREETING;

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxWidth: '1000px',
            margin: '0 auto',
            width: '100%',
            position: 'relative',
        },
        scrollArea: {
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 1.5rem',
            scrollBehavior: 'smooth',
            paddingBottom: '120px', // Space for fixed input
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            marginTop: '-4rem', // Optical adjustment
        },
        greeting: {
            fontSize: '2rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
        },
        subGreeting: {
            fontSize: '1rem',
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
        },
        messageList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            paddingBottom: '2rem',
        },
        messageRow: (isUser) => ({
            display: 'flex',
            gap: '1rem',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
        }),
        avatar: (isUser, isBot) => ({
            width: '2rem',
            height: '2rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: 600,
            flexShrink: 0,
            backgroundColor: isBot ? 'transparent' : 'var(--color-primary)',
            color: isBot ? 'var(--color-accent)' : 'white',
            background: isBot ? 'transparent' : 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary))',
            boxShadow: isUser ? 'var(--shadow-sm)' : 'none',
        }),
        messageContent: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: isTeacher ? 'flex-end' : 'flex-start', // Actually depends on isUser, logic below handles max-width
            maxWidth: '80%',
        },
        senderName: (isUser) => ({
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '0.25rem',
            textAlign: isUser ? 'right' : 'left',
            width: '100%',
        }),
        bubble: (isUser) => ({
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: isUser ? 'var(--color-bg-chat-user)' : 'var(--color-bg-chat-bot)',
            color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            boxShadow: 'var(--shadow-sm)',
            borderTopRightRadius: isUser ? '2px' : 'var(--radius-lg)',
            borderTopLeftRadius: isUser ? 'var(--radius-lg)' : '2px',
        }),
        inputContainer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '2rem',
            // Gradient to fade content behind input
            background: 'linear-gradient(to top, var(--color-bg-surface) 80%, rgba(255,255,255,0) 100%)',
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
        },
        inputGradient: {
            position: 'absolute',
            top: '-40px',
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(to top, var(--color-bg-surface), transparent)',
            pointerEvents: 'none',
        },
        inputWrapper: {
            width: '100%',
            maxWidth: '800px',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '0.5rem 0.5rem 0.5rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s var(--ease-snappy)',
            border: isInputFocused ? '1px solid var(--color-text-tertiary)' : '1px solid var(--color-border)',
            boxShadow: isInputFocused ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        },
        chatInput: {
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            color: 'var(--color-text-primary)',
            background: 'transparent',
            minHeight: '24px',
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'inherit',
        },
        sendButton: {
            backgroundColor: !inputValue.trim() ? 'var(--color-bg-app)' : 'var(--color-primary)',
            color: !inputValue.trim() ? 'var(--color-text-tertiary)' : 'var(--color-text-inverse)',
            border: 'none',
            cursor: !inputValue.trim() ? 'default' : 'pointer',
            padding: '0.625rem',
            transition: 'all 0.2s',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.5rem',
            height: '2.5rem',
            marginLeft: '0.75rem',
            transform: isButtonHovered && inputValue.trim() ? 'scale(1.05)' : 'scale(1)',
        },
        disclaimer: {
            fontSize: '0.7rem',
            color: 'var(--color-text-tertiary)',
            marginTop: '0.75rem',
            textAlign: 'center',
        }
    };

    return (
        <div style={styles.container}>
            {/* Scrollable Chat Area */}
            <div style={styles.scrollArea}>
                {messages.length === 0 ? (
                    <div style={styles.emptyState}>
                        <h1 style={styles.greeting}>{greeting}</h1>
                        <h2 style={styles.subGreeting}>{subGreeting}</h2>
                    </div>
                ) : (
                    <div style={styles.messageList}>
                        {messages.map((msg) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <div
                                    key={msg.id}
                                    style={styles.messageRow(isUser)}
                                >
                                    <div style={styles.avatar(isUser, !isUser)}>
                                        {isUser ? (isTeacher ? 'T' : 'S') : '✨'}
                                    </div>
                                    <div style={styles.messageContent}>
                                        <div style={styles.senderName(isUser)}>
                                            {isUser ? (isTeacher ? 'Teacher' : 'Student') : 'Lummina'}
                                        </div>
                                        <div style={styles.bubble(isUser)}>{msg.text}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Skeleton Loader for AI Thinking */}
                        {isThinking && (
                            <div style={styles.messageRow(false)}>
                                <div style={styles.avatar(false, true)}>✨</div>
                                <div style={styles.messageContent}>
                                    <div style={styles.senderName(false)}>Lummina</div>
                                    <div style={{ ...styles.bubble(false), padding: '1rem', minWidth: '200px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <Skeleton width="90%" height="0.8em" borderRadius="4px" />
                                            <Skeleton width="60%" height="0.8em" borderRadius="4px" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area (Pinned to bottom) */}
            <div style={styles.inputContainer}>
                <div style={styles.inputGradient} />
                <div style={styles.inputWrapper}>
                    <input
                        style={styles.chatInput}
                        placeholder={UI_TEXT.CHAT.INPUT_PLACEHOLDER}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                    />
                    <button
                        style={styles.sendButton}
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        onMouseEnter={() => setIsButtonHovered(true)}
                        onMouseLeave={() => setIsButtonHovered(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
                <div style={styles.disclaimer}>{UI_TEXT.CHAT.DISCLAIMER}</div>
            </div>
        </div>
    );
};

ChatScreen.propTypes = {
    currentRole: PropTypes.string.isRequired,
    selectedLecture: PropTypes.string,
};



export default ChatScreen;
