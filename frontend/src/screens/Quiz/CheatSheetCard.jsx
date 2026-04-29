import React, { useState } from 'react';
import { generateStudyGuide } from '../../services/gemini';

const CheatSheetCard = ({ quizTitle, weakPoints, quiz, answers, lectureId }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [cheatSheet, setCheatSheet] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            console.log("🎯 Generating cheat sheet...");
            const markdown = await generateStudyGuide(quiz, answers, lectureId);
            setCheatSheet(markdown);
            console.log("✅ Cheat sheet generated successfully");
        } catch (err) {
            console.error("❌ Cheat sheet generation failed:", err);
            setError(err.message || "Failed to generate study guide");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!cheatSheet) return;

        try {
            // Create the markdown file content
            const content = cheatSheet;
            const blob = new Blob([content], { type: 'text/markdown' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generate filename from quiz title
            const sanitizedTitle = quizTitle
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase();
            link.download = `cheat_sheet_${sanitizedTitle}_${Date.now()}.md`;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log("✅ Cheat sheet downloaded");
        } catch (err) {
            console.error("❌ Download failed:", err);
            setError("Failed to download file");
        }
    };

    const handleCopy = () => {
        if (!cheatSheet) return;

        navigator.clipboard.writeText(cheatSheet).then(() => {
            alert("✓ Copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy:", err);
            alert("❌ Failed to copy to clipboard");
        });
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <span style={styles.icon}>📝</span>
                    <div>
                        <h3 style={styles.title}>Personalized Study Guide</h3>
                        <p style={styles.subtitle}>
                            AI-generated cheat sheet focused on your weak areas
                        </p>
                    </div>
                </div>
            </div>

            {!cheatSheet && !isGenerating && (
                <div style={styles.content}>
                    <p style={styles.description}>
                        Generate a focused study guide based on the areas where you need improvement.
                        This will help you review key concepts efficiently.
                    </p>

                    {weakPoints.length > 0 && (
                        <div style={styles.weakPointsBox}>
                            <strong style={styles.weakPointsTitle}>Focus Areas:</strong>
                            <ul style={styles.weakPointsList}>
                                {weakPoints.slice(0, 3).map((point, i) => (
                                    <li key={i} style={styles.weakPoint}>{point}</li>
                                ))}
                                {weakPoints.length > 3 && (
                                    <li style={styles.weakPoint}>...and {weakPoints.length - 3} more</li>
                                )}
                            </ul>
                        </div>
                    )}

                    <button onClick={handleGenerate} style={styles.generateBtn}>
                        Generate Study Guide
                    </button>
                </div>
            )}

            {isGenerating && (
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Creating your personalized study guide...</p>
                    <p style={styles.loadingSubtext}>Analyzing your performance and extracting key concepts</p>
                </div>
            )}

            {cheatSheet && !isGenerating && (
                <div style={styles.resultContainer}>
                    <div style={styles.successBanner}>
                        <span style={styles.successIcon}>✓</span>
                        <span style={styles.successText}>Study guide ready!</span>
                    </div>

                    <div style={styles.previewBox}>
                        <div
                            style={styles.markdownPreview}
                            dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(cheatSheet) }}
                        />
                    </div>

                    <div style={styles.actions}>
                        <button onClick={handleDownload} style={styles.downloadBtn}>
                            <span style={styles.btnIcon}>⬇</span>
                            Download (.md)
                        </button>
                        <button onClick={handleCopy} style={styles.copyBtn}>
                            <span style={styles.btnIcon}>📋</span>
                            Copy to Clipboard
                        </button>
                        <button onClick={() => setCheatSheet(null)} style={styles.regenerateBtn}>
                            <span style={styles.btnIcon}>🔄</span>
                            Regenerate
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div style={styles.errorBox}>
                    <span style={styles.errorIcon}>⚠️</span>
                    <p style={styles.errorText}>{error}</p>
                    <button onClick={handleGenerate} style={styles.retryBtn}>
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

// Simple markdown to HTML converter for preview
function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';

    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Bullet lists
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `<div>${html}</div>`;
}

const styles = {
    container: {
        marginTop: '2rem',
        padding: '2rem',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: '12px',
        border: '2px dashed var(--color-primary)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
    },
    icon: {
        fontSize: '2rem'
    },
    title: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        margin: 0,
        marginBottom: '0.25rem'
    },
    subtitle: {
        fontSize: '0.85rem',
        color: 'var(--color-text-secondary)',
        margin: 0
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    description: {
        fontSize: '0.95rem',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.6',
        margin: 0
    },
    weakPointsBox: {
        padding: '1rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    weakPointsTitle: {
        fontSize: '0.85rem',
        color: 'var(--color-text-primary)',
        display: 'block',
        marginBottom: '0.75rem'
    },
    weakPointsList: {
        margin: 0,
        paddingLeft: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    weakPoint: {
        fontSize: '0.9rem',
        color: 'var(--color-text-secondary)',
        lineHeight: '1.5'
    },
    generateBtn: {
        padding: '0.875rem 2rem',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-bg-surface)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        alignSelf: 'flex-start'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        gap: '1rem'
    },
    spinner: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '4px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 1s linear infinite'
    },
    loadingText: {
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--color-text-primary)',
        margin: 0
    },
    loadingSubtext: {
        fontSize: '0.85rem',
        color: 'var(--color-text-tertiary)',
        margin: 0
    },
    resultContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    successBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderLeft: '3px solid var(--color-success)',
        borderRadius: '4px'
    },
    successIcon: {
        fontSize: '1.25rem',
        color: 'var(--color-success)'
    },
    successText: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: 'var(--color-success)'
    },
    previewBox: {
        maxHeight: '400px',
        overflowY: 'auto',
        padding: '1.5rem',
        backgroundColor: 'var(--color-bg-app)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
    },
    markdownPreview: {
        fontSize: '0.9rem',
        lineHeight: '1.7',
        color: 'var(--color-text-primary)'
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
    },
    downloadBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-bg-surface)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    copyBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: 'transparent',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    regenerateBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    },
    btnIcon: {
        fontSize: '1rem'
    },
    errorBox: {
        padding: '1.5rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderLeft: '3px solid var(--color-error)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'flex-start'
    },
    errorIcon: {
        fontSize: '1.5rem'
    },
    errorText: {
        fontSize: '0.9rem',
        color: 'var(--color-error)',
        margin: 0
    },
    retryBtn: {
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--color-error)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

// Add keyframes for spinner
if (typeof document !== 'undefined') {
    const styleSheet = document.styleSheets[0];
    if (styleSheet) {
        try {
            styleSheet.insertRule(`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `, styleSheet.cssRules.length);
        } catch (e) {
            // Style already exists
        }
    }
}

export default CheatSheetCard;