/**
 * server/routes/gemini.js
 * Express routes for all Gemini AI operations.
 * Phase 1: JSON endpoints for quiz, grading, study-guide.
 * Phase 2: SSE streaming for chat.
 */

import { Router } from 'express';
import {
    generateQuiz,
    gradeQuizResponses,
    generateStudyGuide,
    streamAnswer,
} from '../services/geminiAgent.js';

const router = Router();

// ─── Phase 2: Streaming Chat ────────────────────────────────────────────────
// GET /api/gemini/chat  (SSE — uses query params to work with EventSource)
// POST /api/gemini/chat (SSE — uses body, requires fetch with ReadableStream)
router.post('/chat', async (req, res) => {
    const { prompt, lectureId } = req.body;
    console.log(`[chat] ← received prompt="${prompt?.slice(0, 60)}" lectureId=${lectureId}`);

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    console.log('[chat] SSE headers sent, starting stream...');

    try {
        const stream = await streamAnswer(prompt, lectureId || null);
        console.log('[chat] got stream from geminiAgent, reading chunks...');

        let chunkCount = 0;
        for await (const chunk of stream) {
            const text = chunk.text();
            if (text) {
                chunkCount++;
                if (chunkCount <= 3 || chunkCount % 10 === 0) {
                    console.log(`[chat] chunk #${chunkCount}: "${text.slice(0, 40)}"`);
                }
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        console.log(`[chat] ✅ stream done — total chunks: ${chunkCount}`);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('[chat] ❌ stream error:', error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

// ─── Quiz Generation ─────────────────────────────────────────────────────────
// POST /api/gemini/quiz
router.post('/quiz', async (req, res) => {
    const { lectureId } = req.body;

    if (!lectureId) return res.status(400).json({ error: 'lectureId is required' });

    try {
        const quiz = await generateQuiz(lectureId);
        res.json(quiz);
    } catch (error) {
        console.error('[/api/gemini/quiz]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Grading ─────────────────────────────────────────────────────────────────
// POST /api/gemini/grade
router.post('/grade', async (req, res) => {
    const { quiz, answers, lectureId } = req.body;

    if (!quiz || !answers) return res.status(400).json({ error: 'quiz and answers are required' });

    try {
        const grades = await gradeQuizResponses(quiz, answers, lectureId || null);
        res.json(grades);
    } catch (error) {
        console.error('[/api/gemini/grade]', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── Study Guide / Cheat Sheet ────────────────────────────────────────────────
// POST /api/gemini/study-guide
router.post('/study-guide', async (req, res) => {
    const { quiz, answers, lectureId } = req.body;

    if (!quiz || !answers || !lectureId) {
        return res.status(400).json({ error: 'quiz, answers, and lectureId are required' });
    }

    try {
        const markdown = await generateStudyGuide(quiz, answers, lectureId);
        res.json({ markdown });
    } catch (error) {
        console.error('[/api/gemini/study-guide]', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
