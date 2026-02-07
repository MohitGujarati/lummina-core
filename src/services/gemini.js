/* ============================================================================
   FULL AGENTIC SYSTEM - Gemini Quiz Generation & Grading
   
   Components:
   - Brain: Gemini LLM with multiple specialized models
   - Tools: File loading, JSON parsing, validation, persistence
   - Orchestration: ReAct loop with dynamic decision-making
   - Memory: Long-term (knowledge base), Working (context), Transactional (audit)
   ============================================================================ */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const allAssetModules = {
    ...import.meta.glob('/src/assets/**/*.pdf', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.txt', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpg', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpeg', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.png', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.webp', { eager: true, query: '?url', import: 'default' }),
};

const DEBUG = true;
const log = (...args) => DEBUG && console.log("🤖 [AGENT]", ...args);
const logError = (...args) => console.error("❌ [AGENT]", ...args);

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "demo_fake_key_12345";
const MODEL_NAME = 'gemini-3-flash-preview';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const QUALITY_THRESHOLD = 70;

// Initialize Gemini
let genAI = null;
try {
    genAI = new GoogleGenerativeAI(API_KEY);
    if (API_KEY === "demo_fake_key_12345") {
        log("⚠️ Using DEMO API KEY. AI features will not work.");
    } else {
        log("✅ Gemini initialized");
    }
} catch (error) {
    logError("Failed to initialize:", error.message);
}

// ============================================================================
// MEMORY SYSTEM - Long-term, Working, Transactional
// ============================================================================

class AgentMemory {
    constructor() {
        // Long-term: Knowledge base (would use Vector DB in production)
        this.longTerm = new Map(); // lectureId -> { knowledgeMap, files, metadata }

        // Working: Current task context
        this.working = {
            currentTask: null,
            context: {},
            history: []
        };

        // Transactional: Audit trail
        this.transactions = [];
    }

    // Store in long-term memory
    storeLongTerm(key, value) {
        this.longTerm.set(key, {
            ...value,
            timestamp: Date.now(),
            accessCount: 0
        });
        this.logTransaction('STORE_LONG_TERM', { key });
        log(`💾 Stored in long-term memory: ${key}`);
    }

    // Retrieve from long-term memory
    recallLongTerm(key) {
        const data = this.longTerm.get(key);
        if (data) {
            data.accessCount++;
            data.lastAccessed = Date.now();
            this.logTransaction('RECALL_LONG_TERM', { key });
            log(`🔍 Recalled from long-term memory: ${key}`);
        }
        return data;
    }

    // Update working memory
    updateWorking(updates) {
        this.working.context = { ...this.working.context, ...updates };
        this.working.history.push({
            timestamp: Date.now(),
            updates
        });
        this.logTransaction('UPDATE_WORKING', updates);
    }

    // Get working memory
    getWorking() {
        return this.working.context;
    }

    // Log transaction
    logTransaction(action, data) {
        this.transactions.push({
            timestamp: Date.now(),
            action,
            data
        });
    }

    // Get audit trail
    getAuditTrail() {
        return this.transactions;
    }

    // Clear working memory (for new task)
    clearWorking() {
        this.working = {
            currentTask: null,
            context: {},
            history: []
        };
        log("🧹 Working memory cleared");
    }
}

// Global memory instance
const agentMemory = new AgentMemory();

// ============================================================================
// TOOL SYSTEM - Agent capabilities for interacting with the world
// ============================================================================

const tools = {
    // Tool: Load lecture files
    loadLectureFiles: async (lectureId) => {
        log(`🔧 TOOL: Loading files for "${lectureId}"`);

        const lectureFilePaths = Object.keys(allAssetModules).filter(path => {
            const normalized = path.toLowerCase();
            const idNormalized = lectureId.toLowerCase();
            return normalized.includes(`/${idNormalized}/`) ||
                normalized.includes(`/assets/${idNormalized}/`);
        });

        if (lectureFilePaths.length === 0) {
            throw new Error(`No files found for lecture "${lectureId}"`);
        }

        const parts = [];
        let loadedCount = 0;

        for (const path of lectureFilePaths) {
            try {
                const fileUrl = allAssetModules[path];
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const blob = await response.blob();
                if (blob.size > MAX_FILE_SIZE) {
                    log(`⚠️ Skipping large file: ${path}`);
                    continue;
                }

                const mimeType = getMimeType(fileUrl, blob.type);
                const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
                if (!supportedTypes.includes(mimeType)) continue;

                const base64Data = await blobToBase64(blob);
                if (!base64Data || base64Data.length < 100) continue;

                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                });

                loadedCount++;
                log(`✅ Loaded [${loadedCount}]: ${path.split('/').pop()}`);
            } catch (error) {
                logError(`Failed to load ${path}:`, error.message);
            }
        }

        if (loadedCount === 0) {
            throw new Error(`No valid files could be loaded for lecture "${lectureId}"`);
        }

        log(`📤 Successfully loaded ${loadedCount} files`);
        return parts;
    },

    // Tool: Parse and validate JSON
    parseJSON: (text, context) => {
        log(`🔧 TOOL: Parsing JSON for ${context}`);

        try {
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error("No JSON object found in response");
            }

            const jsonString = text.substring(jsonStart, jsonEnd + 1);

            try {
                return JSON.parse(jsonString);
            } catch (e) {
                const cleaned = jsonString
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .replace(/[\u0000-\u001F]+/g, " ")
                    .trim();
                return JSON.parse(cleaned);
            }
        } catch (error) {
            throw new Error(`${context} returned invalid JSON: ${error.message}`);
        }
    },

    // Tool: Validate quiz quality
    validateQuizQuality: (quiz, knowledgeMap) => {
        log(`🔧 TOOL: Validating quiz quality`);

        const issues = [];
        let score = 100;

        // Check structure
        if (!quiz.partA || quiz.partA.length !== 4) {
            issues.push({ severity: 'critical', issue: 'Part A must have exactly 4 MCQs' });
            score -= 20;
        }
        if (!quiz.partB || quiz.partB.length !== 4) {
            issues.push({ severity: 'critical', issue: 'Part B must have exactly 4 short answer questions' });
            score -= 20;
        }
        if (!quiz.partC || quiz.partC.length !== 3) {
            issues.push({ severity: 'high', issue: 'Part C must have exactly 3 essay questions' });
            score -= 15;
        }

        // Check MCQ structure
        quiz.partA?.forEach(q => {
            if (!q.options || q.options.length !== 4) {
                issues.push({ severity: 'high', questionId: q.id, issue: 'MCQ must have 4 options' });
                score -= 5;
            }
            if (q.answer === undefined || q.answer < 0 || q.answer > 3) {
                issues.push({ severity: 'critical', questionId: q.id, issue: 'Invalid answer index' });
                score -= 10;
            }
        });

        // Check question quality
        const allQuestions = [...(quiz.partA || []), ...(quiz.partB || []), ...(quiz.partC || [])];
        allQuestions.forEach(q => {
            if (!q.question || q.question.length < 10) {
                issues.push({ severity: 'medium', questionId: q.id, issue: 'Question too short or missing' });
                score -= 3;
            }
        });

        return {
            score: Math.max(0, score),
            issues,
            passed: score >= QUALITY_THRESHOLD
        };
    },

    // Tool: Extract text from LLM response
    extractText: (response) => {
        if (typeof response?.text === 'function') return response.text();
        if (response?.text && typeof response.text === 'string') return response.text;
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        }
        if (Array.isArray(response?.candidates?.[0]?.content?.parts)) {
            return response.candidates[0].content.parts
                .filter(part => part.text)
                .map(part => part.text)
                .join('\n');
        }
        throw new Error("Could not extract text from response");
    },

    // Tool: Store result in memory
    storeResult: (key, value) => {
        agentMemory.storeLongTerm(key, value);
        return { success: true, key };
    },

    // Tool: Retrieve from memory
    retrieveFromMemory: (key) => {
        return agentMemory.recallLongTerm(key);
    }
};

