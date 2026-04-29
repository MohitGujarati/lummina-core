/**
 * server/services/geminiAgent.js
 * Full Gemini agent orchestrator — ported from src/services/gemini.js.
 * Runs on the server so the API key is never exposed to the browser.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadFilesForSubject } from './fileLoader.js';

// ============================================================================
// CONFIG
// ============================================================================

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3-flash-preview';
const MAX_ATTEMPTS = 3;
const QUALITY_THRESHOLD = 70;

if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY is not set in server/.env');
}

const genAI = new GoogleGenerativeAI(API_KEY);

// ============================================================================
// MEMORY
// ============================================================================

class AgentMemory {
    constructor() {
        this.longTerm = new Map();
        this.working = { currentTask: null, context: {}, history: [] };
        this.transactions = [];
    }

    storeLongTerm(key, value) {
        this.longTerm.set(key, { ...value, timestamp: Date.now(), accessCount: 0 });
    }

    recallLongTerm(key) {
        const data = this.longTerm.get(key);
        if (data) {
            data.accessCount++;
            data.lastAccessed = Date.now();
        }
        return data;
    }

    updateWorking(updates) {
        this.working.context = { ...this.working.context, ...updates };
        this.working.history.push({ timestamp: Date.now(), updates });
    }

    getWorking() {
        return this.working.context;
    }

    clearWorking() {
        this.working = { currentTask: null, context: {}, history: [] };
    }
}

const agentMemory = new AgentMemory();

// ============================================================================
// TOOLS
// ============================================================================

const tools = {
    loadLectureFiles: async (lectureId) => {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lectureId);
        if (!isUUID) {
            console.warn(`[server] Non-UUID lectureId "${lectureId}" — local assets not available on server.`);
            return [];
        }
        const parts = await loadFilesForSubject(lectureId);
        if (!parts || parts.length === 0) {
            throw new Error(`No files found for subject "${lectureId}". Make sure the teacher has uploaded materials.`);
        }
        return parts;
    },

    parseJSON: (text, context) => {
        try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON object found');
            const jsonString = text.substring(jsonStart, jsonEnd + 1);
            try {
                return JSON.parse(jsonString);
            } catch {
                const cleaned = jsonString
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .replace(/[\u0000-\u001F]+/g, ' ')
                    .trim();
                return JSON.parse(cleaned);
            }
        } catch (error) {
            throw new Error(`${context} returned invalid JSON: ${error.message}`);
        }
    },

    validateQuizQuality: (quiz) => {
        const issues = [];
        let score = 100;

        if (!quiz.partA || quiz.partA.length !== 4) { issues.push({ severity: 'critical', issue: 'Part A must have 4 MCQs' }); score -= 20; }
        if (!quiz.partB || quiz.partB.length !== 4) { issues.push({ severity: 'critical', issue: 'Part B must have 4 short answer questions' }); score -= 20; }
        if (!quiz.partC || quiz.partC.length !== 3) { issues.push({ severity: 'high', issue: 'Part C must have 3 essay questions' }); score -= 15; }

        quiz.partA?.forEach(q => {
            if (!q.options || q.options.length !== 4) { issues.push({ severity: 'high', questionId: q.id, issue: 'MCQ must have 4 options' }); score -= 5; }
            if (q.answer === undefined || q.answer < 0 || q.answer > 3) { issues.push({ severity: 'critical', questionId: q.id, issue: 'Invalid answer index' }); score -= 10; }
        });

        const allQuestions = [...(quiz.partA || []), ...(quiz.partB || []), ...(quiz.partC || [])];
        allQuestions.forEach(q => {
            if (!q.question || q.question.length < 10) { issues.push({ severity: 'medium', questionId: q.id, issue: 'Question too short' }); score -= 3; }
        });

        return { score: Math.max(0, score), issues, passed: score >= QUALITY_THRESHOLD };
    },

    extractText: (response) => {
        if (typeof response?.text === 'function') return response.text();
        if (typeof response?.text === 'string') return response.text;
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        }
        throw new Error('Could not extract text from response');
    },

    storeResult: (key, value) => agentMemory.storeLongTerm(key, value),
    retrieveFromMemory: (key) => agentMemory.recallLongTerm(key),
};

// ============================================================================
// ORCHESTRATOR — ReAct Loop
// ============================================================================

class AgentOrchestrator {
    constructor() {
        this.state = { step: 'initialize', attempts: 0, maxAttempts: MAX_ATTEMPTS, errors: [], results: {} };
    }

    async executeTask(taskType, params) {
        agentMemory.clearWorking();
        agentMemory.updateWorking({ taskType, params, startTime: Date.now() });

        this.state = { step: 'initialize', attempts: 0, maxAttempts: MAX_ATTEMPTS, errors: [], results: {} };

        while (this.state.step !== 'complete' && this.state.attempts < this.state.maxAttempts) {
            try {
                const action = await this.reason(taskType, params);
                const result = await this.act(action, params);
                await this.observe(result, action);
                this.state.attempts++;
            } catch (error) {
                console.error(`[agent] Error in ${this.state.step}:`, error.message);
                this.state.errors.push({ step: this.state.step, error: error.message });
                if (this.state.attempts >= this.state.maxAttempts - 1) {
                    this.state.step = 'complete';
                } else {
                    this.state.attempts++;
                }
            }
        }

        return this.state.results;
    }

    async reason(taskType, params) {
        const stateContext = {
            currentStep: this.state.step,
            attempts: this.state.attempts,
            errors: this.state.errors,
            results: this.state.results,
        };

        if (taskType === 'generateQuiz') return this.reasonQuizGeneration(stateContext, params);
        if (taskType === 'gradeQuiz') return this.reasonGrading(stateContext, params);
        if (taskType === 'answerQuestion') return this.reasonQuestionAnswering(stateContext, params);
        if (taskType === 'generateCheatSheet') return this.reasonCheatSheet(stateContext, params);
        throw new Error(`Unknown task type: ${taskType}`);
    }

    reasonQuizGeneration(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                return { type: 'loadFiles', data: { lectureId: params.lectureId } };
            case 'filesLoaded': {
                const cached = tools.retrieveFromMemory(`knowledge_${params.lectureId}`);
                if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                    return { type: 'useCachedKnowledge', data: cached };
                }
                return { type: 'analyzeContent', data: { files: state.results.files } };
            }
            case 'contentAnalyzed':
                return { type: 'generateQuestions', data: { knowledgeMap: state.results.knowledgeMap, files: state.results.files } };
            case 'questionsGenerated':
                return { type: 'validateQuiz', data: { quiz: state.results.quiz } };
            case 'quizValidated':
                if (state.results.validation.passed) {
                    return { type: 'finalize', data: { quiz: state.results.quiz } };
                }
                if (state.attempts < 2) {
                    return { type: 'regenerateQuestions', data: { knowledgeMap: state.results.knowledgeMap, feedback: state.results.validation.issues, files: state.results.files } };
                }
                return { type: 'finalize', data: { quiz: state.results.quiz } };
            case 'quizRegenerated':
                return { type: 'validateQuiz', data: { quiz: state.results.quiz } };
            default:
                return { type: 'finalize', data: state.results };
        }
    }

    reasonGrading(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                return { type: 'loadContext', data: { lectureId: params.lectureId } };
            case 'contextLoaded':
                return { type: 'gradeResponses', data: { quiz: params.quiz, answers: params.answers } };
            case 'responsesGraded':
                return { type: 'finalize', data: { grades: state.results.grades } };
            default:
                return { type: 'finalize', data: state.results };
        }
    }

    reasonQuestionAnswering(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                if (params.lectureId) {
                    return { type: 'loadFiles', data: { lectureId: params.lectureId } };
                }
                return { type: 'directAnswer', data: { prompt: params.prompt } };
            case 'filesLoaded':
                return { type: 'answerWithContext', data: { files: state.results.files, prompt: params.prompt } };
            default:
                return { type: 'finalize', data: state.results };
        }
    }

    reasonCheatSheet(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                return { type: 'analyzeWeakness', data: { quiz: params.quiz, answers: params.answers } };
            case 'weaknessAnalyzed':
                return { type: 'retrieveFocusedContext', data: { lectureId: params.lectureId, topics: state.results.weakAreas } };
            case 'contextRetrieved':
                return { type: 'synthesizeCheatSheet', data: { weakAreas: state.results.weakAreas, context: state.results.focusedContext } };
            case 'sheetSynthesized':
                return { type: 'finalize', data: { markdown: state.results.cheatSheet } };
            default:
                return { type: 'finalize', data: state.results };
        }
    }

    async act(action, params) {
        switch (action.type) {
            case 'loadFiles': {
                const files = await tools.loadLectureFiles(action.data.lectureId);
                agentMemory.updateWorking({ filesLoaded: true });
                return { files };
            }
            case 'useCachedKnowledge':
                return { knowledgeMap: action.data.knowledgeMap };
            case 'analyzeContent': {
                const knowledgeMap = await this.runAnalyzer(action.data.files, params.lectureId);
                tools.storeResult(`knowledge_${params.lectureId}`, { knowledgeMap });
                return { knowledgeMap };
            }
            case 'generateQuestions':
                return { quiz: await this.runGenerator(action.data.knowledgeMap, params.lectureId, null, action.data.files) };
            case 'regenerateQuestions':
                return { quiz: await this.runGenerator(action.data.knowledgeMap, params.lectureId, action.data.feedback, action.data.files) };
            case 'validateQuiz':
                return { validation: tools.validateQuizQuality(action.data.quiz) };
            case 'loadContext': {
                const contextFiles = params.lectureId ? await tools.loadLectureFiles(params.lectureId) : [];
                return { contextFiles };
            }
            case 'gradeResponses':
                return { grades: await this.runGrader(action.data.quiz, action.data.answers, this.state.results.contextFiles) };
            case 'answerWithContext':
                return { answer: await this.runQA(action.data.prompt, action.data.files, params.lectureId) };
            case 'directAnswer':
                return { answer: await this.runQA(action.data.prompt) };
            case 'analyzeWeakness':
                return { weakAreas: this.identifyWeakAreas(action.data.quiz, action.data.answers) };
            case 'retrieveFocusedContext': {
                const focusedContext = await tools.loadLectureFiles(action.data.lectureId);
                return { focusedContext };
            }
            case 'synthesizeCheatSheet':
                return { cheatSheet: await this.runCheatSheetGenerator(action.data.weakAreas, action.data.context) };
            case 'finalize':
                return action.data;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    async observe(result, action) {
        this.state.results = { ...this.state.results, ...result };
        const stepMap = {
            loadFiles: 'filesLoaded',
            useCachedKnowledge: 'contentAnalyzed',
            analyzeContent: 'contentAnalyzed',
            generateQuestions: 'questionsGenerated',
            regenerateQuestions: 'quizRegenerated',
            validateQuiz: 'quizValidated',
            loadContext: 'contextLoaded',
            gradeResponses: 'responsesGraded',
            answerWithContext: 'answerGenerated',
            directAnswer: 'answerGenerated',
            analyzeWeakness: 'weaknessAnalyzed',
            retrieveFocusedContext: 'contextRetrieved',
            synthesizeCheatSheet: 'sheetSynthesized',
            finalize: 'complete',
        };
        this.state.step = stepMap[action.type] || this.state.step;
    }

    identifyWeakAreas(quiz, answers) {
        const weakPoints = [];
        quiz.partA?.forEach(q => {
            if (answers[q.id] != q.answer) {
                weakPoints.push({ topic: q.question, type: 'Specific Question Missed' });
            }
        });
        return weakPoints.length > 0 ? weakPoints : [{ topic: 'General Review', type: 'All Topics' }];
    }

    async runAnalyzer(files, _lectureId) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const prompt = `You are a Content Analyzer AI specializing in educational material extraction.

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
        "instructorFocus": "what instructor emphasized"
    },
    "assessmentRecommendations": {
        "mcqTopics": ["topic1"],
        "shortAnswerTopics": ["topic1"],
        "essayTopics": ["topic1"]
    }
}

Return ONLY the JSON object. No markdown, no explanations.`;

        const result = await model.generateContent([...files, { text: prompt }]);
        const text = tools.extractText(result.response);
        return tools.parseJSON(text, 'Content Analysis');
    }

    async runGenerator(knowledgeMap, lectureId, feedback = null, files = []) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const feedbackText = feedback ? `\nPREVIOUS ATTEMPT HAD THESE ISSUES — PLEASE FIX:\n${JSON.stringify(feedback, null, 2)}\n` : '';

        const prompt = `You are a Question Architect AI specializing in pedagogical assessment design.

MISSION: Create a comprehensive quiz based ONLY on the provided source materials and knowledge map.
CRITICAL INSTRUCTION: Generate questions STRICTLY from the provided materials. DO NOT hallucinate facts or use outside pre-training knowledge. If the provided files do not contain enough information, formulate questions only around what is available.

KNOWLEDGE MAP:
${JSON.stringify(knowledgeMap, null, 2)}
${feedbackText}

QUIZ REQUIREMENTS:
- 4 Multiple Choice Questions (MCQs) — IDs 1–4
- 4 Short Answer Questions — IDs 5–8
- 3 Long Essay Questions — IDs 9–11

STRICT JSON OUTPUT FORMAT:
{
    "title": "Quiz: ${lectureId}",
    "totalQuestions": 11,
    "partA": [
        { "id": 1, "question": "text", "options": ["A","B","C","D"], "answer": 0, "rationale": "explanation" }
    ],
    "partB": [
        { "id": 5, "question": "text", "keyPoints": ["point1"] }
    ],
    "partC": [
        { "id": 9, "question": "text", "gradingCriteria": ["criterion1"] }
    ]
}

Return ONLY the JSON object. No markdown, no preamble.`;

        const parts = [...(files || []), { text: prompt }];
        const result = await model.generateContent(parts);
        const text = tools.extractText(result.response);
        return tools.parseJSON(text, 'Question Generation');
    }

    async runGrader(quiz, answers, contextFiles) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `You are an Expert Grading AI specializing in educational assessment.

MISSION: Grade student responses and provide detailed feedback.

QUIZ DATA:
${JSON.stringify(quiz, null, 2)}

STUDENT ANSWERS:
${JSON.stringify(answers, null, 2)}

OUTPUT FORMAT (Return ONLY valid JSON):
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
            "question": "text",
            "userAnswer": "text",
            "correctAnswer": "text",
            "score": number,
            "maxScore": number,
            "isCorrect": boolean,
            "feedback": {
                "summary": "text",
                "strengths": ["strength1"],
                "improvements": ["area1"],
                "keyPointsCovered": ["point1"],
                "keyPointsMissed": ["point1"]
            },
            "rubricBreakdown": { "accuracy": number, "completeness": number, "clarity": number, "examples": number }
        }
    ],
    "overallFeedback": {
        "strengths": ["strength1"],
        "areasForImprovement": ["area1"],
        "conceptsToReview": ["concept1"]
    },
    "detailedAnalysis": { "comprehensionLevel": "basic|intermediate|advanced", "encouragement": "message" }
}

Return ONLY the JSON object.`;

        const parts = [...(contextFiles || []), { text: prompt }];
        const result = await model.generateContent(parts);
        const text = tools.extractText(result.response);
        return tools.parseJSON(text, 'Grading');
    }

    async runQA(prompt, files = [], lectureId = null) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const parts = [];

        if (files.length > 0) {
            parts.push(...files);
            parts.push({
                text: `You have been provided with lecture materials from "${lectureId}".

Answer the student's question using ONLY information from these files.
Format your response clearly with proper paragraphs and structure.

Student's Question: ${prompt}`
            });
        } else {
            parts.push({ text: prompt });
        }

        const result = await model.generateContent(parts);
        return tools.extractText(result.response);
    }

    // Phase 2: Streaming version of runQA — returns an async iterable of text chunks
    async runQAStream(prompt, files = [], lectureId = null) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const parts = [];

        if (files.length > 0) {
            parts.push(...files);
            parts.push({
                text: `You have been provided with lecture materials from "${lectureId}".

Answer the student's question using ONLY information from these files.
Format your response clearly with proper paragraphs and structure.

Student's Question: ${prompt}`
            });
        } else {
            parts.push({ text: prompt });
        }

        const result = await model.generateContentStream(parts);
        return result.stream;
    }

    async runCheatSheetGenerator(weakAreas, contextFiles) {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `You are a Study Guide Architect.
MISSION: Create a high-yield, 1-page "Cheat Sheet" based on the student's mistakes.

STUDENT WEAK POINTS:
${JSON.stringify(weakAreas, null, 2)}

INSTRUCTIONS:
1. Focus ONLY on the weak points identified above.
2. Structure the output as clean Markdown.
3. For each weak point, provide:
   - 💡 The "Aha!" Moment: A simple explanation of the concept.
   - ⚠️ The Trap: Why they likely got it wrong (common misconceptions).
   - 🧩 Code/Example: A concrete example or mnemonic.

OUTPUT FORMAT:
Return PURE MARKDOWN. Use H1 for the Title, H2 for Topics.
Make it concise (bullet points, bold text).`;

        const parts = [...(contextFiles || []), { text: prompt }];
        const result = await model.generateContent(parts);
        return tools.extractText(result.response);
    }
}

// Module-level orchestrator instance (reused across requests — memory persists per-process)
const orchestrator = new AgentOrchestrator();

// ============================================================================
// PUBLIC API
// ============================================================================

const getLetterGrade = (pct) => {
    if (pct >= 90) return 'A';
    if (pct >= 80) return 'B';
    if (pct >= 70) return 'C';
    if (pct >= 60) return 'D';
    return 'F';
};

const generateFallbackGrading = (quiz, answers) => {
    const questionGrades = [];
    let earned = 0, total = 0;

    quiz.partA?.forEach(q => {
        const isCorrect = parseInt(answers[q.id]) === q.answer;
        questionGrades.push({
            id: q.id, type: 'mcq', question: q.question,
            userAnswer: q.options?.[answers[q.id]] || 'No answer',
            correctAnswer: q.options?.[q.answer],
            score: isCorrect ? 1 : 0, maxScore: 1, isCorrect,
            feedback: { summary: isCorrect ? 'Correct!' : 'Incorrect', strengths: [], improvements: [], keyPointsCovered: [], keyPointsMissed: [] }
        });
        if (isCorrect) earned++;
        total++;
    });

    const percentage = total > 0 ? (earned / total) * 100 : 0;
    return {
        overallScore: { total, earned, percentage, grade: getLetterGrade(percentage) },
        questionGrades,
        overallFeedback: { strengths: ['Completed the assessment'], areasForImprovement: [], conceptsToReview: [] }
    };
};

export const generateQuiz = async (lectureId) => {
    const result = await orchestrator.executeTask('generateQuiz', { lectureId });
    const quiz = result.quiz;

    if (!quiz || !quiz.partA || !quiz.partB || !quiz.partC) {
        throw new Error('Quiz generation failed — the AI did not return a valid quiz structure. Check that lecture files exist and the API key is valid.');
    }

    return {
        title: quiz.title,
        totalQuestions: quiz.totalQuestions,
        partA: quiz.partA.map(q => ({ id: q.id, question: q.question, options: q.options, answer: q.answer })),
        partB: quiz.partB.map(q => ({ id: q.id, question: q.question })),
        partC: quiz.partC.map(q => ({ id: q.id, question: q.question })),
    };
};

export const gradeQuizResponses = async (quiz, answers, lectureId = null) => {
    try {
        const result = await orchestrator.executeTask('gradeQuiz', { quiz, answers, lectureId });
        return result.grades || generateFallbackGrading(quiz, answers);
    } catch {
        return generateFallbackGrading(quiz, answers);
    }
};

export const answerQuestion = async (prompt, lectureId = null) => {
    const result = await orchestrator.executeTask('answerQuestion', { prompt, lectureId });
    return result.answer;
};

// Phase 2: Streaming answer — returns an async iterable
export const streamAnswer = async (prompt, lectureId = null) => {
    console.log(`[streamAnswer] prompt="${prompt.slice(0, 60)}" lectureId=${lectureId}`);

    let files = [];
    if (lectureId) {
        try {
            console.log(`[streamAnswer] loading files for ${lectureId}...`);
            files = await tools.loadLectureFiles(lectureId);
            console.log(`[streamAnswer] loaded ${files.length} file(s)`);
        } catch (err) {
            console.warn(`[streamAnswer] file load failed (continuing without files): ${err.message}`);
            files = [];
        }
    } else {
        console.log('[streamAnswer] no lectureId — answering without file context');
    }

    console.log('[streamAnswer] calling runQAStream...');
    return orchestrator.runQAStream(prompt, files, lectureId);
};

export const generateStudyGuide = async (quiz, answers, lectureId) => {
    const result = await orchestrator.executeTask('generateCheatSheet', { quiz, answers, lectureId });
    return result.markdown;
};
