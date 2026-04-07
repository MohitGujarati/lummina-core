/* ============================================================================
   GEMINI SERVICE — Public API
   Uses @google/genai (v1.40.0) — the current Google AI SDK.
   All business logic lives in:
     services/orchestrator.js  services/agents/*
   Viva exam logic: services/vivagemini.js
   ============================================================================ */

import { GoogleGenAI } from '@google/genai';
import { AgentOrchestrator } from './orchestrator.js';
import { agentMemory } from './memory.js';
import { allAssetModules, getLetterGrade } from './tools.js';
import { AI_MODELS } from '../config/aiConfig.js';

// ── Initialisation ────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
    console.error(
        '[Lummina] ❌ No API key found.\n' +
        '  1. Go to https://aistudio.google.com/app/apikey\n' +
        '  2. Create a free key\n' +
        '  3. Add it to your .env file: VITE_GEMINI_API_KEY=your_key_here\n' +
        '  4. Restart the dev server (npm run dev)'
    );
}

let genAI = null;
try {
    if (API_KEY) {
        genAI = new GoogleGenAI({ apiKey: API_KEY });
    }
} catch (err) {
    console.error('[Lummina] Failed to initialise Gemini SDK:', err.message);
}

// Verify the key actually works at startup (non-blocking)
if (genAI) {
    genAI.models.generateContent({
        model: AI_MODELS.HEALTH_CHECK,
        contents: 'Reply with the single word: OK',
    }).then(() => {
        console.log('[Lummina] ✅ Gemini API key verified — AI features active');
    }).catch(err => {
        const hint =
            err.message.includes('API_KEY_INVALID') || err.message.includes('400')
                ? 'Your API key is invalid or revoked. Get a new one at https://aistudio.google.com/app/apikey'
                : err.message.includes('429')
                    ? 'API quota exceeded. Wait a moment or check your usage at https://aistudio.google.com'
                    : err.message.includes('404')
                        ? 'Model not found. The model name may have changed.'
                        : err.message;
        console.error(`[Lummina] ❌ Gemini API check failed: ${hint}`);
    });
}

// One orchestrator per session; executeTask uses per-call isolated ctx
const orchestrator = new AgentOrchestrator(genAI);

// ── Public API ────────────────────────────────────────────────────────────────

export const generateQuiz = async (lectureId) => {
    if (!genAI) throw new Error('No Gemini API key configured. Check your .env file.');
    const result = await orchestrator.executeTask('generateQuiz', { lectureId });
    const quiz = result.quiz;
    if (!quiz) throw new Error('Quiz generation failed — no quiz in result');

    return {
        title: quiz.title,
        totalQuestions: quiz.totalQuestions,
        partA: quiz.partA.map(q => ({ id: q.id, question: q.question, options: q.options, answer: q.answer })),
        partB: quiz.partB.map(q => ({ id: q.id, question: q.question })),
        partC: quiz.partC.map(q => ({ id: q.id, question: q.question })),
    };
};

export const gradeQuizResponses = async (quiz, answers, lectureId = null) => {
    if (!genAI) return _fallbackGrading(quiz, answers);
    try {
        const result = await orchestrator.executeTask('gradeQuiz', { quiz, answers, lectureId });
        if (result?.grades) return result.grades;
        return _fallbackGrading(quiz, answers);
    } catch (err) {
        console.error('[Lummina] Grading failed:', err.message);
        return _fallbackGrading(quiz, answers);
    }
};

export const sendMessageToGemini = async (prompt, lectureId = null) => {
    if (!genAI) return '❌ No Gemini API key. Add VITE_GEMINI_API_KEY to your .env file and restart the server.';
    try {
        const result = await orchestrator.executeTask('answerQuestion', { prompt, lectureId });
        return result.answer;
    } catch (err) {
        console.error('[Lummina] Chat failed:', err.message);
        return `❌ Error: ${err.message}`;
    }
};

export const generateStudyGuide = async (quiz, answers, lectureId, questionGrades = null) => {
    if (!genAI) throw new Error('No Gemini API key configured.');
    const result = await orchestrator.executeTask('generateCheatSheet', {
        quiz, answers, lectureId, questionGrades,
    });
    if (!result?.markdown) throw new Error('Study guide generation failed');
    return result.markdown;
};

// ── Debug / utility exports ───────────────────────────────────────────────────

export const getAgentMemory = () => ({
    longTerm: Array.from(agentMemory.longTerm.entries()),
    working: agentMemory.getWorking(),
    transactions: agentMemory.getAuditTrail(),
});

export const listAvailableLectures = () => {
    const lectures = new Set();
    Object.keys(allAssetModules).forEach(path => {
        const match = path.match(/\/assets\/([^/]+)\//);
        if (match) lectures.add(match[1]);
    });
    return Array.from(lectures).sort();
};

export const renderMarkdown = (text) => {
    if (!text) return '';
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
};

// ── Fallback grading (MCQ only, no API call) ──────────────────────────────────

function _fallbackGrading(quiz, answers) {
    const questionGrades = [];
    let earned = 0;

    (quiz.partA || []).forEach(q => {
        const correct = parseInt(answers[q.id]) === q.answer;
        questionGrades.push({
            id: q.id, type: 'mcq', question: q.question,
            userAnswer: q.options?.[answers[q.id]] ?? 'No answer',
            correctAnswer: q.options?.[q.answer],
            score: correct ? 1 : 0, maxScore: 1, isCorrect: correct,
            feedback: {
                summary: correct ? 'Correct!' : 'Incorrect answer',
                strengths: correct ? ['Correct selection'] : [],
                improvements: correct ? [] : ['Review this concept'],
                keyPointsCovered: [], keyPointsMissed: correct ? [] : [q.question],
            },
        });
        if (correct) earned++;
    });

    const total = quiz.partA?.length ?? 0;
    const pct = total > 0 ? (earned / total) * 100 : 0;

    return {
        overallScore: { total, earned, percentage: pct, grade: getLetterGrade(pct) },
        sectionScores: { partA: { total, earned }, partB: { total: 0, earned: 0 }, partC: { total: 0, earned: 0 } },
        questionGrades,
        overallFeedback: { strengths: [], areasForImprovement: [], conceptsToReview: [] },
        detailedAnalysis: { comprehensionLevel: 'basic', encouragement: 'Keep going!' },
    };
}
