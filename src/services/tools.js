/* ============================================================================
   TOOLS — Agent capabilities for interacting with the world
   All Gemini calls should go through callGemini() for unified quota tracking
   ============================================================================ */

import { agentMemory } from './memory.js';

// ── Asset discovery (Vite glob, resolved at build time) ──────────────────────

const allAssetModules = {
    ...import.meta.glob('/src/assets/**/*.pdf',  { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.txt',  { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpg',  { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpeg', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.png',  { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.webp', { eager: true, query: '?url', import: 'default' }),
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];

// ── Quota tracking — persisted per calendar day, covers ALL agents ───────────

const _todayKey = () => `lummina_quota_${new Date().toDateString()}`;

const _loadCount = () => {
    try { return parseInt(localStorage.getItem(_todayKey()) || '0', 10); } catch (_) { return 0; }
};
const _saveCount = (n) => {
    try { localStorage.setItem(_todayKey(), String(n)); } catch (_) {}
};

let _callCount = _loadCount();

export const quota = {
    increment() {
        _callCount++;
        _saveCount(_callCount);
    },
    get count()  { return _callCount; },
    reset()      { _callCount = 0; _saveCount(0); },
};

/**
 * Unified Gemini call — all agents must use this instead of calling the SDK directly
 * so that quota tracking stays accurate across the whole app.
 *
 * Compatible with @google/genai v1.40+ (new SDK).
 *
 * @param {Object} ai       - GoogleGenAI instance
 * @param {string} model    - model name e.g. 'gemini-2.0-flash'
 * @param {Array}  contents - content parts array (inlineData or text objects)
 * @returns {Promise<string>} extracted response text
 */
export const callGemini = async (ai, model, contents) => {
    quota.increment();
    const response = await ai.models.generateContent({ model, contents });
    return response.text;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror   = reject;
    reader.readAsDataURL(blob);
});

const getMimeType = (url, fallback) => {
    if (fallback && fallback !== 'application/octet-stream') return fallback;
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    return { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
             png: 'image/png', webp: 'image/webp', txt: 'text/plain' }[ext] || fallback;
};

export const getLetterGrade = (pct) => {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
};

// ── Tools object ─────────────────────────────────────────────────────────────

export const tools = {

    // Load lecture files as Gemini inline data parts
    loadLectureFiles: async (lectureId) => {
        const paths = Object.keys(allAssetModules).filter(p => {
            const n  = p.toLowerCase();
            const id = lectureId.toLowerCase();
            return n.includes(`/${id}/`) || n.includes(`/assets/${id}/`);
        });

        if (paths.length === 0) throw new Error(`No files found for lecture "${lectureId}"`);

        const parts = [];
        for (const path of paths) {
            try {
                const fileUrl  = allAssetModules[path];
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                if (blob.size > MAX_FILE_SIZE) continue;
                const mimeType = getMimeType(fileUrl, blob.type);
                if (!SUPPORTED_MIME.includes(mimeType)) continue;
                const base64Data = await blobToBase64(blob);
                if (!base64Data || base64Data.length < 100) continue;
                parts.push({ inlineData: { data: base64Data, mimeType } });
            } catch (err) {
                console.error(`[tools] Failed to load ${path}:`, err.message);
            }
        }

        if (parts.length === 0) throw new Error(`No valid files could be loaded for "${lectureId}"`);
        return parts;
    },

    // Robust JSON extraction — strips markdown fences and control characters
    parseJSON: (text, context) => {
        const start = text.indexOf('{');
        const end   = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error(`No JSON found in ${context} response`);
        const raw = text.substring(start, end + 1);
        try {
            return JSON.parse(raw);
        } catch (_) {
            const cleaned = raw
                .replace(/```json/g, '').replace(/```/g, '')
                .replace(/[\u0000-\u001F]+/g, ' ').trim();
            return JSON.parse(cleaned);
        }
    },

    // Structural + quality validation for generated quizzes
    validateQuizQuality: (quiz) => {
        const issues = [];
        let score = 100;

        if (!quiz.partA || quiz.partA.length !== 4)  { issues.push({ severity: 'critical', issue: 'Part A must have exactly 4 MCQs' });              score -= 20; }
        if (!quiz.partB || quiz.partB.length !== 4)  { issues.push({ severity: 'critical', issue: 'Part B must have exactly 4 short-answer Qs' });    score -= 20; }
        if (!quiz.partC || quiz.partC.length !== 3)  { issues.push({ severity: 'high',     issue: 'Part C must have exactly 3 essay questions' });    score -= 15; }

        quiz.partA?.forEach(q => {
            if (!q.options || q.options.length !== 4)                      { issues.push({ severity: 'high',     questionId: q.id, issue: 'MCQ must have 4 options' });     score -= 5;  }
            if (q.answer === undefined || q.answer < 0 || q.answer > 3)   { issues.push({ severity: 'critical', questionId: q.id, issue: 'Invalid answer index' });         score -= 10; }
        });

        [...(quiz.partA || []), ...(quiz.partB || []), ...(quiz.partC || [])].forEach(q => {
            if (!q.question || q.question.length < 10) { issues.push({ severity: 'medium', questionId: q.id, issue: 'Question too short' }); score -= 3; }
        });

        return { score: Math.max(0, score), issues, passed: score >= 70 };
    },

    // Handles all Gemini response shapes
    extractText: (response) => {
        if (typeof response?.text === 'function') return response.text();
        if (response?.text && typeof response.text === 'string') return response.text;
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text)
            return response.candidates[0].content.parts[0].text;
        if (Array.isArray(response?.candidates?.[0]?.content?.parts))
            return response.candidates[0].content.parts.filter(p => p.text).map(p => p.text).join('\n');
        throw new Error('Could not extract text from Gemini response');
    },

    storeResult:        (key, value) => { agentMemory.storeLongTerm(key, value); return { success: true, key }; },
    retrieveFromMemory: (key)        => agentMemory.recallLongTerm(key),
};

export { allAssetModules };
