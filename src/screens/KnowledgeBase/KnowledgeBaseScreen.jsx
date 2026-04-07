import React, { useState, useRef, useEffect } from 'react';
import SourceCard from './components/SourceCard';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';

import { UI_TEXT } from '../../config/constants';

const KnowledgeBaseScreen = ({ onBack }) => {
    const [isDropZoneHovered, setIsDropZoneHovered] = useState(false);
    const [hoveredFileIndex, setHoveredFileIndex] = useState(null);
    const [hoveredLinkIndex, setHoveredLinkIndex] = useState(null);
    const [hoveredLinkText, setHoveredLinkText] = useState(false);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [showRecorderWidget, setShowRecorderWidget] = useState(false);
    const [isRecorderMinimized, setIsRecorderMinimized] = useState(false);
    // Master Folder State
    const [folders, setFolders] = useState([
        {
            id: 1,
            name: 'Lecture 1: Introduction to Physics',
            items: {
                docs: [
                    { name: 'Physics_Syllabus_2024.pdf', type: 'pdf' },
                    { name: 'Class_Notes_Week1.docx', type: 'doc' }
                ],
                links: [
                    { id: 101, text: 'Wikipedia - Quantum Mechanics', url: '#' }
                ],
                transcripts: [
                    { id: 1, date: 'Oct 24, 2023', duration: '45:20', text: 'Lecture 1: Introduction to Physics...' }
                ]
            }
        },
        {
            id: 2,
            name: 'Lecture 2: Newton Laws',
            items: {
                docs: [],
                links: [],
                transcripts: [
                    { id: 2, date: 'Oct 26, 2023', duration: '32:15', text: 'Lecture 2: Newton Laws of Motion...' }
                ]
            }
        }
    ]);
    const [selectedFolderId, setSelectedFolderId] = useState(1);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    // Derived State
    const currentFolder = folders.find(f => f.id === selectedFolderId) || folders[0];
    const transcripts = currentFolder.items.transcripts; // Keep variable name for minimal refactor
    const docs = currentFolder.items.docs;
    const links = currentFolder.items.links;
    const [selectedTranscript, setSelectedTranscript] = useState(null);
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    console.error("Stop error usually harmless:", e);
                }
            }
            clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
                setShowRecorderWidget(true);
                setIsRecorderMinimized(false);
                setRecordingTime(0);
                setLiveTranscript('');
                timerRef.current = setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);
            };

            recognition.onresult = (event) => {
                let currentTranscript = '';
                // Simple strategy: rebuild transcript from all available results every time
                // This handles both 'interim' and 'final' chunks correctly for a continuous session
                for (let i = 0; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setLiveTranscript(currentTranscript);
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                if (event.error === 'not-allowed') {
                    alert("Microphone access was denied. Please allow microphone access to record audio.");
                    stopRecording();
                }
            };

            recognition.onend = () => {
                // If it stops naturally (silence) or via stop(), we sync state
                // Note: We don't auto-save here to avoid duplicates if 'stopRecording' was called.
                // We rely on 'stopRecording' for the main save action.
            };

            recognitionRef.current = recognition;
            recognition.start();

        } catch (error) {
            console.error("Failed to initialize speech recognition:", error);
            alert("Could not start recording.");
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // ignore
            }
            recognitionRef.current = null;
        }
        clearInterval(timerRef.current);
        setIsRecording(false);
        setShowRecorderWidget(false);
        setIsRecorderMinimized(false);

        // Explicitly save the current live transcript
        if (liveTranscript && liveTranscript.trim().length > 0) {
            const newTranscript = {
                id: Date.now(),
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                duration: formatTime(recordingTime),
                text: liveTranscript
            };

            // Add to current folder
            setFolders(prev => prev.map(f => {
                if (f.id === selectedFolderId) {
                    return {
                        ...f,
                        items: {
                            ...f.items,
                            transcripts: [newTranscript, ...f.items.transcripts]
                        }
                    };
                }
                return f;
            }));
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };



    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleViewTranscript = (transcript) => {
        setSelectedTranscript(transcript);
    };

    const handleDeleteTranscript = (id) => {
        setFolders(prev => prev.map(f => {
            if (f.id === selectedFolderId) {
                return {
                    ...f,
                    items: {
                        ...f.items,
                        transcripts: f.items.transcripts.filter(t => t.id !== id)
                    }
                };
            }
            return f;
        }));
        setSelectedTranscript(null);
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        const newFolder = {
            id: Date.now(),
            name: newFolderName,
            items: { docs: [], links: [], transcripts: [] }
        };
        setFolders([...folders, newFolder]);
        setSelectedFolderId(newFolder.id);
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const handleEnhanceWithAI = () => {
        // Mock AI Enhancement
        alert("Enhancing transcript with AI...");
    };

    const styles = {
        // ... styles remain same until inputGroup ...
        container: {
            padding: '2.5rem',
            height: '100%',
            overflowY: 'auto',
            backgroundColor: 'var(--color-bg-app)',
        },
        pageHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--color-border)',
        },
        pageTitle: {
            fontSize: '1.875rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
        },
        pageSubtitle: {
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem',
        },
        stats: {
            display: 'flex',
            gap: '2.5rem',
        },
        folderManager: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '1rem',
        },
        tabsContainer: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
        },
        folderTab: (isActive) => ({
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
            backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-app)',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        }),
        addFolderBtn: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
        },
        inlineCreator: {
            position: 'absolute',
            top: '5.5rem',
            right: '2.5rem',
            backgroundColor: 'var(--color-bg-app)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            zIndex: 100,
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '2rem',
            paddingBottom: '2rem',
        },
        dropZone: {
            border: isDropZoneHovered ? '1px dashed var(--color-accent)' : '1px dashed var(--color-border-hover)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: isDropZoneHovered ? 'var(--color-accent-subtle)' : 'var(--color-bg-app)',
            transition: 'all 0.2s',
            marginBottom: '2rem',
            cursor: 'pointer',
        },
        uploadIcon: {
            fontSize: '2rem',
            color: isDropZoneHovered ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            transition: 'color 0.2s',
        },
        uploadText: {
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
        },
        sectionLabel: {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        itemList: {
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        listItem: (isHovered) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
            padding: '0.75rem 1rem',
            backgroundColor: isHovered ? 'var(--color-bg-chat-bot)' : 'var(--color-bg-app)',
            borderRadius: 'var(--radius-md)',
            border: isHovered ? '1px solid var(--color-border)' : '1px solid transparent',
            boxShadow: isHovered ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s',
        }),
        fileIcon: {
            fontSize: '0.625rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            backgroundColor: 'var(--color-primary-light)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
        },
        inputGroup: {
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '2rem',
        },
        linkText: {
            color: hoveredLinkText ? 'var(--color-accent)' : 'var(--color-text-primary)',
            textDecoration: 'none',
            fontWeight: 500,
        },
        emptyState: {
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.875rem',
            padding: '2rem',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
        },
        recorderContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            backgroundColor: isRecording ? 'var(--color-bg-chat-bot)' : 'var(--color-bg-app)',
            borderRadius: 'var(--radius-lg)',
            border: isRecording ? '1px solid var(--color-accent)' : '1px dashed var(--color-border)',
            transition: 'all 0.3s ease',
            marginBottom: '1.5rem',
        },
        recordButton: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isRecording ? '#ef4444' : 'var(--color-accent)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            marginBottom: '1rem',
            animation: isRecording ? 'pulse 1.5s infinite' : 'none',
        },
        recordIcon: {
            fontSize: '1.5rem',
            color: 'white',
        },
        transcriptItem: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-app)',
            marginBottom: '0.5rem',
            border: '1px solid var(--color-border)',
        },
        transcriptInfo: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
        },
        transcriptTitle: {
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
        },
        transcriptMeta: {
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            display: 'flex',
            gap: '0.5rem',
        }
        ,
        // Visualizer Bars Animation
        visualizerBar: (delay) => ({
            width: '6px',
            height: '100%',
            backgroundColor: 'currentColor',
            borderRadius: '4px',
            animation: 'soundWave 1s ease-in-out infinite',
            animationDelay: `${delay}s`,
        }),
        // Floating Widget Styles
        floatingWidget: (minimized) => ({
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: minimized ? 'auto' : '400px',
            backgroundColor: 'var(--color-bg-chat-bot)',
            backdropFilter: 'blur(16px)',
            borderRadius: minimized ? '50px' : '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--color-border)',
            padding: minimized ? '0.75rem 1.5rem' : '1.5rem',
            display: 'flex',
            flexDirection: minimized ? 'row' : 'column',
            alignItems: minimized ? 'center' : 'stretch',
            gap: minimized ? '1rem' : '1rem',
            zIndex: 2000,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }),
        widgetHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isRecorderMinimized ? 0 : '0.5rem',
        },
        widgetTitle: {
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        recDot: {
            width: '10px',
            height: '10px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            animation: 'pulseRed 1.5s infinite',
        },
        widgetTimer: {
            fontFamily: 'monospace',
            fontSize: isRecorderMinimized ? '1rem' : '1.5rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
        },
        visualizerContainer: {
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            margin: '0.5rem 0',
            color: 'var(--color-accent)',
        },
        liveCaptionBox: {
            height: '120px',
            overflowY: 'auto',
            padding: '0.75rem',
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: '12px',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
            marginBottom: '1rem',
            border: '1px solid rgba(0, 0, 0, 0.05)',
        },
        widgetControls: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
        },
        minimizeBtn: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '50%',
            color: 'var(--color-text-tertiary)',
            transition: 'background 0.2s',
        },
        stopBtn: {
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: isRecorderMinimized ? '0.5rem' : '0.75rem 1.5rem',
            borderRadius: isRecorderMinimized ? '50%' : '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            transition: 'transform 0.2s',
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
        },
        modalContent: {
            backgroundColor: 'var(--color-bg-app)',
            borderRadius: 'var(--radius-lg)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
        },
        modalHeader: {
            padding: '1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-chat-bot)',
        },
        modalTitle: {
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
        },
        closeButton: {
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            padding: '0.25rem',
        },
        modalBody: {
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            lineHeight: 1.6,
        },
        modalFooter: {
            padding: '1.25rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            backgroundColor: 'var(--color-bg-chat-bot)',
        },
        iconButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        backButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '1rem',
            transition: 'color 0.2s',
        }
    };

    return (
        <div style={styles.container}>
            <header style={styles.pageHeader}>
                <div>
                    {onBack && (
                        <button 
                            style={styles.backButton} 
                            onClick={onBack}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Chat
                        </button>
                    )}
                    <h1 style={styles.pageTitle}>{UI_TEXT.KB.HEADER.TITLE}</h1>
                    <p style={styles.pageSubtitle}>{UI_TEXT.KB.HEADER.SUBTITLE}</p>
                </div>
                {/* Folder Selector / Topic Manager */}
                <div style={styles.folderManager}>
                    <div style={styles.tabsContainer}>
                        {folders.map(folder => (
                            <button
                                key={folder.id}
                                style={styles.folderTab(selectedFolderId === folder.id)}
                                onClick={() => setSelectedFolderId(folder.id)}
                            >
                                📁 {folder.name}
                            </button>
                        ))}
                        <button
                            style={styles.addFolderBtn}
                            onClick={() => setIsCreatingFolder(true)}
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Create Folder Modal (Simple inline for now or improve later) */}
                {isCreatingFolder && (
                    <div style={styles.inlineCreator}>
                        <Input
                            placeholder="New Folder Name..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                        />
                        <Button size="sm" onClick={handleCreateFolder}>Create</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                    </div>
                )}
            </header>

            <div style={styles.grid}>
                {/* Documents Card */}
                <SourceCard
                    title={UI_TEXT.KB.CARDS.DOCUMENTS.TITLE}
                    icon="📄"
                    description={UI_TEXT.KB.CARDS.DOCUMENTS.DESC}
                    badge="Primary"
                >
                    <div
                        style={styles.dropZone}
                        onMouseEnter={() => setIsDropZoneHovered(true)}
                        onMouseLeave={() => setIsDropZoneHovered(false)}
                    >
                        <span style={styles.uploadIcon}>☁️</span>
                        <p style={styles.uploadText}>{UI_TEXT.KB.CARDS.DOCUMENTS.DROP_TEXT}</p>
                        <Button variant="secondary" size="sm">{UI_TEXT.KB.CARDS.DOCUMENTS.SELECT_BTN}</Button>
                    </div>
                    <div className={styles.recentUploads}>
                        <p style={styles.sectionLabel}>{UI_TEXT.KB.CARDS.DOCUMENTS.RECENT_LABEL}</p>
                        <ul style={styles.itemList}>
                            {docs.length > 0 ? docs.map((doc, idx) => (
                                <li
                                    key={idx}
                                    style={styles.listItem(hoveredFileIndex === idx)}
                                    onMouseEnter={() => setHoveredFileIndex(idx)}
                                    onMouseLeave={() => setHoveredFileIndex(null)}
                                >
                                    <span style={styles.fileIcon}>{doc.type}</span>
                                    <span>{doc.name}</span>
                                </li>
                            )) : (
                                <li style={styles.emptyState}>No documents in this folder</li>
                            )}
                        </ul>
                    </div>
                </SourceCard>

                {/* Web Links Card */}
                <SourceCard
                    title={UI_TEXT.KB.CARDS.LINKS.TITLE}
                    icon="🔗"
                    description={UI_TEXT.KB.CARDS.LINKS.DESC}
                >
                    <div style={styles.inputGroup}>
                        <Input placeholder={UI_TEXT.KB.CARDS.LINKS.PLACEHOLDER} />
                        <Button>{UI_TEXT.KB.CARDS.LINKS.ADD_BTN}</Button>
                    </div>
                    <ul style={styles.itemList}>
                        {links.length > 0 ? links.map((link, idx) => (
                            <li
                                key={link.id}
                                style={styles.listItem(hoveredLinkIndex === idx)}
                                onMouseEnter={() => setHoveredLinkIndex(idx)}
                                onMouseLeave={() => setHoveredLinkIndex(null)}
                            >
                                <span>🌐</span>
                                <a
                                    href={link.url}
                                    style={styles.linkText}
                                    onMouseEnter={() => setHoveredLinkText(true)}
                                    onMouseLeave={() => setHoveredLinkText(false)}
                                >
                                    {link.text}
                                </a>
                            </li>
                        )) : (
                            <li style={styles.emptyState}>No links in this folder</li>
                        )}
                    </ul>
                </SourceCard>

                {/* Media Links Card */}
                <SourceCard
                    title={UI_TEXT.KB.CARDS.VIDEO.TITLE}
                    icon="📺"
                    description={UI_TEXT.KB.CARDS.VIDEO.DESC}
                >
                    <div style={styles.inputGroup}>
                        <Input placeholder={UI_TEXT.KB.CARDS.VIDEO.PLACEHOLDER} />
                        <Button>{UI_TEXT.KB.CARDS.VIDEO.ADD_BTN}</Button>
                    </div>
                    <div style={styles.emptyState}>
                        {UI_TEXT.KB.CARDS.VIDEO.EMPTY}
                    </div>
                </SourceCard>

                {/* Audio Recorder Card (New) */}
                <SourceCard
                    title={UI_TEXT.KB.CARDS.AUDIO.TITLE}
                    icon="🎙️"
                    description={UI_TEXT.KB.CARDS.AUDIO.DESC}
                >
                    <div style={styles.recorderContainer}>
                        <button
                            style={styles.recordButton}
                            onClick={toggleRecording}
                            aria-label={isRecording ? UI_TEXT.KB.CARDS.AUDIO.BTN_STOP : UI_TEXT.KB.CARDS.AUDIO.BTN_START}
                        >
                            <span style={styles.recordIcon}>
                                {isRecording ? '⏹' : '🎙️'}
                            </span>
                        </button>
                    </div>

                    <div style={styles.recentUploads}>
                        <p style={styles.sectionLabel}>{UI_TEXT.KB.CARDS.AUDIO.RECENT_LABEL}</p>
                        <div style={styles.itemList}>
                            {transcripts.map((item) => (
                                <div key={item.id} style={styles.transcriptItem}>
                                    <div style={styles.transcriptInfo}>
                                        <span style={styles.transcriptTitle}>{item.text}</span>
                                        <div style={styles.transcriptMeta}>
                                            <span>📅 {item.date}</span>
                                            <span>⏱️ {item.duration}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewTranscript(item)}
                                    >
                                        {UI_TEXT.KB.CARDS.AUDIO.VIEW_BTN}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </SourceCard>
            </div>

            {/* Transcript Viewer Modal */}
            {selectedTranscript && (
                <div style={styles.modalOverlay} onClick={() => setSelectedTranscript(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{UI_TEXT.KB.MODAL.TITLE}</h3>
                            <button style={styles.closeButton} onClick={() => setSelectedTranscript(null)}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                {selectedTranscript.text}
                            </p>
                            <p>
                                [Full transcript content would appear here based on the recording duration...]
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                            </p>
                        </div>
                        <div style={styles.modalFooter}>
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteTranscript(selectedTranscript.id)}
                            >
                                🗑️ {UI_TEXT.KB.MODAL.DELETE_BTN}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => alert('Manual edit mode...')}
                            >
                                ✏️ {UI_TEXT.KB.MODAL.EDIT_BTN}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleEnhanceWithAI}
                            >
                                ✨ {UI_TEXT.KB.MODAL.ENHANCE_BTN}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Recorder Widget */}
            {showRecorderWidget && (
                <div style={styles.floatingWidget(isRecorderMinimized)}>
                    <div style={styles.widgetHeader}>
                        <div style={styles.widgetTitle}>
                            <span style={styles.recDot} />
                            {isRecorderMinimized ? '' : 'Recording...'}
                        </div>
                        <div style={styles.widgetTimer}>
                            {formatTime(recordingTime)}
                        </div>
                    </div>

                    {!isRecorderMinimized && (
                        <>
                            <div style={styles.visualizerContainer}>
                                {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
                                    <div key={i} style={styles.visualizerBar(delay)} />
                                ))}
                            </div>
                            <div style={styles.liveCaptionBox}>
                                {liveTranscript || "Listening..."}
                            </div>
                        </>
                    )}

                    <div style={styles.widgetControls}>
                        <button
                            style={styles.minimizeBtn}
                            onClick={() => setIsRecorderMinimized(!isRecorderMinimized)}
                            title={isRecorderMinimized ? "Expand" : "Minimize"}
                        >
                            {isRecorderMinimized ? '↗️' : '⬇️'}
                        </button>
                        <button
                            style={styles.stopBtn}
                            onClick={stopRecording}
                        >
                            <span>⏹</span>
                            {!isRecorderMinimized && "Stop Recording"}
                        </button>
                    </div>
                </div>
            )}

            {/* Global Styles for Animations */}
            <style>
                {`
                    @keyframes pulseRed {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(0.9); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes soundWave {
                        0%, 100% { height: 30%; }
                        50% { height: 100%; }
                    }
                `}
            </style>

        </div>
    );
};



export default KnowledgeBaseScreen;