// ============================================================================
// ORCHESTRATOR - ReAct Loop with Dynamic Decision Making
// ============================================================================

class AgentOrchestrator {
    constructor() {
        this.orchestratorModel = genAI.getGenerativeModel({ model: MODEL_NAME });
        this.state = {
            step: 'initialize',
            attempts: 0,
            maxAttempts: MAX_ATTEMPTS,
            errors: [],
            results: {}
        };
    }

    // Main ReAct Loop
    async executeTask(taskType, params) {
        log(`\n${"=".repeat(70)}`);
        log(`🎯 AGENT ORCHESTRATOR: Starting task "${taskType}"`);
        log(`${"=".repeat(70)}\n`);

        agentMemory.clearWorking();
        agentMemory.updateWorking({ taskType, params, startTime: Date.now() });

        this.state = {
            step: 'initialize',
            attempts: 0,
            maxAttempts: MAX_ATTEMPTS,
            errors: [],
            results: {}
        };

        while (this.state.step !== 'complete' && this.state.attempts < this.state.maxAttempts) {
            try {
                log(`\n📍 STATE: ${this.state.step} (Attempt ${this.state.attempts + 1}/${this.state.maxAttempts})`);

                // REASON: Decide next action
                const action = await this.reason(taskType, params);
                log(`💭 REASONING: Next action is "${action.type}"`);

                // ACT: Execute the action
                const result = await this.act(action, params);
                log(`✅ ACTION COMPLETE: ${action.type}`);

                // OBSERVE: Analyze result and update state
                await this.observe(result, action);

                this.state.attempts++;

            } catch (error) {
                logError(`Error in ${this.state.step}:`, error.message);
                this.state.errors.push({ step: this.state.step, error: error.message });

                // Decide if we should retry or abort
                if (this.state.attempts >= this.state.maxAttempts - 1) {
                    log(`⚠️ Max attempts reached. Finalizing with current results.`);
                    this.state.step = 'complete';
                } else {
                    // Try to recover
                    log(`🔄 Attempting recovery...`);
                    this.state.attempts++;
                }
            }
        }

        log(`\n${"=".repeat(70)}`);
        log(`✅ TASK COMPLETE: ${taskType}`);
        log(`${"=".repeat(70)}\n`);

        return this.state.results;
    }

