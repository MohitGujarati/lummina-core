import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UI_TEXT, ROLES } from '../../config/constants';
import { sendMessageToGemini } from '../../services/gemini';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import { useSubjects } from '../../context/SubjectContext';
import { createConversation, saveMessage, getConversationMessages } from '../../services/conversationService';
import LumminaMascot from '../../components/common/Mascot/Mascot';

const ChatScreen = ({ currentRole, selectedLecture, selectedChapterId, conversationId, onConversationCreated, onRefreshRecent }) => {
    const { enrolledSubjects, teacherSubjects } = useSubjects();
    const allSubjects = [...(enrolledSubjects || []), ...(teacherSubjects || [])];
    const activeSubject = allSubjects.find(s => s.id === selectedLecture);

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const messagesEndRef = useRef(null);
    // Tracks the DB conversation ID for save operations (no stale-closure issues)
    const convIdRef = useRef(conversationId || null);
    // Sentinel: unique symbol so initial mount always triggers the load path
    const loadedConvRef = useRef(Symbol('init'));

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load / reset messages on external conversation navigation.
    // Guard: skip if this conversation was just created by us (loadedConvRef already set).
    useEffect(() => {
        convIdRef.current = conversationId || null;
        if (conversationId === loadedConvRef.current) return; // we created it — don't reload
        loadedConvRef.current = conversationId || null;

        if (!conversationId) {
            setMessages([]);
            return;
        }
        getConversationMessages(conversationId)
            .then(rows => setMessages(rows.map(r => ({ id: r.id, text: r.text, sender: r.sender }))))
            .catch(console.error);
    }, [conversationId]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue.trim();

        // Ensure a conversation row exists in DB before saving
        let convId = convIdRef.current;
        if (!convId) {
            try {
                const title = text.length > 60 ? text.slice(0, 57) + '…' : text;
                const conv = await createConversation(title, selectedLecture, selectedChapterId);
                convId = conv.id;
                convIdRef.current = convId;
                loadedConvRef.current = convId; // tell the effect: don't reload, we have messages
                onConversationCreated?.(convId);
            } catch (err) {
                console.error('Failed to create conversation:', err);
            }
        }

        // Persist user message immediately
        if (convId) saveMessage(convId, 'user', text).catch(console.error);

        const userMsg = { id: Date.now(), text, sender: 'user' };
        const botMsgId = Date.now() + 1;
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setMessages(prev => [...prev, { id: botMsgId, text: '', sender: 'system', streaming: true }]);

        try {
            let fullResponse = '';
            await sendMessageToGemini(text, selectedLecture, (_chunk, accumulated) => {
                fullResponse = accumulated;
                setMessages(prev => prev.map(m =>
                    m.id === botMsgId ? { ...m, text: accumulated } : m
                ));
            });
            setMessages(prev => prev.map(m =>
                m.id === botMsgId ? { ...m, streaming: false } : m
            ));
            // Persist bot response then refresh sidebar recents
            if (convId && fullResponse) {
                await saveMessage(convId, 'system', fullResponse);
                onRefreshRecent?.();
            }
        } catch (error) {
            setMessages(prev => prev.map(m =>
                m.id === botMsgId
                    ? { ...m, text: `Error: ${error.message || 'An unexpected error occurred.'}`, isError: true, streaming: false }
                    : m
            ));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isTeacher = currentRole === ROLES.TEACHER;
    const greeting = isTeacher ? UI_TEXT.CHAT.GREETING.TEACHER : UI_TEXT.CHAT.GREETING.STUDENT;
    const subGreeting = activeSubject
        ? `You are chatting with ${activeSubject.name}`
        : UI_TEXT.CHAT.SUB_GREETING;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            position: 'relative',
        }}>
            <style>{`
                .chat-input-box {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 1rem;
                    color: #141413;
                    background: transparent;
                    resize: none;
                    font-family: inherit;
                    line-height: 1.5;
                    min-height: 24px;
                    max-height: 120px;
                }
                .chat-input-box::placeholder { color: #87867f; }

                .send-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex-shrink: 0;
                }
                .send-btn.active {
                    background: #24386c;
                    color: #faf9f5;
                    box-shadow: #24386c 0px 0px 0px 0px, #24386c 0px 0px 0px 1px;
                }
                .send-btn.active:hover {
                    background: #1a2a50;
                    transform: scale(1.05);
                }
                .send-btn.inactive {
                    background: #e8e6dc;
                    color: #87867f;
                    cursor: default;
                }

                .msg-bubble {
                    padding: 0.75rem 1rem;
                    font-size: 0.9375rem;
                    line-height: 1.6;
                    border-radius: 16px;
                    max-width: 100%;
                    word-break: break-word;
                }
                .msg-bubble.user {
                    background: #24386c;
                    color: #faf9f5;
                    border-top-right-radius: 4px;
                }
                .msg-bubble.bot {
                    background: #faf9f5;
                    color: #141413;
                    border: 1px solid #f0eee6;
                    border-top-left-radius: 4px;
                    box-shadow: rgba(0,0,0,0.04) 0px 2px 8px;
                }
                .msg-bubble.error {
                    background: #fff5f5;
                    color: #b53333;
                    border: 1px solid #fed7d7;
                    border-top-left-radius: 4px;
                }

                /* ── Markdown content inside bot bubbles ── */
                .md-body { line-height: 1.7; }
                .md-body p { margin: 0 0 0.6em; }
                .md-body p:last-child { margin-bottom: 0; }
                .md-body h1, .md-body h2, .md-body h3, .md-body h4 {
                    font-weight: 700; margin: 0.9em 0 0.4em; line-height: 1.3;
                }
                .md-body h1 { font-size: 1.15em; }
                .md-body h2 { font-size: 1.05em; }
                .md-body h3 { font-size: 0.95em; }
                .md-body ul, .md-body ol {
                    margin: 0.4em 0 0.6em 1.2em; padding: 0;
                }
                .md-body li { margin-bottom: 0.25em; }
                .md-body li > ul, .md-body li > ol { margin: 0.2em 0 0.2em 1em; }
                .md-body code {
                    font-family: 'Menlo', 'Consolas', monospace;
                    font-size: 0.82em;
                    background: rgba(0,0,0,0.06);
                    padding: 0.15em 0.4em;
                    border-radius: 4px;
                }
                .md-body pre {
                    background: #1e1e2e;
                    color: #cdd6f4;
                    border-radius: 10px;
                    padding: 0.9em 1.1em;
                    overflow-x: auto;
                    margin: 0.6em 0;
                    font-size: 0.82em;
                    line-height: 1.55;
                }
                .md-body pre code {
                    background: none;
                    padding: 0;
                    color: inherit;
                    font-size: inherit;
                }
                .md-body blockquote {
                    border-left: 3px solid #c96442;
                    margin: 0.5em 0;
                    padding: 0.3em 0.8em;
                    color: #5e5d59;
                    font-style: italic;
                }
                .md-body table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 0.6em 0;
                    font-size: 0.88em;
                }
                .md-body th, .md-body td {
                    border: 1px solid #e8e6dc;
                    padding: 0.4em 0.7em;
                    text-align: left;
                }
                .md-body th { background: #f5f4ed; font-weight: 600; }
                .md-body tr:nth-child(even) td { background: #faf9f5; }
                .md-body strong { font-weight: 700; color: #141413; }
                .md-body em { font-style: italic; color: #5e5d59; }
                .md-body a { color: #c96442; text-decoration: underline; }
                .md-body hr { border: none; border-top: 1px solid #e8e6dc; margin: 0.7em 0; }

                /* Suggested prompts */
                .prompt-chip {
                    padding: 0.5rem 1rem;
                    border-radius: 24px;
                    border: 1px solid #f0eee6;
                    background: #faf9f5;
                    color: #5e5d59;
                    font-size: 0.875rem;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.15s;
                    white-space: nowrap;
                    box-shadow: rgba(0,0,0,0.03) 0px 2px 6px;
                }
                .prompt-chip:hover {
                    background: #f5f4ed;
                    border-color: #e8e6dc;
                    color: #141413;
                    box-shadow: rgba(0,0,0,0.06) 0px 3px 10px;
                }

                /* ── Dark mode overrides ── */
                [data-theme='dark'] .msg-bubble.bot {
                    background: var(--color-bg-chat-bot);
                    border-color: var(--color-border);
                    color: var(--color-text-primary);
                    box-shadow: none;
                }
                [data-theme='dark'] .msg-bubble.user {
                    background: #3a5298;
                }
                [data-theme='dark'] .chat-input-box {
                    color: var(--color-text-primary);
                }
                [data-theme='dark'] .chat-input-box::placeholder {
                    color: var(--color-text-tertiary);
                }
                [data-theme='dark'] .send-btn.inactive {
                    background: #27272a;
                    color: var(--color-text-tertiary);
                }
                [data-theme='dark'] .prompt-chip {
                    background: var(--color-bg-surface);
                    border-color: var(--color-border);
                    color: var(--color-text-secondary);
                }
                [data-theme='dark'] .prompt-chip:hover {
                    background: var(--color-bg-chat-bot);
                    color: var(--color-text-primary);
                }
                [data-theme='dark'] .md-body th { background: var(--color-bg-app); color: var(--color-text-primary); }
                [data-theme='dark'] .md-body th, [data-theme='dark'] .md-body td { border-color: var(--color-border); }
                [data-theme='dark'] .md-body tr:nth-child(even) td { background: var(--color-bg-app); }
                [data-theme='dark'] .md-body strong { color: var(--color-text-primary); }
                [data-theme='dark'] .md-body em { color: var(--color-text-secondary); }
                [data-theme='dark'] .md-body blockquote { color: var(--color-text-secondary); }
                [data-theme='dark'] .md-body hr { border-color: var(--color-border); }
                [data-theme='dark'] .md-body code { background: rgba(255,255,255,0.08); }
            `}</style>

            {/* Scrollable area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '5rem 3rem 140px',  /* top: clear the absolute profile button */
            }}>
                {messages.length === 0 ? (
                    /* ── Empty / home state ── */
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '60vh',
                        textAlign: 'center',
                        padding: '2rem',
                    }}>
                        {/* Mascot */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <LumminaMascot size={80} trickNumber={1} />
                        </div>

                        <h1 style={{
                            fontSize: '2.25rem',
                            fontFamily: "'Anthropic Serif', Georgia, serif",
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            margin: '0 0 0.625rem',
                            lineHeight: 1.1,
                            letterSpacing: '-0.025em',
                        }}>
                            {greeting}
                        </h1>
                        <p style={{
                            fontSize: '1.0625rem',
                            color: 'var(--color-text-secondary)',
                            margin: '0 0 2.5rem',
                            lineHeight: 1.6,
                            maxWidth: '420px',
                        }}>
                            {subGreeting}
                        </p>

                        {/* Suggested prompts */}
                        {activeSubject && (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.625rem',
                                justifyContent: 'center',
                                maxWidth: '560px',
                            }}>
                                {[
                                    'Summarise the key concepts',
                                    'What should I focus on for exams?',
                                    'Explain the hardest topic',
                                    'Create a study plan for me',
                                ].map(prompt => (
                                    <button
                                        key={prompt}
                                        className="prompt-chip"
                                        onClick={() => {
                                            setInputValue(prompt);
                                        }}
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!activeSubject && (
                            <p style={{
                                fontSize: '0.875rem',
                                color: 'var(--color-text-secondary)',
                                background: 'var(--color-bg-app)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                padding: '0.75rem 1.25rem',
                                maxWidth: '360px',
                            }}>
                                Select a subject from the sidebar to get started.
                            </p>
                        )}
                    </div>
                ) : (
                    /* ── Message list ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {messages.map((msg) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <div key={msg.id} style={{
                                    display: 'flex',
                                    gap: '0.875rem',
                                    flexDirection: isUser ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start',
                                }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        flexShrink: 0,
                                        background: isUser ? '#24386c' : '#f5f4ed',
                                        color: isUser ? '#faf9f5' : '#5e5d59',
                                        border: isUser ? 'none' : '1px solid #f0eee6',
                                    }}>
                                        {isUser ? (isTeacher ? 'T' : 'S') : '✦'}
                                    </div>

                                    {/* Content */}
                                    <div style={{ maxWidth: isUser ? '65%' : '80%' }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#87867f',
                                            marginBottom: '0.375rem',
                                            textAlign: isUser ? 'right' : 'left',
                                            letterSpacing: '0.02em',
                                        }}>
                                            {isUser ? (isTeacher ? 'You (Teacher)' : 'You') : 'Lummina'}
                                        </div>
                                        <div className={`msg-bubble ${isUser ? 'user' : msg.isError ? 'error' : 'bot'}`}>
                                            {msg.streaming && !msg.text ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                                                    <Skeleton width="85%" height="0.75em" borderRadius="4px" />
                                                    <Skeleton width="55%" height="0.75em" borderRadius="4px" />
                                                </div>
                                            ) : isUser ? msg.text : (
                                                <div className="md-body">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* ── Input bar ── */}
            <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '1rem 3rem 1.5rem',
                background: 'linear-gradient(to top, var(--color-bg-surface) 70%, transparent)',
            }}>
                <div style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    borderRadius: '16px',
                    padding: '0.75rem 0.75rem 0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '0.625rem',
                    border: isInputFocused
                        ? '1px solid #3898ec'
                        : '1px solid var(--color-border)',
                    boxShadow: isInputFocused
                        ? 'var(--color-bg-surface) 0px 0px 0px 2px, #3898ec 0px 0px 0px 4px'
                        : '0px 4px 16px rgba(0,0,0,0.06)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                }}>

                    <textarea
                        className="chat-input-box"
                        rows={1}
                        placeholder={UI_TEXT.CHAT.INPUT_PLACEHOLDER}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                    />
                    <button
                        className={`send-btn ${inputValue.trim() ? 'active' : 'inactive'}`}
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <p style={{
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    color: '#87867f',
                    marginTop: '0.625rem',
                    marginBottom: 0,
                    letterSpacing: '0.01em',
                }}>
                    {UI_TEXT.CHAT.DISCLAIMER}
                </p>
            </div>
        </div>
    );
};

ChatScreen.propTypes = {
    currentRole: PropTypes.string.isRequired,
    selectedLecture: PropTypes.string,
    selectedChapterId: PropTypes.string,
    conversationId: PropTypes.string,
    onConversationCreated: PropTypes.func,
    onRefreshRecent: PropTypes.func,
};

export default ChatScreen;
