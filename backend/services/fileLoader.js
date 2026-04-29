/**
 * server/services/fileLoader.js
 * Server-side file loading from Supabase Storage using the service role key.
 * Mirrors src/services/fileLoader.js but runs in Node.js (no browser APIs).
 */

import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];

// Use service role key — never exposed to frontend
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fetch file metadata rows for a subject from the DB.
 */
const getSubjectFiles = async (subjectId) => {
    const { data, error } = await supabase
        .from('subject_files')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch file list: ${error.message}`);
    return data || [];
};

/**
 * Convert an ArrayBuffer to a base64 string (Node.js compatible).
 */
const arrayBufferToBase64 = (buffer) => {
    return Buffer.from(buffer).toString('base64');
};

/**
 * Load all files for a subject from Supabase Storage.
 * Returns the same Part[] format that the Gemini SDK expects.
 *
 * @param {string} subjectId — UUID of the subject
 * @returns {Promise<Array<{inlineData: {data: string, mimeType: string}}>>}
 */
export const loadFilesForSubject = async (subjectId) => {
    const files = await getSubjectFiles(subjectId);
    if (!files || files.length === 0) return [];

    const parts = [];

    for (const file of files) {
        if (file.file_size && file.file_size > MAX_FILE_SIZE) continue;
        if (!SUPPORTED_MIME.includes(file.mime_type)) continue;

        try {
            // Generate a short-lived signed URL
            const { data: signedData, error: signedError } = await supabase.storage
                .from('subject-files')
                .createSignedUrl(file.storage_path, 60);

            if (signedError) throw signedError;

            const response = await fetch(signedData.signedUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const buffer = await response.arrayBuffer();
            if (buffer.byteLength > MAX_FILE_SIZE) continue;

            const base64 = arrayBufferToBase64(buffer);
            if (!base64 || base64.length < 100) continue;

            parts.push({ inlineData: { data: base64, mimeType: file.mime_type } });
        } catch (err) {
            console.error(`[server/fileLoader] Failed to load "${file.file_name}":`, err.message);
        }
    }

    return parts;
};