    async runQA(prompt, files = [], lectureId = null) {
        log("💬 Running QA Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const parts = [];

        if (files.length > 0) {
            parts.push(...files);
            const contextPrompt = `You have been provided with lecture materials from "${lectureId}".

Answer the student's question using ONLY information from these files.
Format your response clearly with proper paragraphs and structure.

Student's Question: ${prompt}`;
            parts.push({ text: contextPrompt });
        } else {
            parts.push({ text: prompt });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        return tools.extractText(response);
    }

    // ============================================================
    // 👇 NEW METHODS ADDED BELOW 👇
    // ============================================================

    // The "Study Guide Architect" Persona
    async runCheatSheetGenerator(weakAreas, contextFiles) {
        log("📝 Running Cheat Sheet Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `
You are a Study Guide Architect. 
MISSION: Create a high-yield, 1-page "Cheat Sheet" based on the student's mistakes.

STUDENT WEAK POINTS:
${JSON.stringify(weakAreas, null, 2)}

INSTRUCTIONS:
1. Focus ONLY on the weak points identified above. Do not summarize the whole lecture.
2. Structure the output as clean Markdown.
3. For each weak point, provide:
   - 💡 The "Aha!" Moment: A simple explanation of the concept.
   - ⚠️ The Trap: Why they likely got it wrong (common misconceptions).
   - 🧩 Code/Example: A concrete example or mnemonic.

OUTPUT FORMAT:
Return PURE MARKDOWN. Use H1 for the Title, H2 for Topics. 
Make it concise (bullet points, bold text).
`;

        const parts = [...(contextFiles || []), { text: prompt }];
        const result = await model.generateContent(parts);
        const response = await result.response;
        return tools.extractText(response);
    }

    // Helper to find weak areas from quiz data
    identifyWeakAreas(quiz, answers) {
        const weakPoints = [];

        // Helper to check parts
        const checkPart = (part) => {
            if (!part) return;
            part.forEach(q => {
                const userAns = answers[q.id];
                // Simple check: if answer doesn't match expected (for MCQs) or is missing
                if (q.answer !== undefined && userAns != q.answer) {
                    weakPoints.push({ topic: q.question, type: 'Specific Question Missed' });
                }
            });
        };

        checkPart(quiz.partA);
        // You can add logic for Part B/C here if you have the graded results passed in

        return weakPoints.length > 0 ? weakPoints : [{ topic: "General Review", type: "All Topics" }];
    }


    // REASON: Determine next action based on current state
    async reason(taskType, params) {
        const stateContext = {
            currentStep: this.state.step,
            attempts: this.state.attempts,
            errors: this.state.errors,
            results: this.state.results,
            workingMemory: agentMemory.getWorking()
        };

        // Rule-based reasoning for efficiency (faster than LLM for simple decisions)
        if (taskType === 'generateQuiz') {
            return this.reasonQuizGeneration(stateContext, params);
        } else if (taskType === 'gradeQuiz') {
            return this.reasonGrading(stateContext, params);
        } else if (taskType === 'answerQuestion') {
            return this.reasonQuestionAnswering(stateContext, params);
        } else if (taskType === 'generateCheatSheet') {
            return this.reasonCheatSheet(this.state, params);
        }

        throw new Error(`Unknown task type: ${taskType}`);
    }

    // Reasoning logic for quiz generation
    reasonQuizGeneration(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                return { type: 'loadFiles', data: { lectureId: params.lectureId } };

            case 'filesLoaded':
                // Check if we have cached knowledge map
                const cached = tools.retrieveFromMemory(`knowledge_${params.lectureId}`);
                if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
                    log("🎯 Using cached knowledge map");
                    return { type: 'useCachedKnowledge', data: cached };
                }
                return { type: 'analyzeContent', data: { files: state.results.files } };

            case 'contentAnalyzed':
                return { type: 'generateQuestions', data: { knowledgeMap: state.results.knowledgeMap } };

            case 'questionsGenerated':
                return { type: 'validateQuiz', data: { quiz: state.results.quiz } };

            case 'quizValidated':
                if (state.results.validation.passed) {
                    return { type: 'finalize', data: { quiz: state.results.quiz } };
                } else {
                    // Self-correction: Regenerate with feedback
                    if (state.attempts < 2) {
                        return {
                            type: 'regenerateQuestions',
                            data: {
                                knowledgeMap: state.results.knowledgeMap,
                                feedback: state.results.validation.issues
                            }
                        };
                    } else {
                        // Accept with warning
                        log("⚠️ Accepting quiz despite validation issues after max attempts");
                        return { type: 'finalize', data: { quiz: state.results.quiz } };
                    }
                }

            case 'quizRegenerated':
                return { type: 'validateQuiz', data: { quiz: state.results.quiz } };

            default:
                return { type: 'finalize', data: state.results };
        }
    }

    // Reasoning logic for grading
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

    // Reasoning logic for question answering
    reasonQuestionAnswering(state, params) {
        switch (state.currentStep) {
            case 'initialize':
                if (params.lectureId) {
                    return { type: 'loadFiles', data: { lectureId: params.lectureId } };
                } else {
                    return { type: 'directAnswer', data: { prompt: params.prompt } };
                }

            case 'filesLoaded':
                return { type: 'answerWithContext', data: { files: state.results.files, prompt: params.prompt } };

            default:
                return { type: 'finalize', data: state.results };
        }
    }

    // reasoning logic for cheat sheet generation
    reasonCheatSheet(state, params) {

        switch (state.currentStep) {

            case 'initialize':

                // Step 1: Analyze performance to find weak areas

                return {

                    type: 'analyzeWeakness',

                    data: { quiz: params.quiz, answers: params.answers }

                };



            case 'weaknessAnalyzed':

                // Step 2: Retrieve specific context for those weak topics

                return {

                    type: 'retrieveFocusedContext',

                    data: {

                        lectureId: params.lectureId,

                        topics: state.results.weakAreas

                    }

                };



            case 'contextRetrieved':

                // Step 3: Generate the actual content

                return {

                    type: 'synthesizeCheatSheet',

                    data: {

                        weakAreas: state.results.weakAreas,

                        context: state.results.focusedContext

                    }

                };



            case 'sheetSynthesized':

                return { type: 'finalize', data: { markdown: state.results.cheatSheet } };



            default:

                return { type: 'finalize', data: state.results };

        }

    }







    // ACT: Execute the determined action
    async act(action, params) {
        switch (action.type) {
            case 'loadFiles':
                const files = await tools.loadLectureFiles(action.data.lectureId);
                agentMemory.updateWorking({ filesLoaded: true });
                return { files };

            case 'useCachedKnowledge':
                return { knowledgeMap: action.data.knowledgeMap };

            case 'analyzeContent':
                const knowledgeMap = await this.runAnalyzer(action.data.files, params.lectureId);
                tools.storeResult(`knowledge_${params.lectureId}`, { knowledgeMap });
                return { knowledgeMap };

            case 'generateQuestions':
                const quiz = await this.runGenerator(action.data.knowledgeMap, params.lectureId);
                return { quiz };

            case 'regenerateQuestions':
                const regeneratedQuiz = await this.runGenerator(
                    action.data.knowledgeMap,
                    params.lectureId,
                    action.data.feedback
                );
                return { quiz: regeneratedQuiz };

            case 'validateQuiz':
                const validation = tools.validateQuizQuality(action.data.quiz, this.state.results.knowledgeMap);
                return { validation };

            case 'loadContext':
                const contextFiles = params.lectureId ? await tools.loadLectureFiles(params.lectureId) : [];
                return { contextFiles };

            case 'gradeResponses':
                const grades = await this.runGrader(action.data.quiz, action.data.answers, this.state.results.contextFiles);
                return { grades };

            case 'answerWithContext':
                const answer = await this.runQA(action.data.prompt, action.data.files, params.lectureId);
                return { answer };

            case 'directAnswer':
                const directAnswer = await this.runQA(action.data.prompt);
                return { answer: directAnswer };

            case 'finalize':
                return action.data;

            case 'analyzeWeakness':

                // Simple logic: Find wrong answers, or ask LLM if complex

                const weakAreas = this.identifyWeakAreas(action.data.quiz, action.data.answers);

                return { weakAreas };

            case 'retrieveFocusedContext':

                // Re-use your existing tool to load files, but we could filter specifically if needed

                const focusedContext = await tools.loadLectureFiles(action.data.lectureId);

                return { focusedContext: focusedContext }; // passing full files for now, agent filters

            case 'synthesizeCheatSheet':

                const cheatSheet = await this.runCheatSheetGenerator(

                    action.data.weakAreas,

                    action.data.context

                );

                return { cheatSheet: cheatSheet };



            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    // OBSERVE: Analyze results and update state
    async observe(result, action) {
        // Update results
        this.state.results = { ...this.state.results, ...result };

        // Update state based on action
        switch (action.type) {
            case 'loadFiles':
                this.state.step = 'filesLoaded';
                break;
            case 'useCachedKnowledge':
                this.state.step = 'contentAnalyzed';
                break;
            case 'analyzeContent':
                this.state.step = 'contentAnalyzed';
                break;
            case 'generateQuestions':
                this.state.step = 'questionsGenerated';
                break;
            case 'regenerateQuestions':
                this.state.step = 'quizRegenerated';
                break;
            case 'validateQuiz':
                this.state.step = 'quizValidated';
                break;
            case 'loadContext':
                this.state.step = 'contextLoaded';
                break;
            case 'gradeResponses':
                this.state.step = 'responsesGraded';
                break;
            case 'answerWithContext':
            case 'directAnswer':
                this.state.step = 'answerGenerated';
                break;
            case 'finalize':
                this.state.step = 'complete';
                break;
        }

        // Log observation
        log(`👁️ OBSERVATION: State updated to "${this.state.step}"`);
        agentMemory.updateWorking({ step: this.state.step, lastResult: action.type });
    }

    // Execute analyzer agent
    async runAnalyzer(files, lectureId) {
        log("🔍 Running Analyzer Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `
You are a Content Analyzer AI specializing in educational material extraction.

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
        const response = await result.response;
        const text = tools.extractText(response);
        return tools.parseJSON(text, "Content Analysis");
    }

    // Execute generator agent
    async runGenerator(knowledgeMap, lectureId, feedback = null) {
        log("🎯 Running Generator Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const feedbackText = feedback ? `

PREVIOUS ATTEMPT HAD THESE ISSUES - PLEASE FIX:
${JSON.stringify(feedback, null, 2)}
` : '';

        const prompt = `
You are a Question Architect AI specializing in pedagogical assessment design.

MISSION: Create a comprehensive quiz based on the knowledge map provided.

KNOWLEDGE MAP:
${JSON.stringify(knowledgeMap, null, 2)}
${feedbackText}

QUIZ REQUIREMENTS:
- 4 Multiple Choice Questions (MCQs) - IDs 1-4
- 4 Short Answer Questions - IDs 5-8
- 3 Long Essay Questions - IDs 9-11

STRICT JSON OUTPUT FORMAT:
{
    "title": "Quiz: ${lectureId}",
    "totalQuestions": 11,
    "partA": [
        {
            "id": 1,
            "question": "Clear question text",
            "options": ["A", "B", "C", "D"],
            "answer": 0,
            "rationale": "Explanation"
        }
    ],
    "partB": [
        {
            "id": 5,
            "question": "Short answer question",
            "keyPoints": ["point1", "point2"]
        }
    ],
    "partC": [
        {
            "id": 9,
            "question": "Essay question",
            "gradingCriteria": ["criterion1", "criterion2"]
        }
    ]
}

Return ONLY the JSON object. No markdown, no preamble.`;

        const result = await model.generateContent([{ text: prompt }]);
        const response = await result.response;
        const text = tools.extractText(response);
        return tools.parseJSON(text, "Question Generation");
    }

    // Execute grader agent
    async runGrader(quiz, answers, contextFiles) {
        log("📊 Running Grader Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const prompt = `
You are an Expert Grading AI specializing in educational assessment.

MISSION: Grade student responses and provide detailed feedback.

QUIZ DATA:
${JSON.stringify(quiz, null, 2)}

STUDENT ANSWERS:
${JSON.stringify(answers, null, 2)}

OUTPUT FORMAT (Return ONLY valid JSON):
{
    "overallScore": {
        "total": number,
        "earned": number,
        "percentage": number,
        "grade": "A|B|C|D|F"
    },
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
                "summary": "feedback",
                "strengths": ["strength1"],
                "improvements": ["area1"],
                "keyPointsCovered": ["point1"],
                "keyPointsMissed": ["point1"]
            },
            "rubricBreakdown": {
                "accuracy": number,
                "completeness": number,
                "clarity": number,
                "examples": number
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
        "encouragement": "Personalized message"
    }
}

Return ONLY the JSON object.`;

        const parts = [...(contextFiles || []), { text: prompt }];
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = tools.extractText(response);
        return tools.parseJSON(text, "Grading");
    }

    // Execute QA agent
    async runQA(prompt, files = [], lectureId = null) {
        log("💬 Running QA Agent...");
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const parts = [];

        if (files.length > 0) {
            parts.push(...files);
            const contextPrompt = `You have been provided with lecture materials from "${lectureId}".

Answer the student's question using ONLY information from these files.
Format your response clearly with proper paragraphs and structure.

Student's Question: ${prompt}`;
            parts.push({ text: contextPrompt });
        } else {
            parts.push({ text: prompt });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        return tools.extractText(response);
    }
}



// Global orchestrator instance
const orchestrator = new AgentOrchestrator();

// ============================================================================
// PUBLIC API - Exposed functions for the application
// ============================================================================

/**
 * Generate a quiz using the full agent system
 */
export const generateQuiz = async (lectureId) => {
    try {
        const result = await orchestrator.executeTask('generateQuiz', { lectureId });

        // Format for frontend
        const quiz = result.quiz;
        return {
            title: quiz.title,
            totalQuestions: quiz.totalQuestions,
            partA: quiz.partA.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                answer: q.answer
            })),
            partB: quiz.partB.map(q => ({
                id: q.id,
                question: q.question
            })),
            partC: quiz.partC.map(q => ({
                id: q.id,
                question: q.question
            }))
        };
    } catch (error) {
        logError("Quiz generation failed:", error);
        throw error;
    }
};

