/**
 * server/services/vivaAgent.js
 *
 * Viva exam session manager.
 *   1. Fetches lecture files from Supabase (same as quiz service)
 *   2. Generates 10 questions using Gemini
 *   3. Stores answers and generates 3-sentence feedback at the end
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadFilesForSubject } from './fileLoader.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'gemini-3-flash-preview';

const sessions = new Map();

function getModel() {
    return genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    });
}

function extractText(response) {
    if (typeof response?.text === 'function') return response.text();
    if (typeof response?.text === 'string') return response.text;
    return response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ---------------------------------------------------------------------------
// startVivaSession
// ---------------------------------------------------------------------------
export const startVivaSession = async (lectureId, lectureTitle) => {
    const sessionId = `viva_${Date.now()}`;
    const title = lectureTitle || lectureId.replace(/_/g, ' ');

    // ── Fetch Supabase files ─────────────────────────────────────────────────
    let fileParts = [];
    try {
        fileParts = await loadFilesForSubject(lectureId);
        console.log(`[vivaAgent] ✅ Supabase: loaded ${fileParts.length} file(s) for "${title}"`);
        fileParts.forEach((f, i) => console.log(`  [${i + 1}] mimeType=${f.inlineData?.mimeType ?? f.text ? 'text' : '?'}`));
    } catch (err) {
        console.warn(`[vivaAgent] ⚠️  Supabase file load failed (continuing without files): ${err.message}`);
    }

    // ── Generate 10 questions ────────────────────────────────────────────────
    const contextNote = fileParts.length > 0
        ? 'Use the provided lecture materials to generate topic-specific questions.'
        : `No lecture files available. Generate general academic questions about "${title}".`;

    const prompt = `You are an academic oral examiner. ${contextNote}

Generate exactly 10 exam questions to test a student's understanding of: "${title}".

Rules:
- Each question must be self-contained and clear
- Progress from basic recall to deeper conceptual understanding
- Plain text only — no markdown, no numbering, no bullet points
- Output ONLY a valid JSON array of exactly 10 question strings, nothing else.

Example: ["Question one?","Question two?","Question three?","Question four?","Question five?","Question six?","Question seven?","Question eight?","Question nine?","Question ten?"]`;

    const parts = fileParts.length > 0 ? [...fileParts, { text: prompt }] : [{ text: prompt }];
    const result = await getModel().generateContent(parts);
    const raw = extractText(result.response).trim();
    console.log(`[vivaAgent] Gemini questions raw (first 200): ${raw.slice(0, 200)}`);

    let questions;
    try {
        const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        questions = JSON.parse(jsonStr);
        if (!Array.isArray(questions) || questions.length < 5) throw new Error('Too few questions');
        questions = questions.slice(0, 10);
    } catch (e) {
        console.warn('[vivaAgent] JSON parse failed, splitting by newline:', e.message);
        questions = raw
            .split('\n')
            .map(l => l.replace(/^[\d\.\-\*"]+\s*/, '').replace(/[",]+$/, '').trim())
            .filter(l => l.length > 10 && l.includes('?'))
            .slice(0, 10);

        if (questions.length < 5) throw new Error('Failed to generate enough questions. Please try again.');
    }

    console.log(`[vivaAgent] Session ${sessionId} — ${questions.length} questions generated for "${title}"`);

    sessions.set(sessionId, {
        lectureId, lectureTitle: title,
        questions, answers: [],
        currentIndex: 0,
        startedAt: Date.now(),
    });

    return {
        sessionId,
        greeting: `Welcome to your oral examination on ${title}. I will ask you 10 questions. Please give clear, complete answers. Let us begin.`,
        firstQuestion: questions[0],
        totalQuestions: questions.length,
    };
};

// ---------------------------------------------------------------------------
// processVivaTurn
// ---------------------------------------------------------------------------
export const processVivaTurn = async (sessionId, userAnswer) => {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('Session not found. Please start a new session.');

    session.answers.push(userAnswer || '(no answer provided)');
    session.currentIndex++;

    console.log(`[vivaAgent] Session ${sessionId} — Q${session.currentIndex}/${session.questions.length} answered`);

    if (session.currentIndex >= session.questions.length) {
        const transcript = session.questions
            .map((q, i) => `Q${i + 1}: ${q}\nAnswer: ${session.answers[i] ?? '(no answer)'}`)
            .join('\n\n');

        const feedbackPrompt = `You are an academic examiner. A student just completed a 10-question oral examination on "${session.lectureTitle}".

Examination transcript:
${transcript}

Write exactly 3 sentences of feedback:
- Sentence 1: Overall performance (mention specific strengths)
- Sentence 2: Key areas needing improvement
- Sentence 3: Encouraging closing remark

Plain text only — no markdown, no bullet points.`;

        const result = await getModel().generateContent([{ text: feedbackPrompt }]);
        const feedback = extractText(result.response).replace(/\*\*/g, '').replace(/\*/g, '').trim();

        sessions.delete(sessionId);
        console.log(`[vivaAgent] Session ${sessionId} complete`);

        return { done: true, feedback };
    }

    return {
        done: false,
        nextQuestion: session.questions[session.currentIndex],
        questionNumber: session.currentIndex + 1,
    };
};

// ---------------------------------------------------------------------------
// endVivaSession — early exit
// ---------------------------------------------------------------------------
export const endVivaSession = (sessionId) => {
    const session = sessions.get(sessionId);
    sessions.delete(sessionId);
    return session ? { lectureId: session.lectureId, questionsAsked: session.currentIndex } : null;
};
