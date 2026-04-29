import React, { useState, useEffect } from 'react';
import Header from '../../components/common/Header/Header';
import Button from '../../components/common/Button/Button';
import { UI_TEXT } from '../../config/constants';

const TeacherDashboard = ({ onBack }) => {
    const [files, setFiles] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files || e.dataTransfer.files);
        const newFiles = selectedFiles.map(file => ({
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            type: file.type,
            date: new Date().toLocaleDateString(),
            status: 'Ready'
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFileSelect(e);
    };

    const styles = {
        container: {
            minHeight: '100vh',
            backgroundColor: 'var(--color-bg-app)',
        },
        main: {
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '2rem',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', // Asymmetric grid for interest
            gap: '2.5rem',
            alignItems: 'start',
        },
        sectionTitle: {
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        // Upload Styles
        uploadCard: {
            minHeight: '320px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isDragOver ? '2px dashed var(--color-accent)' : '2px dashed var(--color-border)',
            background: isDragOver ? 'var(--color-accent-subtle)' : 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            transition: 'all 0.2s ease',
            cursor: 'default',
        },
        uploadZone: {
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '2rem',
        },
        uploadIconCircle: {
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            backgroundColor: 'var(--color-bg-app)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'var(--color-text-secondary)',
            marginBottom: '0.5rem',
        },
        uploadText: {
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            lineHeight: 1.5,
            maxWidth: '300px',
        },
        hiddenInput: {
            display: 'none',
        },
        // List Styles
        fileListCard: {
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            minHeight: '320px',
            boxShadow: 'var(--shadow-sm)',
        },
        emptyState: {
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            padding: '4rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
        },
        fileList: {
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
        },
        fileItem: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            transition: 'background 0.2s',
        },
        fileInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        fileIcon: {
            fontSize: '1.25rem',
            color: 'var(--color-text-tertiary)',
        },
        fileName: {
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            fontSize: '0.9rem',
        },
        fileMeta: {
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            marginTop: '0.125rem',
        },
        statusBadge: {
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-success)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            padding: '0.25rem 0.625rem',
            borderRadius: 'var(--radius-full)',
        }
    };

    return (
        <div style={styles.container}>
            <Header onBack={onBack} />

            <main style={styles.main}>
                <div style={styles.grid}>
                    {/* Upload Section */}
                    <section>
                        <h2 style={styles.sectionTitle}>{UI_TEXT.TEACHER.UPLOAD_TITLE}</h2>

                        <div
                            style={styles.uploadCard}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                        >
                            <div style={styles.uploadZone}>
                                <div style={styles.uploadIconCircle}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                <p style={styles.uploadText}>{UI_TEXT.TEACHER.UPLOAD_DESC}</p>
                                <input
                                    type="file"
                                    id="file-upload"
                                    multiple
                                    style={styles.hiddenInput}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                                />
                                <Button onClick={() => document.getElementById('file-upload').click()}>
                                    {UI_TEXT.TEACHER.UPLOAD_BTN}
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* File List Section */}
                    <section>
                        <h2 style={styles.sectionTitle}>{UI_TEXT.TEACHER.FILES_LIST_TITLE}</h2>

                        <div style={styles.fileListCard}>
                            {files.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '2rem', opacity: 0.3 }}>📂</span>
                                    {UI_TEXT.TEACHER.NO_FILES}
                                </div>
                            ) : (
                                <ul style={styles.fileList}>
                                    {files.map((file, index) => (
                                        <li key={index} style={styles.fileItem}>
                                            <div style={styles.fileInfo}>
                                                <span style={styles.fileIcon}>📄</span>
                                                <div>
                                                    <p style={styles.fileName}>{file.name}</p>
                                                    <p style={styles.fileMeta}>{file.size} • {file.date}</p>
                                                </div>
                                            </div>
                                            <span style={styles.statusBadge}>{file.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
