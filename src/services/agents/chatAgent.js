/* ============================================================================
   QA (CHAT) AGENT
   Answers student questions grounded in the selected lecture materials.
   ============================================================================ */

import { callGemini } from '../tools.js';
import { AI_MODELS } from '../../config/aiConfig.js';

const MODEL = AI_MODELS.CHAT;

export async function runQA(ai, prompt, files = [], lectureId = null) {
    const parts = [];

    if (files.length > 0) {
        parts.push(...files);
        parts.push({
            text: `You have been provided with lecture materials from "${lectureId}".

Answer the student's question using ONLY information from these files.
Format your response clearly with proper paragraphs and structure.
If the answer is not in the materials, say so clearly.

Student's Question: ${prompt}`,
        });
    } else {
        parts.push({ text: prompt });
    }

    return callGemini(ai, MODEL, parts);
}
