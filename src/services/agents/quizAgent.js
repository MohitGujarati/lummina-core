/* ============================================================================
   QUIZ ARCHITECT + GRADER AGENTS
   runGenerator — builds a 3-part quiz from a knowledge map + source files
   runGrader    — grades all answers with per-question rubric feedback
   ============================================================================ */

import { tools, callGemini } from '../tools.js';
import { AI_MODELS } from '../../config/aiConfig.js';

const MODEL = AI_MODELS.QUIZ;

// ── Quiz Architect ────────────────────────────────────────────────────────────

export async function runGenerator(ai, files, knowledgeMap, lectureId, feedback = null) {
    const mcqTopics    = knowledgeMap.assessmentRecommendations?.mcqTopics?.join(', ')        || 'key concepts';
    const shortTopics  = knowledgeMap.assessmentRecommendations?.shortAnswerTopics?.join(', ') || 'main topics';
    const essayTopics  = knowledgeMap.assessmentRecommendations?.essayTopics?.join(', ')       || 'core themes';
    const criticalList = (knowledgeMap.concepts || [])
        .filter(c => c.importance === 'critical' || c.importance === 'high')
        .map(c => c.name).join(', ');

    const feedbackSection = feedback
        ? `\nPREVIOUS ATTEMPT FAILED — FIX THESE ISSUES:\n${JSON.stringify(feedback, null, 2)}\n`
        : '';

    const prompt = `You are a Question Architect AI specialising in pedagogical assessment design.

MISSION: Create a comprehensive quiz grounded in the provided lecture materials.

KNOWLEDGE MAP TARGETS:
- Critical concepts to test: ${criticalList}
- MCQ topics: ${mcqTopics}
- Short-answer topics: ${shortTopics}
- Essay topics: ${essayTopics}
${feedbackSection}
QUIZ REQUIREMENTS:
- 4 Multiple Choice Questions (MCQs) — IDs 1–4
- 4 Short Answer Questions — IDs 5–8
- 3 Long Essay Questions — IDs 9–11

STRICT JSON OUTPUT FORMAT:
{
    "title": "Quiz: ${lectureId}",
    "totalQuestions": 11,
    "partA": [
        { "id": 1, "question": "Clear question text", "options": ["A", "B", "C", "D"], "answer": 0, "rationale": "Explanation" }
    ],
    "partB": [
        { "id": 5, "question": "Short answer question", "keyPoints": ["point1", "point2"] }
    ],
    "partC": [
        { "id": 9, "question": "Essay question", "gradingCriteria": ["criterion1", "criterion2"] }
    ]
}

Return ONLY the JSON object. No markdown, no preamble.`;

    const text = await callGemini(ai, MODEL, [...files, { text: prompt }]);
    return tools.parseJSON(text, 'Question Generation');
}

// ── Grader ────────────────────────────────────────────────────────────────────

export async function runGrader(ai, quiz, answers, contextFiles) {
    const prompt = `You are an Expert Grading AI specialising in educational assessment.

MISSION: Grade the student responses below and provide detailed, per-question feedback.

QUIZ DATA:
${JSON.stringify(quiz, null, 2)}

STUDENT ANSWERS:
${JSON.stringify(answers, null, 2)}

OUTPUT FORMAT — Return ONLY valid JSON:
{
    "overallScore": { "total": number, "earned": number, "percentage": number, "grade": "A|B|C|D|F" },
    "sectionScores": {
        "partA": { "total": number, "earned": number },
        "partB": { "total": number, "earned": number },
        "partC": { "total": number, "earned": number }
    },
    "questionGrades": [
        {
            "id": number,
            "type": "mcq|short|essay",
            "question": "question text",
            "userAnswer": "student answer",
            "correctAnswer": "correct answer",
            "score": number,
            "maxScore": number,
            "isCorrect": boolean,
            "feedback": {
                "summary": "brief feedback",
                "strengths": ["strength1"],
                "improvements": ["area1"],
                "keyPointsCovered": ["point1"],
                "keyPointsMissed": ["point1"]
            }
        }
    ],
    "overallFeedback": {
        "strengths": ["strength1"],
        "areasForImprovement": ["area1"],
        "conceptsToReview": ["concept1"]
    },
    "detailedAnalysis": {
        "comprehensionLevel": "basic|intermediate|advanced",
        "encouragement": "Personalised message"
    }
}

Return ONLY the JSON object.`;

    const parts = [...(contextFiles || []), { text: prompt }];
    const text  = await callGemini(ai, MODEL, parts);
    return tools.parseJSON(text, 'Grading');
}
