import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../../common/Button/Button';
import Card from '../../common/Card/Card';
import { UI_TEXT } from '../../../config/constants';

const UploadModal = ({ isOpen, onClose, onUpload }) => {
    if (!isOpen) return null;

    const [files, setFiles] = useState([]);

    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleSubmit = () => {
        onUpload(files);
        setFiles([]); // Reset
        onClose();
    };



    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
        },
        modal: {
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'var(--color-bg-surface)',
            padding: '2rem',
        },
        title: {
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--color-primary)',
        },
        description: {
            color: 'var(--color-text-secondary)',
            marginBottom: '1.5rem',
        },
        dropZone: {
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '2rem',
            position: 'relative',
            backgroundColor: 'var(--color-bg-app)',
        },
        fileInput: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
        },
        dropLabel: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            pointerEvents: 'none',
        },
        icon: {
            fontSize: '2rem',
            color: 'var(--color-text-secondary)',
        },
        fileCount: {
            fontWeight: 600,
            color: 'var(--color-success)',
        },
        actions: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
        }
    };

    return (
        <div style={styles.overlay}>
            <Card style={styles.modal}>
                <h2 style={styles.title}>{UI_TEXT.UPLOAD_MODAL.TITLE}</h2>
                <p style={styles.description}>{UI_TEXT.UPLOAD_MODAL.DESC}</p>

                <div style={styles.dropZone}>
                    <input
                        type="file"
                        multiple
                        style={styles.fileInput}
                        onChange={handleFileChange}
                        id="modal-file-upload"
                    />
                    <label htmlFor="modal-file-upload" style={styles.dropLabel}>
                        <span style={styles.icon}>📄</span>
                        {files.length > 0 ? (
                            <span style={styles.fileCount}>{files.length} files selected</span>
                        ) : (
                            <span>{UI_TEXT.UPLOAD_MODAL.DRAG_DROP}</span>
                        )}
                    </label>
                </div>

                <div style={styles.actions}>
                    <Button variant="secondary" onClick={onClose}>
                        {UI_TEXT.UPLOAD_MODAL.CANCEL}
                    </Button>
                    <Button onClick={handleSubmit} disabled={files.length === 0}>
                        {UI_TEXT.UPLOAD_MODAL.UPLOAD}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

UploadModal.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    onUpload: PropTypes.func,
};

export default UploadModal;
