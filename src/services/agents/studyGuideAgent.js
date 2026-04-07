/* ============================================================================
   STUDY GUIDE ARCHITECT AGENT
   identifyWeakAreas       — uses AI grading results (all question types)
   runCheatSheetGenerator  — builds a focused markdown cheat sheet
   ============================================================================ */

import { callGemini } from '../tools.js';
import { AI_MODELS } from '../../config/aiConfig.js';

const MODEL = AI_MODELS.STUDY_GUIDE;

export function identifyWeakAreas(questionGrades) {
    if (!questionGrades || questionGrades.length === 0) {
        return [{ topic: 'General Review', type: 'all', feedback: '', keyPointsMissed: [] }];
    }

    const weak = questionGrades.filter(g => {
        if (g.isCorrect === false) return true;
        if (g.score !== undefined && g.maxScore !== undefined && g.score < g.maxScore * 0.6) return true;
        return false;
    }).map(g => ({
        topic:           g.question,
        type:            g.type || 'unknown',
        feedback:        g.feedback?.summary       || '',
        keyPointsMissed: g.feedback?.keyPointsMissed || [],
    }));

    return weak.length > 0
        ? weak
        : [{ topic: 'General Review', type: 'all', feedback: 'Strong overall — review edge cases.', keyPointsMissed: [] }];
}

export async function runCheatSheetGenerator(ai, weakAreas, contextFiles) {
    const prompt = `You are a Study Guide Architect.
MISSION: Create a high-yield, 1-page "Cheat Sheet" targeted at the student's specific mistakes.

STUDENT WEAK POINTS (from AI grading — covers MCQ, short-answer, and essay failures):
${JSON.stringify(weakAreas, null, 2)}

INSTRUCTIONS:
1. Focus ONLY on the weak points listed above. Do not summarise the whole lecture.
2. For each weak point, provide exactly:
   - 💡 The "Aha!" Moment: A one-sentence plain-English explanation of the concept.
   - ⚠️ The Trap: Why students typically get this wrong (common misconception).
   - 🧩 Example: A concrete example, analogy, or mnemonic.
3. Structure output as clean Markdown: H1 for the title, H2 for each topic.
4. Be concise — use bullet points and bold key terms.

Return PURE MARKDOWN only. No preamble.`;

    const parts = [...(contextFiles || []), { text: prompt }];
    return callGemini(ai, MODEL, parts);
}
