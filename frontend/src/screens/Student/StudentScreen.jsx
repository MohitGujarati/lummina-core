import React, { useState, useRef, useEffect } from 'react';
import Header from '../../components/common/Header/Header';
import { UI_TEXT } from '../../config/constants';

const StudentScreen = ({ onBack }) => {
    const [messages, setMessages] = useState([
        { id: 1, text: UI_TEXT.STUDENT.WELCOME_MSG, sender: 'system' }
    ]);
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

    const handleSend = () => {
        if (!inputValue.trim()) return;

        // Add user message
        const userMsg = { id: Date.now(), text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Simulate system response
        setTimeout(() => {
            const responseMsg = {
                id: Date.now() + 1,
                text: 'This is a simulated RAG response based on the uploaded documents. Implementation pending backend integration.',
                sender: 'system'
            };
            setMessages(prev => [...prev, responseMsg]);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };



    return (
        <div style={styles.container}>
            <Header onBack={onBack} />

            <main style={styles.main}>
                <div style={styles.chatContainer}>
                    {/* Messages Area */}
                    <div style={styles.messagesList}>
                        {messages.map((msg) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <div
                                    key={msg.id}
                                    style={styles.messageRow(isUser)}
                                >
                                    <div style={styles.avatar(isUser)}>
                                        {isUser ? 'S' : '✨'}
                                    </div>
                                    <div style={styles.messageContent(isUser)}>
                                        <div style={styles.messageBubble(isUser)}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={styles.inputContainer}>
                        <div style={styles.inputWrapper}>
                            <input
                                style={styles.chatInput}
                                placeholder={UI_TEXT.STUDENT.INPUT_PLACEHOLDER}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                            />
                            <button
                                style={styles.sendButton}
                                onClick={handleSend}
                                onMouseEnter={() => setIsButtonHovered(true)}
                                onMouseLeave={() => setIsButtonHovered(false)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                        <p style={styles.disclaimer}>{UI_TEXT.STUDENT.NO_UPLOAD_ACCESS}</p>
                    </div>
                </div>
            </main>
        </div>
    );
    const styles = {
        container: {
            height: '100vh',
            backgroundColor: 'var(--color-bg-app)',
            display: 'flex',
            flexDirection: 'column',
        },
        main: {
            flex: 1,
            maxWidth: '1000px',
            width: '100%',
            margin: '0 auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
        },
        chatContainer: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
        },
        messagesList: {
            flex: 1,
            padding: '2rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            paddingBottom: '140px', // Space for input
        },
        messageRow: (isUser) => ({
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
            maxWidth: '100%',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            paddingLeft: isUser ? '20%' : '0',
            paddingRight: isUser ? '0' : '20%',
        }),
        avatar: (isUser) => ({
            width: '2rem',
            height: '2rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            flexShrink: 0,
            marginTop: '0.25rem',
            backgroundColor: isUser ? 'transparent' : 'var(--color-bg-app)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
            order: isUser ? 2 : 1,
        }),
        messageContent: (isUser) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            order: isUser ? 1 : 2,
        }),
        messageBubble: (isUser) => ({
            lineHeight: 1.6,
            fontSize: '0.95rem',
            whiteSpace: 'pre-wrap',
            padding: '0.875rem 1.25rem',
            color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
            backgroundColor: isUser ? 'var(--color-bg-chat-user)' : 'var(--color-bg-chat-bot)',
            borderRadius: '1rem',
            borderTopLeftRadius: !isUser ? '0.25rem' : '1rem',
            borderTopRightRadius: isUser ? '0.25rem' : '1rem',
            boxShadow: isUser ? 'var(--shadow-md)' : 'none',
        }),
        // Input Area
        inputContainer: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '2rem',
            background: 'linear-gradient(to top, var(--color-bg-app) 80%, rgba(255,255,255,0) 100%)',
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
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
            background: 'transparent',
            padding: '0.75rem 0',
            fontSize: '1rem',
            outline: 'none',
            color: 'var(--color-text-primary)',
            minHeight: '24px',
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
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            marginTop: '1rem',
            textAlign: 'center',
        }
    };
};



export default StudentScreen;
