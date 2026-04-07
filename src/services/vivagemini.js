/* ============================================================================
   VIVA EXAM ENGINE — uses @google/genai (v1.40+, current SDK)

   R1 — Quality scoring: examiner prompt emits hidden [SCORE:N] per turn
   R2 — Timestamps: each history entry stores timestamp: Date.now()
   R5 — Quota: all calls go through callGemini() from tools.js
   ============================================================================ */

import { GoogleGenAI } from '@google/genai';
import { callGemini } from './tools.js';
import { AI_MODELS } from '../config/aiConfig.js';

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = AI_MODELS.VIVA;

let genAI = null;
if (API_KEY) {
    try {
        genAI = new GoogleGenAI({ apiKey: API_KEY });
    } catch (e) {
        console.error('[VIVA] SDK init failed:', e.message);
    }
} else {
    console.warn('[VIVA] No API key — demo mode active.\nGet a free key at https://aistudio.google.com/app/apikey');
}

// In-memory session store
const sessions = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

// R1 — parse the hidden [SCORE:N] tag the examiner embeds
const parseScore = (text) => { const m = text.match(/\[SCORE:([1-5])\]/); return m ? parseInt(m[1], 10) : null; };
const stripScore = (text) => text.replace(/\s*\[SCORE:[1-5]\]\s*$/, '').trim();

const formatError = (err) => {
    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('400'))
        return 'API key invalid or revoked. Get a new key at https://aistudio.google.com/app/apikey';
    if (err.message?.includes('429'))
        return 'API quota exceeded. Wait a moment or check https://aistudio.google.com';
    return err.message;
};

// ── Public API ────────────────────────────────────────────────────────────────

export const startVivaSession = async (lectureId) => {
    if (!genAI) {
        const demoId = 'demo_session';
        sessions.set(demoId, { lectureId, lectureTitle: lectureId.replace(/_/g, ' '), history: [], questionCount: 1, turnScores: [] });
        return { sessionId: demoId, message: 'Demo mode: No API key found. Add VITE_GEMINI_API_KEY to your .env and restart.' };
    }

    const sessionId = `viva_${Date.now()}`;
    const lectureTitle = lectureId.replace(/_/g, ' ').replace(/leacture/i, 'Lecture');

    try {
        const firstQuestion = await callGemini(genAI, MODEL, [{
            text: `You are an oral examiner. Ask ONE clear, concise question to test the student's understanding of: ${lectureTitle}. Keep it under 2 sentences. Plain text only, no markdown.`
        }]);

        sessions.set(sessionId, {
            lectureId, lectureTitle,
            history: [
                { role: 'user', parts: [{ text: 'I am ready for my oral exam.' }], timestamp: Date.now() },  // R2
                { role: 'model', parts: [{ text: firstQuestion }], timestamp: Date.now() },  // R2
            ],
            questionCount: 1,
            turnScores: [],
        });

        return { sessionId, message: firstQuestion };

    } catch (error) {
        const reason = formatError(error);
        console.error('[VIVA] Session start failed:', reason);
        // Surface the real error rather than silently going demo
        throw new Error(reason);
    }
};

export const processVivaTurn = async (sessionId, userAudioText, currentRound, totalRounds) => {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('Session expired or not found. Please restart.');

    if (sessionId === 'demo_session' || !genAI) {
        const demoResponses = [
            'Interesting perspective. Can you elaborate on that?',
            "That's a good start. What evidence supports your answer?",
            'How does this concept relate to practical applications?',
            'Good point. Can you explain the underlying mechanism?',
            'Thank you. What are the potential challenges with this approach?',
        ];
        return { message: demoResponses[Math.min(currentRound - 1, demoResponses.length - 1)], score: null };
    }

    // R2 — store timestamp when the user turn arrives
    session.history.push({ role: 'user', parts: [{ text: userAudioText }], timestamp: Date.now() });

    try {
        const conversationContext = session.history
            .map(h => `${h.role === 'model' ? 'Examiner' : 'Student'}: ${h.parts[0].text}`)
            .join('\n');

        let instructions;
        if (currentRound >= totalRounds) {
            instructions = `FINAL ROUND: Give a brief assessment of their answer, then a 2-sentence summary of their overall performance. End with "The exam is now concluded."
Do NOT include a [SCORE:N] tag in the final round.`;
        } else {
            // R1 — embed a hidden quality score in every non-final response
            instructions = `REQUIRED FORMAT:
1. First sentence: Evaluate their answer (correct / partially correct / incorrect) with a brief explanation.
2. Second sentence: Ask ONE new question about ${session.lectureTitle}.
3. On a new line at the very end, write exactly: [SCORE:N] where N is 1–5.
   (1 = very poor, 2 = poor, 3 = adequate, 4 = good, 5 = excellent)
   This tag is hidden from the student.

CRITICAL: You MUST end your visible response with a question mark (?).`;
        }

        const prompt = `You are a formal academic examiner conducting a Viva Voce exam on: ${session.lectureTitle}

Conversation:
${conversationContext}

${instructions}

Rules:
- Plain text only, no other markdown or formatting
- Be direct and professional
- Maximum 3 sentences (excluding the [SCORE:N] tag)`;

        const rawResponse = await callGemini(genAI, MODEL, [{ text: prompt }]);

        // R1 — extract and strip the score tag before showing to student
        const turnScore = parseScore(rawResponse);
        const responseText = stripScore(rawResponse);

        if (turnScore !== null) session.turnScores.push({ round: currentRound, score: turnScore });

        // R2 — store timestamp with the model's turn
        session.history.push({ role: 'model', parts: [{ text: responseText }], timestamp: Date.now() });
        session.questionCount++;

        return { message: responseText, score: turnScore };

    } catch (error) {
        const reason = formatError(error);
        console.error('[VIVA] Turn failed:', reason);
        return { message: `I encountered an issue: ${reason}`, score: null };
    }
};

export const endVivaSession = async (sessionId) => {
    const session = sessions.get(sessionId);
    sessions.delete(sessionId);
    if (!session) return null;

    const scores = session.turnScores.map(t => t.score);
    const avgScore = scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null;

    return {
        lectureId: session.lectureId,
        questionsAsked: session.questionCount,
        qualityScore: avgScore,
        turnScores: session.turnScores,
        transcript: session.history.map(h => ({
            role: h.role === 'model' ? 'Examiner' : 'Student',
            message: h.parts[0].text,
            timestamp: new Date(h.timestamp).toISOString(),   // R2 — real per-message times
        })),
    };
};
