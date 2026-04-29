import { useState, useEffect, useRef } from 'react';
import { useSubjects } from '../../context/SubjectContext';
import { createSubject, deleteSubject, getSubjectFiles, uploadSubjectFile, deleteSubjectFile, getSubjectChapters, createChapter, deleteChapter } from '../../services/subjectService';
import { supabase } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (mimeType = '') => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
    if (mimeType.includes('text')) return 'TXT';
    if (mimeType.includes('image')) return 'IMG';
    return 'FILE';
};

const generateCode = (name) => {
    const words = name.trim().toUpperCase().split(/\s+/);
    const base = words.map(w => w.slice(0, 3)).join('').slice(0, 6);
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${base}${suffix}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const KnowledgeBaseScreen = ({ onBack, onRefreshSubjects }) => {
    const { teacherSubjects, refreshTeacherSubjects } = useSubjects();
    const { addToast } = useToast();

    const [activeSubjectId, setActiveSubjectId] = useState(null);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState(null);

    // Create subject modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newSubjectCode, setNewSubjectCode] = useState('');
    const [newSubjectDesc, setNewSubjectDesc] = useState('');
    const [creatingSubject, setCreatingSubject] = useState(false);

    // Delete subject confirm
    const [deletingSubjectId, setDeletingSubjectId] = useState(null);

    // Chapters
    const [chapters, setChapters] = useState([]);
    const [activeChapterId, setActiveChapterId] = useState(null); // null = General
    const [showCreateChapterModal, setShowCreateChapterModal] = useState(false);
    const [newChapterTitle, setNewChapterTitle] = useState('');
    const [newChapterDesc, setNewChapterDesc] = useState('');
    const [creatingChapter, setCreatingChapter] = useState(false);
    const [deletingChapterId, setDeletingChapterId] = useState(null);

    // Copied code state
    const [codeCopied, setCodeCopied] = useState(false);

    const fileInputRef = useRef(null);

    // Auto-select first subject
    useEffect(() => {
        if (teacherSubjects?.length > 0 && !activeSubjectId) {
            setActiveSubjectId(teacherSubjects[0].id);
        }
    }, [teacherSubjects]);

    // Load chapters when active subject changes; reset active chapter
    useEffect(() => {
        if (!activeSubjectId) { setChapters([]); return; }
        setActiveChapterId(null);
        let cancelled = false;
        getSubjectChapters(activeSubjectId)
            .then(data => { if (!cancelled) setChapters(data); })
            .catch(() => { if (!cancelled) setChapters([]); });
        return () => { cancelled = true; };
    }, [activeSubjectId]);

    // Load files when active subject or active chapter changes
    useEffect(() => {
        if (!activeSubjectId) return;
        let cancelled = false;
        setLoadingFiles(true);
        getSubjectFiles(activeSubjectId, activeChapterId)
            .then(data => { if (!cancelled) setFiles(data); })
            .catch(() => { if (!cancelled) setFiles([]); })
            .finally(() => { if (!cancelled) setLoadingFiles(false); });
        return () => { cancelled = true; };
    }, [activeSubjectId, activeChapterId]);

    const activeSubject = teacherSubjects?.find(s => s.id === activeSubjectId);

    // ── File Upload ──────────────────────────────────────────────────────────
    const handleUploadFiles = async (fileList) => {
        if (!activeSubjectId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { addToast('Not authenticated', 'error'); return; }

        setUploadingFiles(true);
        let successCount = 0;
        for (const file of Array.from(fileList)) {
            try {
                await uploadSubjectFile(activeSubjectId, user.id, file, activeChapterId);
                successCount++;
            } catch (err) {
                addToast(`Failed to upload ${file.name}: ${err.message}`, 'error');
            }
        }
        if (successCount > 0) {
            addToast(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`, 'success');
            const updated = await getSubjectFiles(activeSubjectId);
            setFiles(updated);
        }
        setUploadingFiles(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleUploadFiles(e.dataTransfer.files);
    };

    const handleDeleteFile = async (file) => {
        setDeletingFileId(file.id);
        try {
            await deleteSubjectFile(file.id, file.storage_path);
            setFiles(prev => prev.filter(f => f.id !== file.id));
            addToast('File removed', 'success');
        } catch (err) {
            addToast(`Delete failed: ${err.message}`, 'error');
        }
        setDeletingFileId(null);
    };

    // ── Create Subject ───────────────────────────────────────────────────────
    const openCreateModal = () => {
        setNewSubjectName('');
        setNewSubjectCode('');
        setNewSubjectDesc('');
        setShowCreateModal(true);
    };

    const handleNameChange = (val) => {
        setNewSubjectName(val);
        if (val.trim()) setNewSubjectCode(generateCode(val));
        else setNewSubjectCode('');
    };

    const handleCreateSubject = async () => {
        if (!newSubjectName.trim() || !newSubjectCode.trim()) return;
        setCreatingSubject(true);
        try {
            const created = await createSubject(newSubjectCode, newSubjectName, newSubjectDesc);
            await refreshTeacherSubjects();
            setActiveSubjectId(created.id);
            setShowCreateModal(false);
            addToast(`Subject "${newSubjectName}" created`, 'success');
            if (onRefreshSubjects) onRefreshSubjects();
        } catch (err) {
            addToast(err.message?.includes('duplicate') ? 'Code already taken — try editing it' : err.message, 'error');
        }
        setCreatingSubject(false);
    };

    // ── Delete Subject ───────────────────────────────────────────────────────
    const handleDeleteSubject = async (subjectId) => {
        try {
            await deleteSubject(subjectId);
            await refreshTeacherSubjects();
            setDeletingSubjectId(null);
            if (activeSubjectId === subjectId) {
                const remaining = teacherSubjects?.filter(s => s.id !== subjectId);
                setActiveSubjectId(remaining?.length > 0 ? remaining[0].id : null);
                setFiles([]);
            }
            addToast('Subject deleted', 'success');
            if (onRefreshSubjects) onRefreshSubjects();
        } catch (err) {
            addToast(`Delete failed: ${err.message}`, 'error');
        }
    };

    const copyCode = () => {
        if (!activeSubject) return;
        navigator.clipboard.writeText(activeSubject.code);
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    // ── Chapter Handlers ─────────────────────────────────────────────────────
    const openCreateChapterModal = () => {
        setNewChapterTitle('');
        setNewChapterDesc('');
        setShowCreateChapterModal(true);
    };

    const handleCreateChapter = async () => {
        if (!newChapterTitle.trim() || !activeSubjectId) return;
        setCreatingChapter(true);
        try {
            const created = await createChapter(activeSubjectId, newChapterTitle, newChapterDesc, chapters.length);
            setChapters(prev => [...prev, created]);
            setActiveChapterId(created.id);
            setShowCreateChapterModal(false);
            addToast(`Chapter "${newChapterTitle}" created`, 'success');
        } catch (err) {
            addToast(`Failed to create chapter: ${err.message}`, 'error');
        }
        setCreatingChapter(false);
    };

    const handleDeleteChapter = async (chapterId) => {
        try {
            await deleteChapter(chapterId);
            setChapters(prev => prev.filter(c => c.id !== chapterId));
            if (activeChapterId === chapterId) setActiveChapterId(null);
            setDeletingChapterId(null);
            addToast('Chapter deleted', 'success');
        } catch (err) {
            addToast(`Delete failed: ${err.message}`, 'error');
        }
    };

    // ── Styles ───────────────────────────────────────────────────────────────
    const s = {
        container: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-app)',
            overflow: 'hidden',
        },
        header: {
            padding: '1.75rem 2.5rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
        },
        backBtn: {
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
            marginBottom: '0.75rem',
        },
        pageTitle: {
            fontSize: '1.6rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: '0.3rem',
        },
        pageSubtitle: {
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
        },
        body: {
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
        },
        // Left panel — subject list
        subjectPanel: {
            width: '240px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            gap: '0.25rem',
            overflowY: 'auto',
        },
        subjectPanelLabel: {
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '0.25rem 0.5rem',
            marginBottom: '0.25rem',
        },
        subjectRow: (active) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            backgroundColor: active ? 'rgba(36,56,108,0.1)' : 'transparent',
            borderLeft: active ? '3px solid #24386c' : '3px solid transparent',
            transition: 'all 0.15s',
        }),
        subjectRowName: (active) => ({
            fontSize: '0.875rem',
            fontWeight: active ? 600 : 400,
            color: active ? '#24386c' : 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        }),
        subjectRowCode: {
            fontSize: '0.7rem',
            color: 'var(--color-text-tertiary)',
            marginTop: '1px',
        },
        deleteSubjectBtn: {
            background: 'none',
            border: 'none',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            padding: '0.15rem',
            fontSize: '0.85rem',
            borderRadius: '3px',
            flexShrink: 0,
            opacity: 0.6,
        },
        createSubjectBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.6rem 0.75rem',
            background: 'none',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: '#24386c',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '0.5rem',
            transition: 'all 0.15s',
        },
        // Right panel — file manager
        filePanel: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        },
        filePanelHeader: {
            padding: '1.5rem 2rem 1rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
        },
        subjectNameHeading: {
            fontSize: '1.15rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '0.5rem',
        },
        codePill: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.85rem',
            backgroundColor: 'rgba(36,56,108,0.08)',
            border: '1px solid rgba(36,56,108,0.2)',
            borderRadius: '50px',
            cursor: 'pointer',
        },
        codeLabel: {
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#24386c',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        codeValue: {
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#24386c',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
        },
        copyHint: {
            fontSize: '0.7rem',
            color: '#24386c',
            opacity: 0.7,
        },
        filePanelBody: {
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem 2rem',
        },
        dropZone: {
            border: isDragOver ? '2px dashed #24386c' : '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: isDragOver ? 'rgba(36,56,108,0.04)' : 'transparent',
            transition: 'all 0.2s',
            cursor: 'pointer',
            marginBottom: '2rem',
        },
        dropZoneText: {
            fontSize: '0.9rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.75rem',
        },
        uploadBtn: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.4rem',
            backgroundColor: '#24386c',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
        },
        sectionLabel: {
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
        },
        fileList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
        },
        fileRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
        },
        fileTypeBadge: (type) => ({
            fontSize: '0.6rem',
            fontWeight: 800,
            backgroundColor: type === 'PDF' ? '#ef4444' : type === 'DOC' ? '#2563eb' : '#6b7280',
            color: 'white',
            padding: '0.2rem 0.45rem',
            borderRadius: '4px',
            letterSpacing: '0.03em',
            flexShrink: 0,
        }),
        fileName: {
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)',
            fontWeight: 500,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        fileSize: {
            fontSize: '0.78rem',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
        },
        fileDeleteBtn: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            padding: '0.25rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
        },
        emptyState: {
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.875rem',
        },
        noSubjectState: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: 'var(--color-text-secondary)',
        },
        // Modal
        overlay: {
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)',
        },
        modal: {
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
        },
        modalTitle: {
            fontSize: '1.2rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '1.5rem',
        },
        formGroup: { marginBottom: '1.1rem' },
        label: {
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: '0.4rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
        },
        input: {
            width: '100%',
            padding: '0.65rem 0.9rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-app)',
            color: 'var(--color-text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
        },
        codeInput: {
            width: '100%',
            padding: '0.65rem 0.9rem',
            border: '1.5px solid rgba(36,56,108,0.3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(36,56,108,0.04)',
            color: '#24386c',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            outline: 'none',
            boxSizing: 'border-box',
            textTransform: 'uppercase',
        },
        modalActions: {
            display: 'flex', gap: '0.75rem', marginTop: '1.5rem',
            justifyContent: 'flex-end',
        },
        cancelBtn: {
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
        },
        confirmBtn: (disabled) => ({
            padding: '0.65rem 1.5rem',
            backgroundColor: disabled ? '#9ca3af' : '#24386c',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
        }),
        confirmDeleteBtn: {
            padding: '0.65rem 1.5rem',
            backgroundColor: '#ef4444',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
        },
        // Chapters bar
        chaptersBar: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.75rem 2rem',
            borderBottom: '1px solid var(--color-border)',
            overflowX: 'auto',
            flexShrink: 0,
        },
        chapterTab: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '50px',
            border: active ? '1.5px solid #24386c' : '1.5px solid var(--color-border)',
            backgroundColor: active ? 'rgba(36,56,108,0.1)' : 'transparent',
            color: active ? '#24386c' : 'var(--color-text-secondary)',
            fontSize: '0.82rem',
            fontWeight: active ? 600 : 400,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s',
        }),
        chapterTabDelete: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: '0.95rem',
            lineHeight: 1,
            padding: 0,
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
        },
        addChapterBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '50px',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: '#24386c',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
        },
    };

    const noSubjectSelected = !activeSubject;

    return (
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                {onBack && (
                    <button style={s.backBtn} onClick={onBack}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back to Chat
                    </button>
                )}
                <h1 style={s.pageTitle}>Knowledge Base</h1>
                <p style={s.pageSubtitle}>Manage your subjects and upload materials for students</p>
            </div>

            <div style={s.body}>
                {/* Subject Panel */}
                <div style={s.subjectPanel}>
                    <div style={s.subjectPanelLabel}>Subjects</div>
                    {teacherSubjects?.length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', padding: '0.5rem', fontStyle: 'italic' }}>
                            No subjects yet
                        </div>
                    )}
                    {teacherSubjects?.map(subject => (
                        <div
                            key={subject.id}
                            style={s.subjectRow(activeSubjectId === subject.id)}
                            onClick={() => setActiveSubjectId(subject.id)}
                        >
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                <div style={s.subjectRowName(activeSubjectId === subject.id)}>{subject.name}</div>
                                <div style={s.subjectRowCode}>{subject.code}</div>
                            </div>
                            <button
                                style={s.deleteSubjectBtn}
                                title="Delete subject"
                                onClick={e => { e.stopPropagation(); setDeletingSubjectId(subject.id); }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button style={s.createSubjectBtn} onClick={openCreateModal}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(36,56,108,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Subject
                    </button>
                </div>

                {/* File Panel */}
                <div style={s.filePanel}>
                    {noSubjectSelected ? (
                        <div style={s.noSubjectState}>
                            <span style={{ fontSize: '2.5rem' }}>📚</span>
                            <p>Select a subject or create one to get started</p>
                            <button style={{ ...s.uploadBtn, marginTop: '0.5rem' }} onClick={openCreateModal}>
                                + Create Subject
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={s.filePanelHeader}>
                                <div style={s.subjectNameHeading}>{activeSubject.name}</div>
                                <div
                                    style={s.codePill}
                                    onClick={copyCode}
                                    title="Click to copy code"
                                >
                                    <span style={s.codeLabel}>Class Code</span>
                                    <span style={s.codeValue}>{activeSubject.code}</span>
                                    <span style={s.copyHint}>{codeCopied ? '✓ Copied!' : 'Copy'}</span>
                                </div>
                                {activeSubject.description && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                                        {activeSubject.description}
                                    </p>
                                )}
                            </div>
                            {/* Chapters Bar */}
                            <div style={s.chaptersBar}>
                                {/* General tab — always present */}
                                <div
                                    style={s.chapterTab(activeChapterId === null)}
                                    onClick={() => setActiveChapterId(null)}
                                >
                                    General
                                </div>
                                {chapters.map(ch => (
                                    <div
                                        key={ch.id}
                                        style={s.chapterTab(activeChapterId === ch.id)}
                                        onClick={() => setActiveChapterId(ch.id)}
                                    >
                                        {ch.title}
                                        <button
                                            style={s.chapterTabDelete}
                                            title="Delete chapter"
                                            onClick={e => { e.stopPropagation(); setDeletingChapterId(ch.id); }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button style={s.addChapterBtn} onClick={openCreateChapterModal}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Chapter
                                </button>
                            </div>

                            <div style={s.filePanelBody}>
                                {/* Drop Zone */}
                                <div
                                    style={s.dropZone}
                                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <p style={s.dropZoneText}>
                                        {uploadingFiles ? 'Uploading...' : 'Drag & drop files here or click to browse'}
                                    </p>
                                    <button style={s.uploadBtn} disabled={uploadingFiles}
                                        onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    >
                                        {uploadingFiles ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                                <path d="M21 12a9 9 0 11-6.219-8.56" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                                                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                                            </svg>
                                        )}
                                        {uploadingFiles ? 'Uploading…' : 'Upload Files'}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                                        style={{ display: 'none' }}
                                        onChange={e => handleUploadFiles(e.target.files)}
                                    />
                                </div>

                                {/* File List */}
                                <div style={s.sectionLabel}>
                                    Uploaded Materials ({files.length})
                                </div>
                                {loadingFiles ? (
                                    <div style={s.emptyState}>Loading files…</div>
                                ) : files.length === 0 ? (
                                    <div style={s.emptyState}>No files uploaded yet. Upload PDFs, docs, or notes above.</div>
                                ) : (
                                    <div style={s.fileList}>
                                        {files.map(file => {
                                            const typeLabel = fileTypeLabel(file.mime_type);
                                            return (
                                                <div key={file.id} style={s.fileRow}>
                                                    <span style={s.fileTypeBadge(typeLabel)}>{typeLabel}</span>
                                                    <span style={s.fileName}>{file.file_name}</span>
                                                    <span style={s.fileSize}>{formatBytes(file.file_size)}</span>
                                                    <button
                                                        style={s.fileDeleteBtn}
                                                        title="Remove file"
                                                        disabled={deletingFileId === file.id}
                                                        onClick={() => handleDeleteFile(file)}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6l-1 14H6L5 6" />
                                                            <path d="M10 11v6M14 11v6" />
                                                            <path d="M9 6V4h6v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Create Subject Modal */}
            {showCreateModal && (
                <div style={s.overlay} onClick={() => setShowCreateModal(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={s.modalTitle}>Create New Subject</h2>
                        <div style={s.formGroup}>
                            <label style={s.label}>Subject Name</label>
                            <input
                                style={s.input}
                                placeholder="e.g. Introduction to Physics"
                                value={newSubjectName}
                                onChange={e => handleNameChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={s.formGroup}>
                            <label style={s.label}>Class Code <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, textTransform: 'none', fontSize: '0.75rem' }}>(share this with students)</span></label>
                            <input
                                style={s.codeInput}
                                placeholder="Auto-generated"
                                value={newSubjectCode}
                                onChange={e => setNewSubjectCode(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div style={s.formGroup}>
                            <label style={s.label}>Description <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                            <input
                                style={s.input}
                                placeholder="Brief description of this subject"
                                value={newSubjectDesc}
                                onChange={e => setNewSubjectDesc(e.target.value)}
                            />
                        </div>
                        <div style={s.modalActions}>
                            <button style={s.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                            <button
                                style={s.confirmBtn(!newSubjectName.trim() || !newSubjectCode.trim() || creatingSubject)}
                                disabled={!newSubjectName.trim() || !newSubjectCode.trim() || creatingSubject}
                                onClick={handleCreateSubject}
                            >
                                {creatingSubject ? 'Creating…' : 'Create Subject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Subject Confirm Modal */}
            {deletingSubjectId && (
                <div style={s.overlay} onClick={() => setDeletingSubjectId(null)}>
                    <div style={{ ...s.modal, maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Subject?</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            This will permanently delete the subject and all its uploaded files. Students will lose access. This cannot be undone.
                        </p>
                        <div style={s.modalActions}>
                            <button style={s.cancelBtn} onClick={() => setDeletingSubjectId(null)}>Cancel</button>
                            <button style={s.confirmDeleteBtn} onClick={() => handleDeleteSubject(deletingSubjectId)}>
                                Delete Subject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Chapter Modal */}
            {showCreateChapterModal && (
                <div style={s.overlay} onClick={() => setShowCreateChapterModal(false)}>
                    <div style={s.modal} onClick={e => e.stopPropagation()}>
                        <h2 style={s.modalTitle}>Add New Chapter</h2>
                        <div style={s.formGroup}>
                            <label style={s.label}>Chapter Title</label>
                            <input
                                style={s.input}
                                placeholder="e.g. Introduction to Mechanics"
                                value={newChapterTitle}
                                onChange={e => setNewChapterTitle(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreateChapter()}
                            />
                        </div>
                        <div style={s.formGroup}>
                            <label style={s.label}>Description <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                            <input
                                style={s.input}
                                placeholder="Brief description of this chapter"
                                value={newChapterDesc}
                                onChange={e => setNewChapterDesc(e.target.value)}
                            />
                        </div>
                        <div style={s.modalActions}>
                            <button style={s.cancelBtn} onClick={() => setShowCreateChapterModal(false)}>Cancel</button>
                            <button
                                style={s.confirmBtn(!newChapterTitle.trim() || creatingChapter)}
                                disabled={!newChapterTitle.trim() || creatingChapter}
                                onClick={handleCreateChapter}
                            >
                                {creatingChapter ? 'Creating…' : 'Add Chapter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Chapter Confirm Modal */}
            {deletingChapterId && (
                <div style={s.overlay} onClick={() => setDeletingChapterId(null)}>
                    <div style={{ ...s.modal, maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ ...s.modalTitle, marginBottom: '0.75rem' }}>Delete Chapter?</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            This will permanently delete the chapter. Files in this chapter will be moved to General. This cannot be undone.
                        </p>
                        <div style={s.modalActions}>
                            <button style={s.cancelBtn} onClick={() => setDeletingChapterId(null)}>Cancel</button>
                            <button style={s.confirmDeleteBtn} onClick={() => handleDeleteChapter(deletingChapterId)}>
                                Delete Chapter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default KnowledgeBaseScreen;
