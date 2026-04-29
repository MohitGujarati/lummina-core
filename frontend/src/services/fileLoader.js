/**
 * fileLoader.js — Dynamic file loader from Supabase Storage.
 * Returns the same format as tools.loadLectureFiles:
 *   Array<{ inlineData: { data: base64string, mimeType: string } }>
 */

import { supabase } from './supabase';
import { getSubjectFiles } from './subjectService';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
});

/**
 * Load all files for a subject from Supabase Storage.
 * @param {string} subjectId — UUID of the subject
 * @returns {Promise<Array<{inlineData: {data: string, mimeType: string}}>>}
 */
export const loadFilesForSubject = async (subjectId) => {
    // 1. Get file metadata from DB
    const files = await getSubjectFiles(subjectId);
    if (!files || files.length === 0) return [];

    const parts = [];

    for (const file of files) {
        // Skip unsupported or oversized files
        if (file.file_size && file.file_size > MAX_FILE_SIZE) continue;
        if (!SUPPORTED_MIME.includes(file.mime_type)) continue;

        try {
            // 2. Generate a 60-second signed URL
            const { data: signedData, error: signedError } = await supabase.storage
                .from('subject-files')
                .createSignedUrl(file.storage_path, 60);
            if (signedError) throw signedError;

            // 3. Fetch the file
            const response = await fetch(signedData.signedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();

            // 4. Double-check size after fetch
            if (blob.size > MAX_FILE_SIZE) continue;

            // 5. Convert to base64
            const base64 = await blobToBase64(blob);
            if (!base64 || base64.length < 100) continue;

            parts.push({ inlineData: { data: base64, mimeType: file.mime_type } });
        } catch (err) {
            console.error(`[fileLoader] Failed to load "${file.file_name}":`, err.message);
        }
    }

    return parts;
};
