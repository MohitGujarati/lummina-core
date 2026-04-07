/* ============================================================================
   CONTENT ANALYZER AGENT
   Reads raw lecture files → produces a structured knowledge map JSON.
   Called once per lecture; result is cached in AgentMemory long-term.
   ============================================================================ */

import { tools, callGemini } from '../tools.js';
import { AI_MODELS } from '../../config/aiConfig.js';

const MODEL = AI_MODELS.ANALYZER;

const PROMPT = `You are a Content Analyzer AI specializing in educational material extraction.

MISSION: Analyze the provided lecture materials and create a comprehensive knowledge map.

OUTPUT: Return ONLY valid JSON with this exact structure:

{
    "lectureMetadata": {
        "title": "string",
        "topics": ["topic1", "topic2"],
        "difficulty": "beginner|intermediate|advanced",
        "estimatedStudyTime": number
    },
    "concepts": [
        {
            "name": "concept name",
            "importance": "critical|high|medium|low",
            "difficulty": "easy|medium|hard",
            "keyDefinitions": ["definition1"],
            "realWorldExamples": ["example1"]
        }
    ],
    "emphasisPatterns": {
        "repeatedConcepts": ["concept1"],
        "instructorFocus": "what the instructor emphasised"
    },
    "assessmentRecommendations": {
        "mcqTopics": ["topic1"],
        "shortAnswerTopics": ["topic1"],
        "essayTopics": ["topic1"]
    }
}

Return ONLY the JSON object. No markdown, no explanations.`;

export async function runAnalyzer(ai, files) {
    const text = await callGemini(ai, MODEL, [...files, { text: PROMPT }]);
    return tools.parseJSON(text, 'Content Analysis');
}