/**
 * Grade quiz responses using the full agent system
 */
export const gradeQuizResponses = async (quiz, answers, lectureId = null) => {
    try {
        const result = await orchestrator.executeTask('gradeQuiz', { quiz, answers, lectureId });

        if (result && result.grades) {
            return result.grades;
        }

        console.warn("⚠️ Grading task completed but returned no grades. Using fallback.");
        return generateFallbackGrading(quiz, answers);

    } catch (error) {
        logError("Grading failed:", error);
        // Fallback to simple MCQ grading
        return generateFallbackGrading(quiz, answers);
    }
};

/**
 * Answer a question using the full agent system
 */
export const sendMessageToGemini = async (prompt, lectureId = null) => {
    try {
        const result = await orchestrator.executeTask('answerQuestion', { prompt, lectureId });
        return result.answer;
    } catch (error) {
        logError("Question answering failed:", error);
        return `❌ Error: ${error.message}`;
    }
};

/**
 * Generate a study guide based on quiz results
 */
export const generateStudyGuide = async (quiz, answers, lectureId) => {
    try {
        // This calls the Orchestrator with the new task type
        const result = await orchestrator.executeTask('generateCheatSheet', { quiz, answers, lectureId });
        return result.markdown;
    } catch (error) {
        logError("Cheat Sheet failed:", error);
        throw error;
    }
};




/**
 * Get agent memory for debugging
 */
export const getAgentMemory = () => {
    return {
        longTerm: Array.from(agentMemory.longTerm.entries()),
        working: agentMemory.getWorking(),
        transactions: agentMemory.getAuditTrail()
    };
};

/**
 * List available lectures
 */
export const listAvailableLectures = () => {
    const lectures = new Set();
    Object.keys(allAssetModules).forEach(path => {
        const match = path.match(/\/assets\/([^/]+)\//);
        if (match && match[1] !== 'assets') {
            lectures.add(match[1]);
        }
    });
    return Array.from(lectures).sort();
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const getMimeType = (url, existingType) => {
    if (existingType && existingType !== 'application/octet-stream') {
        return existingType;
    }
    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    const typeMap = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'txt': 'text/plain'
    };
    return typeMap[ext] || existingType;
};

const generateFallbackGrading = (quiz, answers) => {
    const questionGrades = [];
    let totalEarned = 0;
    let totalPossible = 0;

    if (quiz.partA) {
        quiz.partA.forEach(q => {
            const isCorrect = parseInt(answers[q.id]) === q.answer;
            const score = isCorrect ? 1 : 0;
            questionGrades.push({
                id: q.id,
                type: 'mcq',
                question: q.question,
                userAnswer: q.options?.[answers[q.id]] || "No answer",
                correctAnswer: q.options?.[q.answer],
                score: score,
                maxScore: 1,
                isCorrect: isCorrect,
                feedback: {
                    summary: isCorrect ? "Correct!" : "Incorrect answer",
                    strengths: isCorrect ? ["Correct selection"] : [],
                    improvements: isCorrect ? [] : ["Review this concept"],
                    keyPointsCovered: [],
                    keyPointsMissed: []
                }
            });
            totalEarned += score;
            totalPossible += 1;
        });
    }

    const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

    return {
        overallScore: {
            total: totalPossible,
            earned: totalEarned,
            percentage: percentage,
            grade: getLetterGrade(percentage)
        },
        questionGrades: questionGrades,
        overallFeedback: {
            strengths: ["Completed the assessment"],
            areasForImprovement: [],
            conceptsToReview: []
        }
    };
};

const getLetterGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
};

// Legacy exports for compatibility
export async function testSetup() {
    console.log("=== Testing Agent System ===");
    console.log("✓ API Key present:", !!API_KEY);
    console.log("✓ Memory system initialized:", !!agentMemory);
    console.log("✓ Orchestrator ready:", !!orchestrator);
    console.log("✓ Assets found:", Object.keys(allAssetModules).length);
    return "✅ Agent system operational";
};

export const renderMarkdown = (text) => {
    if (!text) return '';
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    return text;
};

log("🤖 Full Agent System Initialized");
log(`📊 Memory: ${agentMemory.longTerm.size} items in long-term storage`);
log(`🔧 Tools: ${Object.keys(tools).length} tools available`);
log(`🎯 Orchestrator: Ready for agentic workflows`);


// ============================================================================
// QUOTA-OPTIMIZED VIVA MODE
// Uses fewer API calls and handles quota limits gracefully
// ============================================================================

const vivaSessions = new Map();
let apiCallCount = 0;
const MAX_DAILY_CALLS = 18; // Leave buffer below the 20 limit

// Helper function to extract text
const extractText = (response) => {
    try {
        return response.text();
    } catch (error) {
        console.error("Error extracting text:", error);
        return "";
    }
};

// Helper to check if we can make an API call
const canMakeApiCall = () => {
    if (apiCallCount >= MAX_DAILY_CALLS) {
        console.warn(`⚠️ Approaching API limit (${apiCallCount}/${MAX_DAILY_CALLS})`);
        return false;
    }
    return true;
};

// Helper to increment API call counter
const trackApiCall = () => {
    apiCallCount++;
    console.log(`📊 API calls today: ${apiCallCount}/${MAX_DAILY_CALLS}`);
};

/**
 * Start session - QUOTA OPTIMIZED
 */
export const startVivaSession = async (lectureId) => {
    try {
        console.log("🎤 Starting Viva Session for:", lectureId);

        // Check quota before making call
        if (!canMakeApiCall()) {
            throw new Error("Daily API quota limit reached. Please try again tomorrow or upgrade your plan.");
        }

        const sessionId = `viva_${Date.now()}`;
        const lectureTitle = lectureId
            .replace(/_/g, ' ')
            .replace(/leacture/i, 'Lecture')
            .replace(/\b\w/g, c => c.toUpperCase());

        console.log("📋 Creating session for:", lectureTitle);

        // Generate first question with retry logic
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 256, // Reduced to save quota
            }
        });

        const firstQuestionPrompt = `Ask one clear question about ${lectureTitle}. No formatting.`;

        console.log("❓ Generating first question...");

        let questionResult;
        try {
            questionResult = await model.generateContent([{ text: firstQuestionPrompt }]);
            trackApiCall();
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('quota')) {
                throw new Error("API quota exceeded. Try again tomorrow or upgrade to paid tier at https://ai.google.dev/pricing");
            }
            throw error;
        }

        const rawQuestion = extractText(questionResult.response);
        const firstQuestion = rawQuestion
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/^["']|["']$/g, '')
            .replace(/^Question:\s*/i, '')
            .trim();

        console.log("✅ Question generated:", firstQuestion);

        // Create session
        vivaSessions.set(sessionId, {
            lectureId,
            lectureTitle: lectureTitle,
            knowledgeMap: { lectureTitle: lectureTitle, mainTopics: [lectureTitle] },
            examPlan: { basicTopics: [lectureTitle], estimatedDuration: 15 },
            currentLevel: 'basic',
            questionCount: 1,
            topicsCovered: [lectureTitle],
            performanceScores: [],
            history: [
                { role: 'model', parts: [{ text: firstQuestion }] }
            ],
            createdAt: Date.now(),
            language: 'en',
            isFallback: false,
            useSimpleMode: apiCallCount >= MAX_DAILY_CALLS - 5 // Switch to simple mode when close to limit
        });

        console.log(`✅ Session ${sessionId} created (AI MODE, ${apiCallCount} API calls used)`);

        return {
            sessionId,
            message: firstQuestion
        };

    } catch (error) {
        console.error("❌ Session start error:", error.message);
        throw error; // Let the UI handle the error display
    }
};

/**
 * Process turn - QUOTA OPTIMIZED with intelligent fallback
 */
export const processVivaTurn = async (sessionId, userAudioText) => {
    try {
        const session = vivaSessions.get(sessionId);

        if (!session) {
            throw new Error("Session not found. Please restart.");
        }

        console.log(`🎤 Processing turn (${apiCallCount}/${MAX_DAILY_CALLS} API calls used)`);
        console.log(`📝 User: "${userAudioText}"`);

        // Add user's response to history
        session.history.push({
            role: 'user',
            parts: [{ text: userAudioText }]
        });

        // SMART FALLBACK: Use simple responses if approaching quota limit
        if (session.useSimpleMode || !canMakeApiCall()) {
            console.log("💡 Using quota-saving mode (smart templates)");

            // Intelligent template-based responses
            const response = generateSmartResponse(userAudioText, session);

            session.history.push({
                role: 'model',
                parts: [{ text: response }]
            });

            session.questionCount++;
            return { message: response };
        }

        // FULL AI MODE: Use API when quota available
        console.log("🤖 Using AI mode");

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 256, // Reduced to save quota
            }
        });

        const chat = model.startChat({
            history: session.history.slice(0, -1)
        });

        const followUpPrompt = `Topic: ${session.lectureTitle}
Student said: "${userAudioText}"

Respond in 2 sentences. Evaluate their answer and ask ONE follow-up question. No formatting.`;

        let result;
        try {
            result = await chat.sendMessage(followUpPrompt);
            trackApiCall();

            // Switch to simple mode if getting close to limit
            if (apiCallCount >= MAX_DAILY_CALLS - 3) {
                session.useSimpleMode = true;
                console.log("⚠️ Switching to simple mode to preserve quota");
            }
        } catch (error) {
            if (error.message.includes('429') || error.message.includes('quota')) {
                console.log("⚠️ Quota exceeded, switching to simple mode");
                session.useSimpleMode = true;
                return processVivaTurn(sessionId, userAudioText); // Retry with simple mode
            }
            throw error;
        }

        const rawResponse = extractText(result.response);
        const responseText = rawResponse
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/^["']|["']$/g, '')
            .trim();

        console.log(`✅ AI response: "${responseText}"`);

        session.history.push({
            role: 'model',
            parts: [{ text: responseText }]
        });

        session.questionCount++;

        // Track performance
        const answerLength = userAudioText.split(' ').length;
        if (answerLength > 20) {
            session.performanceScores.push({ question: session.questionCount - 1, score: 'good' });
        } else if (answerLength > 10) {
            session.performanceScores.push({ question: session.questionCount - 1, score: 'average' });
        } else {
            session.performanceScores.push({ question: session.questionCount - 1, score: 'brief' });
        }

        return { message: responseText };

    } catch (error) {
        console.error("❌ Turn error:", error);
        throw error;
    }
};

/**
 * Generate smart template-based response (no API call needed)
 */
function generateSmartResponse(userInput, session) {
    const inputLower = userInput.toLowerCase();
    const answerLength = userInput.split(' ').length;

    // Analyze user input for keywords
    const hasExample = /example|instance|like|such as/i.test(userInput);
    const hasTechnical = /algorithm|function|system|process|method/i.test(userInput);
    const isShort = answerLength < 10;
    const isDetailed = answerLength > 25;

    // Generate contextual response
    if (isShort) {
        return `That's a start. Could you expand on that and provide more details about ${session.lectureTitle}?`;
    }

    if (isDetailed && hasExample) {
        return `Excellent explanation with good examples! Now, can you explain how this concept applies in real-world scenarios?`;
    }

    if (hasTechnical) {
        return `Good technical understanding. Can you explain the practical implications of what you just described?`;
    }

    if (hasExample) {
        return `Nice example! Can you connect this back to the core concepts of ${session.lectureTitle}?`;
    }

    // Vary questions based on question count
    const questions = [
        `Interesting point. Can you elaborate on the key aspects you mentioned?`,
        `I see. What would be a practical application of this concept?`,
        `Good. Can you explain how this relates to the broader topic of ${session.lectureTitle}?`,
        `That helps. What challenges might arise when implementing this?`,
        `Thank you. Can you summarize the most important takeaway from what you've explained?`
    ];

    return questions[session.questionCount % questions.length];
}

/**
 * End session
 */
export const endVivaSession = async (sessionId) => {
    try {
        const session = vivaSessions.get(sessionId);
        if (!session) return null;

        const summary = {
            sessionId,
            lectureId: session.lectureId,
            lectureTitle: session.lectureTitle,
            duration: Math.floor((Date.now() - session.createdAt) / 1000 / 60),
            totalQuestions: session.questionCount,
            topicsCovered: session.topicsCovered,
            apiCallsUsed: apiCallCount,
            performance: {
                goodAnswers: session.performanceScores.filter(s => s.score === 'good').length,
                averageAnswers: session.performanceScores.filter(s => s.score === 'average').length,
                briefAnswers: session.performanceScores.filter(s => s.score === 'brief').length
            },
            transcript: session.history.map(h => ({
                role: h.role === 'model' ? 'Examiner' : 'Student',
                message: h.parts[0].text,
                timestamp: new Date().toISOString()
            }))
        };

        vivaSessions.delete(sessionId);
        console.log(`✅ Session ended. API calls used today: ${apiCallCount}`);

        return summary;

    } catch (error) {
        console.error("❌ End session error:", error);
        return null;
    }
};

/**
 * Get current quota status
 */
export const getQuotaStatus = () => {
    return {
        used: apiCallCount,
        limit: MAX_DAILY_CALLS,
        remaining: MAX_DAILY_CALLS - apiCallCount,
        percentage: Math.round((apiCallCount / MAX_DAILY_CALLS) * 100)
    };
};

/**
 * Reset quota counter (call at midnight or when new day starts)
 */
export const resetQuotaCounter = () => {
    const oldCount = apiCallCount;
    apiCallCount = 0;
    console.log(`🔄 Quota counter reset (was ${oldCount})`);
};

// Utility functions
export const getVivaSessions = () => {
    return Array.from(vivaSessions.entries()).map(([id, session]) => ({
        sessionId: id,
        lectureId: session.lectureId,
        questionCount: session.questionCount,
        useSimpleMode: session.useSimpleMode || false,
        createdAt: new Date(session.createdAt).toISOString(),
        duration: Math.floor((Date.now() - session.createdAt) / 1000) + 's'
    }));
};

export const clearAllVivaSessions = () => {
    const count = vivaSessions.size;
    vivaSessions.clear();
    console.log(`🧹 Cleared ${count} sessions`);
    return count;
};

console.log("✅ Quota-Optimized Viva Mode Initialized");
console.log(`📊 API call limit: ${MAX_DAILY_CALLS} per day`);
console.log("💡 Auto-switches to smart mode when quota is low");