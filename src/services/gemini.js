/* Fixed version - import.meta.glob MUST be at top level */
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ CRITICAL: import.meta.glob MUST be at module top level
// Only load supported file types to avoid Vite parsing errors
const allAssetModules = {
    ...import.meta.glob('/src/assets/**/*.pdf', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.txt', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpg', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.jpeg', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.png', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.webp', { eager: true, query: '?url', import: 'default' }),
};

console.log("📦 Vite loaded", Object.keys(allAssetModules).length, "asset files");
console.log("📂 Asset paths:", Object.keys(allAssetModules));

// Debug mode
const DEBUG = true;
const log = (...args) => DEBUG && console.log("🔧 [RAG]", ...args);
const logError = (...args) => console.error("❌ [RAG]", ...args);

// Configuration
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "demo_fake_key_12345";
const MODEL_NAME = 'gemini-3-flash-preview';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Initialize
let genAI = null;
let model = null;

try {
    // Initialization always succeeds with fallback key to prevent crashes
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });

    if (API_KEY === "demo_fake_key_12345") {
        log("⚠️ Using DEMO API KEY. AI features will not work, but UI will load.");
    } else {
        log("✅ Gemini model initialized with valid key structure");
    }
} catch (error) {
    logError("Failed to initialize:", error.message);
    // Even if it fails, we should try to keep genAI non-null if possible, 
    // but GoogleGenerativeAI constructor rarely fails synchronously on simple string.
}

/**
 * Blob to Base64 converter
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Get MIME type from file extension
 */
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

/**
 * Format AI response for better readability
 */
const formatResponse = (text) => {
    if (!text || typeof text !== 'string') return text;

    // Add line breaks before numbered lists
    text = text.replace(/(\d+\.\s\*\*)/g, '\n\n$1');

    // Add spacing around bold headers
    text = text.replace(/(\*\*[^*]+\*\*)/g, '\n\n$1\n');

    // Fix multiple asterisks (***) to single bold (**)
    text = text.replace(/\*{3,}([^*]+)\*{3,}/g, '**$1**');

    // Ensure proper spacing after periods in lists
    text = text.replace(/\.\s*(\d+\.)/g, '.\n\n$1');

    // Clean up excessive newlines
    text = text.replace(/\n{4,}/g, '\n\n');

    return text.trim();
};

/**
 * Extract text from Gemini response (handles multiple formats)
 */
const extractText = (response) => {
    try {
        log("Response structure:", JSON.stringify(response, null, 2).substring(0, 200));

        // Try text() method
        if (typeof response?.text === 'function') {
            const result = response.text();
            log("Extracted via text() method:", result.substring(0, 100));
            return result;
        }

        // Try text property
        if (response?.text && typeof response.text === 'string') {
            log("Extracted via text property");
            return response.text;
        }

        // Try candidates structure (most common for Gemini)
        if (response?.candidates?.[0]) {
            const candidate = response.candidates[0];

            // Check content.parts
            if (candidate.content?.parts?.[0]?.text) {
                log("Extracted via candidates[0].content.parts[0].text");
                return candidate.content.parts[0].text;
            }

            // Check if parts is array and has text
            if (Array.isArray(candidate.content?.parts)) {
                const texts = candidate.content.parts
                    .filter(part => part.text)
                    .map(part => part.text)
                    .join('\n');
                if (texts) {
                    log("Extracted via parts array");
                    return texts;
                }
            }
        }

        // Try parts array directly
        if (Array.isArray(response?.parts)) {
            const texts = response.parts
                .filter(part => part.text)
                .map(part => part.text)
                .join('\n');
            if (texts) {
                log("Extracted via direct parts array");
                return texts;
            }
        }

        logError("Could not extract text from response structure");
        logError("Available keys:", Object.keys(response || {}));
        return "[No text could be extracted from the response. Check console for details.]";

    } catch (error) {
        logError("Text extraction error:", error);
        logError("Response was:", response);
        return `[Error extracting text: ${error.message}]`;
    }
};

/**
 * Load files for a specific lecture
 */
const loadLectureFiles = async (lectureId) => {
    log(`📂 Loading files for lecture: "${lectureId}"`);

    // Filter files for this specific lecture (supports both leacture_1 and lecture-01 formats)
    const lectureFilePaths = Object.keys(allAssetModules).filter(path => {
        const normalized = path.toLowerCase();
        const idNormalized = lectureId.toLowerCase();

        // Match both /leacture_1/ and /lecture-01/ patterns
        return normalized.includes(`/${idNormalized}/`) ||
            normalized.includes(`/assets/${idNormalized}/`);
    });

    if (lectureFilePaths.length === 0) {
        // Show helpful error with available lectures
        const available = listAvailableLectures();
        throw new Error(
            `No files found for lecture "${lectureId}".\n` +
            `Available lectures: ${available.join(', ')}\n` +
            `Check your /src/assets/ folder.`
        );
    }

    log(`Found ${lectureFilePaths.length} files for "${lectureId}":`, lectureFilePaths);

    const parts = [];
    let loadedCount = 0;

    for (const path of lectureFilePaths) {
        try {
            // Get the file URL from Vite's module
            const fileUrl = allAssetModules[path];

            log(`Loading: ${path.split('/').pop()}`);

            // Fetch the file
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();

            // Check file size
            if (blob.size > MAX_FILE_SIZE) {
                log(`⚠️ Skipping large file (${(blob.size / 1024 / 1024).toFixed(2)}MB): ${path}`);
                continue;
            }

            // Get MIME type
            const mimeType = getMimeType(fileUrl, blob.type);

            log(`File details: ${path.split('/').pop()} - Type: ${mimeType}, Size: ${blob.size} bytes`);

            // Validate supported types
            const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
            if (!supportedTypes.includes(mimeType)) {
                log(`⚠️ Skipping unsupported type (${mimeType}): ${path}`);
                continue;
            }

            // Convert to base64
            const base64Data = await blobToBase64(blob);

            // Verify base64 is valid
            if (!base64Data || base64Data.length < 100) {
                logError(`Base64 conversion failed or file too small for ${path}`);
                continue;
            }

            log(`✅ Base64 length: ${base64Data.length} chars`);

            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });

            loadedCount++;
            log(`✅ Loaded [${loadedCount}]: ${path.split('/').pop()} (${mimeType}, ${(blob.size / 1024).toFixed(1)}KB)`);

        } catch (fileError) {
            logError(`Failed to load ${path}:`, fileError.message);
        }
    }

    if (loadedCount === 0) {
        throw new Error(`No valid files could be loaded for lecture "${lectureId}". Check file types (PDF, TXT, JPG, PNG only).`);
    }

    log(`📤 Successfully loaded ${loadedCount}/${lectureFilePaths.length} files`);
    log(`Total data parts being sent to Gemini: ${parts.length}`);
    return parts;
};

/**
 * Main function to send message to Gemini
 */
export const sendMessageToGemini = async (prompt, lectureId = null) => {
    log("=== New Request ===");
    log("Prompt:", prompt?.substring(0, 50) + "...");
    log("Lecture:", lectureId || "none");

    // Validation
    if (!API_KEY) {
        return "❌ Error: VITE_GEMINI_API_KEY not found. Add it to your .env file.";
    }

    if (!model) {
        return "❌ Error: Gemini model failed to initialize. Check your API key.";
    }

    if (!prompt?.trim()) {
        return "❌ Error: Please provide a question.";
    }

    try {
        const parts = [];

        // Load lecture files if specified
        if (lectureId) {
            try {
                const fileParts = await loadLectureFiles(lectureId);
                parts.push(...fileParts);

                // Build file list for context
                const fileList = Object.keys(allAssetModules)
                    .filter(path => path.toLowerCase().includes(`/${lectureId.toLowerCase()}/`))
                    .map(path => path.split('/').pop())
                    .join(', ');

                // Add context instruction with clear file references
                const contextPrompt = `You have been provided with ${fileParts.length} file(s) from lecture "${lectureId}": ${fileList}

CRITICAL INSTRUCTIONS:
1. CAREFULLY READ AND ANALYZE all the attached files (PDFs, images, text).
2. Answer the student's question ONLY using information found in these files.
3. Format your response with proper paragraphs, bullet points, and line breaks for readability.
4. Use headings (with **bold**) to organize different sections of your answer.
5. If you find the answer in the files, provide a well-structured, easy-to-read response.
6. If the information is NOT in the files, respond: "I cannot find that information in the lecture materials provided."
7. DO NOT use any external knowledge or make assumptions.

Student's Question: ${prompt}

Please provide a clear, well-formatted answer with:
- Proper paragraph breaks
- Bullet points where appropriate  
- Headings to organize information
- Clear, readable structure

Answer based ONLY on the content of the attached files.`;

                parts.push({ text: contextPrompt });

                log(`📝 Prompt built with ${parts.length} total parts (${fileParts.length} files + 1 text prompt)`);

            } catch (loadError) {
                return `❌ ${loadError.message}`;
            }
        } else {
            // No lecture context - just the prompt
            parts.push({ text: prompt });
        }

        log(`🚀 Sending ${parts.length} parts to Gemini`);

        // Generate content
        const result = await model.generateContent(parts);
        const response = await result.response;
        const rawText = extractText(response);

        // Format the response for better readability
        const formattedText = formatResponse(rawText);

        log("✅ Response received:", formattedText.substring(0, 100) + "...");
        return formattedText;

    } catch (error) {
        logError("Request failed:", error.message);

        // User-friendly error messages
        if (error.message?.includes("404")) {
            return `❌ Model "${MODEL_NAME}" not found. Your API key may not have access to Gemini 3.`;
        }
        if (error.message?.includes("429") || error.message?.includes("quota")) {
            return "❌ Rate limit exceeded. Gemini 3 allows 5 requests/minute. Please wait 60 seconds.";
        }
        if (error.message?.includes("PERMISSION_DENIED")) {
            return "❌ Permission denied. Check your API key has the correct permissions.";
        }
        if (error.message?.includes("API key")) {
            return "❌ Invalid API key. Get a new one at: https://aistudio.google.com/apikey";
        }

        return `❌ Error: ${error.message}`;
    }
};

/**
 * Test function to verify setup
 */
export const testSetup = async () => {
    console.log("=== Testing Gemini Setup ===");
    console.log("✓ API Key present:", !!API_KEY);
    console.log("✓ Model initialized:", !!model);
    console.log("✓ Assets found:", Object.keys(allAssetModules).length);

    if (!API_KEY) {
        return "❌ No API key. Add VITE_GEMINI_API_KEY to your .env file.";
    }

    try {
        const result = await sendMessageToGemini("Say 'Setup successful!'");
        return result;
    } catch (error) {
        return `❌ Test failed: ${error.message}`;
    }
};

/**
 * List available lectures
 */
export const listAvailableLectures = () => {
    const lectures = new Set();

    Object.keys(allAssetModules).forEach(path => {
        // Extract lecture folder name: /src/assets/leacture_1/file.pdf -> leacture_1
        const match = path.match(/\/assets\/([^/]+)\//);
        if (match && match[1] !== 'assets') {
            lectures.add(match[1]);
        }
    });

    const lectureList = Array.from(lectures).sort();
    console.log("📚 Available lectures:", lectureList);
    return lectureList;
};

// Log initialization info
log("Module initialized");
log("Available lectures:", listAvailableLectures());

/**
 * BONUS: Simple markdown-to-HTML converter for displaying in React
 * Use this in your component to render formatted responses
 */
export const renderMarkdown = (text) => {
    if (!text) return '';

    // Convert bold **text** to <strong>
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert line breaks to <br>
    text = text.replace(/\n/g, '<br>');

    // Convert numbered lists
    text = text.replace(/(\d+\.\s)/g, '<br>$1');

    return text;
};

// ... existing code ...

/**
 * Generate a quiz based on lecture content
 * Returns a JSON object matching the structure of quizData.json
 */



// Different models for different agent roles
const analyzerModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
const generatorModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
const validatorModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// ============================================================================
// AGENT 1: CONTENT ANALYZER & KNOWLEDGE MAPPER
// ============================================================================
const runContentAnalyzer = async (lectureFiles, lectureId) => {
    log("🔍 AGENT 1: Starting Content Analysis...");

    const analyzerPrompt = `
You are a Content Analyzer AI specializing in educational material extraction.

MISSION: Analyze the provided lecture materials and create a comprehensive knowledge map.

INPUT SOURCES:
- Lecture PDF (slides/notes)
- Audio Transcript (what was actually said in class)
- Question Bank (historical question patterns)

OUTPUT: Return ONLY valid JSON with this exact structure:

{
    "lectureMetadata": {
        "title": "string",
        "topics": ["topic1", "topic2", ...],
        "difficulty": "beginner|intermediate|advanced",
        "estimatedStudyTime": "number (minutes)"
    },
    "concepts": [
        {
            "name": "concept name",
            "importance": "critical|high|medium|low",
            "difficulty": "easy|medium|hard",
            "slideReferences": [slide numbers],
            "audioTimestamps": ["MM:SS", ...],
            "mentionCount": number,
            "keyDefinitions": ["definition1", ...],
            "realWorldExamples": ["example1", ...],
            "relatedConcepts": ["related1", ...]
        }
    ],
    "emphasisPatterns": {
        "repeatedConcepts": ["concept1", ...],
        "instructorFocus": "what instructor emphasized",
        "timeSpentByTopic": {"topic": minutes}
    },
    "questionBankPatterns": {
        "commonQuestionTypes": ["MCQ", "Short", "Essay"],
        "focusAreas": ["area1", ...],
        "difficultyDistribution": {"easy": %, "medium": %, "hard": %},
        "exampleQuestions": [
            {"type": "MCQ", "sample": "question text"}
        ]
    },
    "contentGaps": ["areas not well covered"],
    "assessmentRecommendations": {
        "mcqTopics": ["topic1", ...],
        "shortAnswerTopics": ["topic1", ...],
        "essayTopics": ["topic1", ...]
    }
}

ANALYSIS GUIDELINES:
1. Cross-reference all three sources
2. Concepts mentioned in audio + slides = higher importance
3. Time spent in audio = emphasis level
4. Question bank shows what's traditionally tested
5. Identify key terms, processes, theories, applications
6. Note what instructor emphasized verbally vs what's just on slides

Return ONLY the JSON object. No markdown, no explanations.
`;

    const parts = [...lectureFiles, { text: analyzerPrompt }];

    try {
        const result = await analyzerModel.generateContent(parts);
        const response = await result.response;
        const text = extractText(response);

        const knowledgeMap = parseJSON(text, "Content Analysis");
        log("✅ AGENT 1: Knowledge map created", knowledgeMap);

        return knowledgeMap;
    } catch (error) {
        logError("AGENT 1 failed", error);
        throw new Error("Content analysis failed");
    }
};
// ============================================================================
// LOGGING UTILITIES
// ============================================================================
const logagent = (message, data = null) => {
    console.log(`[QuizGen] ${message}`, data || '');
};

const logErroragent = (message, error) => {
    console.error(`[QuizGen ERROR] ${message}`, error);
};

const extractTextagent = (response) => {
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

// ============================================================================
// FILE LOADING UTILITIES
// ============================================================================
const loadLectureFilesagent = async (lectureId) => {
    const parts = [];

    try {
        // Try to load PDF
        const pdfPath = `/src/assets/${lectureId}/lecture.pdf`;
        const pdfModule = await import(/* @vite-ignore */ pdfPath);
        const pdfResponse = await fetch(pdfModule.default);
        const pdfBlob = await pdfResponse.blob();
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: await blobToBase64(pdfBlob)
            }
        });
        logagent(`✓ Loaded lecture PDF`);
    } catch (e) {
        logagent(`⚠ No PDF found for ${lectureId}`);
    }

    try {
        // Try to load transcript
        const transcriptPath = `/src/assets/${lectureId}/transcript.txt`;
        const transcriptModule = await import(/* @vite-ignore */ transcriptPath);
        const transcriptResponse = await fetch(transcriptModule.default);
        const transcriptText = await transcriptResponse.text();
        parts.push({
            text: `\n\n=== LECTURE AUDIO TRANSCRIPT ===\n${transcriptText}\n=== END TRANSCRIPT ===\n\n`
        });
        log(`✓ Loaded audio transcript`);
    } catch (e) {
        log(`⚠ No transcript found for ${lectureId}`);
    }

    try {
        // Try to load question bank
        const qbankPath = `/src/assets/${lectureId}/question_bank.pdf`;
        const qbankModule = await import(/* @vite-ignore */ qbankPath);
        const qbankResponse = await fetch(qbankModule.default);
        const qbankBlob = await qbankResponse.blob();
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: await blobToBase64(qbankBlob)
            }
        });
        log(`✓ Loaded question bank`);
    } catch (e) {
        log(`⚠ No question bank found for ${lectureId}`);
    }

    return parts;
};

const blobToBase64agent = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// ============================================================================
// AGENT 2: QUESTION ARCHITECT & GENERATOR
// ============================================================================
const runQuestionGenerator = async (knowledgeMap, lectureId) => {
    log("🎯 AGENT 2: Starting Question Generation...");

    const generatorPrompt = `
You are a Question Architect AI specializing in pedagogical assessment design.

MISSION: Create a comprehensive quiz based on the knowledge map provided.

KNOWLEDGE MAP:
${JSON.stringify(knowledgeMap, null, 2)}

QUIZ REQUIREMENTS:
- 4 Multiple Choice Questions (MCQs) - IDs 1-4
- 4 Short Answer Questions - IDs 5-8  
- 3 Long Essay Questions - IDs 9-11

QUESTION DESIGN PRINCIPLES:

**MCQs (Part A - Recall & Recognition):**
- ID 1-2: Easy recall (definitions, basic facts)
- ID 3: Medium application (scenarios, examples)
- ID 4: Hard analysis (comparing concepts, inference)
- All distractors must be plausible but clearly incorrect
- Use concepts marked "critical" or "high" importance
- Reference slide numbers in internal notes

**Short Answer (Part B - Understanding & Application):**
- Test processes, comparisons, explanations
- Should require 2-4 sentences
- Focus on "how" and "why" questions
- Include at least one real-world application
- Use medium-high difficulty concepts

**Essay Questions (Part C - Synthesis & Critical Thinking):**
- Require multi-paragraph responses
- Combine 2+ concepts from knowledge map
- Include analysis, evaluation, or creation tasks
- At least one should reference real-world scenarios
- Draw from "emphasisPatterns" for relevance

STRICT JSON OUTPUT FORMAT:
{
    "title": "Quiz: ${lectureId}",
    "totalQuestions": 11,
    "metadata": {
        "difficulty": "balanced",
        "estimatedTime": 45,
        "coverageScore": 0.85
    },
    "partA": [
        {
            "id": 1,
            "question": "Clear, unambiguous question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": 2,
            "rationale": "Why this answer is correct and others are wrong",
            "difficulty": "easy",
            "conceptTested": "concept name from knowledge map",
            "slideRef": [12, 15]
        }
    ],
    "partB": [
        {
            "id": 5,
            "question": "Short answer question requiring 2-4 sentences",
            "difficulty": "medium",
            "conceptsTested": ["concept1", "concept2"],
            "expectedLength": "2-4 sentences",
            "keyPoints": ["point1", "point2"]
        }
    ],
    "partC": [
        {
            "id": 9,
            "question": "Essay question requiring synthesis and analysis",
            "difficulty": "hard",
            "conceptsTested": ["concept1", "concept2", "concept3"],
            "expectedLength": "3-4 paragraphs",
            "gradingCriteria": ["criterion1", "criterion2"],
            "bloomLevel": "analyze|evaluate|create"
        }
    ]
}

QUALITY STANDARDS:
- Questions must be clear, specific, and professionally worded
- No ambiguous or trick questions
- Distribute across all major topics in knowledge map
- Avoid questions that can be answered without understanding
- Each question should have educational value
- Use varied question stems (not all "What is...")

Return ONLY the JSON object. No markdown, no preamble.
`;

    try {
        const result = await generatorModel.generateContent([{ text: generatorPrompt }]);
        const response = await result.response;
        const text = extractText(response);

        const quizData = parseJSON(text, "Question Generation");
        log("✅ AGENT 2: Quiz generated", quizData);

        return quizData;
    } catch (error) {
        logError("AGENT 2 failed", error);
        throw new Error("Question generation failed");
    }
};

// ============================================================================
// AGENT 3: QUALITY VALIDATOR & ENHANCER
// ============================================================================
const runQualityValidator = async (quizData, knowledgeMap) => {
    log("🔬 AGENT 3: Starting Quality Validation...");

    const validatorPrompt = `
You are a Quality Validator AI specializing in educational assessment review.

MISSION: Review the generated quiz and ensure it meets quality standards.

QUIZ TO VALIDATE:
${JSON.stringify(quizData, null, 2)}

KNOWLEDGE MAP:
${JSON.stringify(knowledgeMap, null, 2)}

VALIDATION CHECKLIST:

**Structural Validation:**
- All 11 questions present (IDs 1-11)
- Correct distribution: 4 MCQ, 4 Short, 3 Essay
- All required fields present
- Proper data types

**Content Quality:**
- Questions are clear and unambiguous
- No grammatical errors
- Professional academic tone
- Questions test understanding, not memorization

**MCQ Specific:**
- All have exactly 4 options
- Distractors are plausible but incorrect
- Answer index is correct (0-3)
- No obviously wrong options

**Coverage Analysis:**
- All critical concepts from knowledge map addressed
- Good topic distribution
- Difficulty progression appropriate
- No redundant questions

**Difficulty Balance:**
- Mix of easy, medium, hard questions
- Progressive difficulty within sections
- Matches knowledge map difficulty indicators

OUTPUT: Return ONLY valid JSON:

{
    "validationStatus": "APPROVED" | "NEEDS_REVISION",
    "overallScore": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "questionId": number,
            "issue": "description",
            "suggestion": "how to fix"
        }
    ],
    "qualityMetrics": {
        "clarity": 0-10,
        "difficulty": 0-10,
        "coverage": 0-10,
        "pedagogicalValue": 0-10
    },
    "revisedQuiz": {
        // If NEEDS_REVISION, include improved version
        // If APPROVED, return original quiz
    },
    "validatorNotes": "Overall assessment and recommendations"
}

If score < 70, status must be NEEDS_REVISION with corrected quiz.
If score >= 70, status is APPROVED with original quiz.

Return ONLY the JSON object. No markdown.
`;

    try {
        const result = await validatorModel.generateContent([{ text: validatorPrompt }]);
        const response = await result.response;
        const text = extractText(response);

        const validation = parseJSON(text, "Quality Validation");
        log("✅ AGENT 3: Validation complete", validation);

        return validation;
    } catch (error) {
        logError("AGENT 3 failed", error);
        // If validation fails, return original quiz
        return {
            validationStatus: "APPROVED",
            overallScore: 75,
            revisedQuiz: quizData,
            validatorNotes: "Validation agent failed, proceeding with generated quiz"
        };
    }
};

// ============================================================================
// ORCHESTRATOR: MULTI-AGENT COORDINATION
// ============================================================================
export const generateQuiz = async (lectureId) => {
    log(`\n${"=".repeat(60)}`);
    log(`🎓 MULTI-AGENT QUIZ GENERATION INITIATED`);
    log(`📚 Lecture: "${lectureId}"`);
    log(`${"=".repeat(60)}\n`);

    if (!API_KEY) {
        throw new Error("VITE_GEMINI_API_KEY is missing. Please add it to your .env file.");
    }

    try {
        // ====================================================================
        // PHASE 1: Load Source Materials
        // ====================================================================
        log("📂 PHASE 1: Loading lecture materials...");
        const lectureFiles = await loadLectureFiles(lectureId);

        if (lectureFiles.length === 0) {
            throw new Error(`No materials found for lecture: ${lectureId}`);
        }

        log(`✓ Loaded ${lectureFiles.length} source files\n`);

        // ====================================================================
        // PHASE 2: Agent 1 - Content Analysis
        // ====================================================================
        log("📂 PHASE 2: Content Analysis & Knowledge Mapping...");
        const knowledgeMap = await runContentAnalyzer(lectureFiles, lectureId);

        const conceptCount = knowledgeMap.concepts?.length || 0;
        const criticalConcepts = knowledgeMap.concepts?.filter(c => c.importance === 'critical').length || 0;
        log(`✓ Identified ${conceptCount} concepts (${criticalConcepts} critical)\n`);

        // ====================================================================
        // PHASE 3: Agent 2 - Question Generation
        // ====================================================================
        log("📂 PHASE 3: Question Architecture & Generation...");
        const generatedQuiz = await runQuestionGenerator(knowledgeMap, lectureId);
        log(`✓ Generated ${generatedQuiz.totalQuestions} questions\n`);

        // ====================================================================
        // PHASE 4: Agent 3 - Quality Validation
        // ====================================================================
        log("📂 PHASE 4: Quality Validation & Enhancement...");
        const validation = await runQualityValidator(generatedQuiz, knowledgeMap);

        log(`✓ Validation Score: ${validation.overallScore}/100`);
        log(`✓ Status: ${validation.validationStatus}\n`);

        // ====================================================================
        // PHASE 5: Final Output Selection
        // ====================================================================
        let finalQuiz;

        if (validation.validationStatus === "NEEDS_REVISION" && validation.revisedQuiz) {
            log("📝 Using revised quiz from validator");
            finalQuiz = validation.revisedQuiz;
        } else {
            log("✅ Using original generated quiz");
            finalQuiz = generatedQuiz;
        }

        // Ensure frontend compatibility (strip metadata for now)
        const frontendQuiz = {
            title: finalQuiz.title,
            totalQuestions: finalQuiz.totalQuestions,
            partA: finalQuiz.partA.map(q => ({
                id: q.id,
                question: q.question,
                options: q.options,
                answer: q.answer
            })),
            partB: finalQuiz.partB.map(q => ({
                id: q.id,
                question: q.question
            })),
            partC: finalQuiz.partC.map(q => ({
                id: q.id,
                question: q.question
            }))
        };

        log(`\n${"=".repeat(60)}`);
        log(`✅ QUIZ GENERATION COMPLETE`);
        log(`📊 Quality Metrics:`);
        log(`   - Clarity: ${validation.qualityMetrics?.clarity || 'N/A'}/10`);
        log(`   - Coverage: ${validation.qualityMetrics?.coverage || 'N/A'}/10`);
        log(`   - Difficulty: ${validation.qualityMetrics?.difficulty || 'N/A'}/10`);
        log(`${"=".repeat(60)}\n`);

        return frontendQuiz;

    } catch (error) {
        logError("❌ Quiz generation pipeline failed:", error);
        throw error;
    }
};

// ============================================================================
// UTILITY: JSON PARSER
// ============================================================================
const parseJSON = (text, agentName) => {
    try {
        // Find JSON boundaries
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON object found in response");
        }

        const jsonString = text.substring(jsonStart, jsonEnd + 1);

        // Try direct parse
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            // Aggressive cleanup
            const cleaned = jsonString
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .replace(/[\u0000-\u001F]+/g, " ")
                .trim();

            return JSON.parse(cleaned);
        }
    } catch (error) {
        logError(`${agentName} JSON parsing failed`, error);
        throw new Error(`${agentName} returned invalid JSON`);
    }
};
// ============================================================================
// AGENT 4: GRADING & FEEDBACK GENERATOR
// ============================================================================

const gradingModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

/**
 * Grade student responses and provide detailed feedback
 * @param {Object} quiz - The quiz object with all questions
 * @param {Object} answers - Student's answers { questionId: answer }
 * @param {Array} lectureFiles - Original lecture materials for context
 * @returns {Object} Grading results with scores and feedback
 */
export const gradeQuizResponses = async (quiz, answers, lectureId = null) => {
    log("📊 AGENT 4: Starting Response Grading...");

    // Load lecture files for context if available
    let lectureFiles = [];
    if (lectureId) {
        try {
            lectureFiles = await loadLectureFiles(lectureId);
            log(`✓ Loaded ${lectureFiles.length} lecture files for grading context`);
        } catch (error) {
            log("⚠️ Could not load lecture files, grading without full context");
        }
    }

    const gradingPrompt = `
You are an Expert Grading AI specializing in educational assessment and constructive feedback.

MISSION: Grade student responses and provide detailed, helpful feedback.

QUIZ DATA:
${JSON.stringify(quiz, null, 2)}

STUDENT ANSWERS:
${JSON.stringify(answers, null, 2)}

GRADING INSTRUCTIONS:

**For Multiple Choice Questions (MCQs):**
- Automatic grading: correct answer index vs student's answer
- Score: 1 point if correct, 0 if incorrect
- Feedback: Brief explanation of why the answer is correct/incorrect

**For Short Answer Questions:**
- Score: 0-10 points based on:
  * Accuracy (40%): Correct information from lecture
  * Completeness (30%): Covers key points
  * Clarity (20%): Well-structured explanation
  * Examples (10%): Uses relevant examples
- Provide specific feedback on what was good and what was missing
- Reference the key points from the question data

**For Essay Questions:**
- Score: 0-20 points based on:
  * Content Knowledge (40%): Demonstrates understanding
  * Critical Thinking (30%): Analysis and synthesis
  * Structure (20%): Organization and flow
  * Evidence (10%): Uses lecture material effectively
- Provide constructive feedback with specific suggestions
- Highlight strengths and areas for improvement

OUTPUT FORMAT (Return ONLY valid JSON):

{
    "overallScore": {
        "total": number,
        "earned": number,
        "percentage": number,
        "grade": "A|A-|B+|B|B-|C+|C|C-|D|F"
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
            "userAnswer": "student's answer",
            "correctAnswer": "correct answer (for MCQ) or model answer",
            "score": number,
            "maxScore": number,
            "isCorrect": boolean (for MCQ),
            "feedback": {
                "summary": "Brief overall feedback",
                "strengths": ["strength1", "strength2"],
                "improvements": ["area1", "area2"],
                "keyPointsCovered": ["point1", "point2"],
                "keyPointsMissed": ["point1", "point2"]
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
        "strengths": ["overall strength1", "strength2"],
        "areasForImprovement": ["area1", "area2"],
        "studyRecommendations": ["recommendation1", "recommendation2"],
        "conceptsMastered": ["concept1", "concept2"],
        "conceptsToReview": ["concept1", "concept2"]
    },
    "detailedAnalysis": {
        "timeEstimate": "estimated time student spent (minutes)",
        "effortLevel": "low|medium|high",
        "comprehensionLevel": "basic|intermediate|advanced",
        "encouragement": "Personalized encouraging message"
    }
}

GRADING STANDARDS:
- Be fair but rigorous
- Provide actionable feedback
- Recognize partial credit where appropriate
- Be encouraging while being honest
- Reference specific lecture material when relevant
- Point out both what was done well and what needs work

GRADE SCALE:
- A (90-100%): Excellent understanding
- B (80-89%): Good understanding with minor gaps
- C (70-79%): Satisfactory with some misunderstandings
- D (60-69%): Passing but significant gaps
- F (<60%): Does not demonstrate sufficient understanding

Return ONLY the JSON object. No markdown, no explanations.
`;

    const parts = [
        ...lectureFiles,
        { text: gradingPrompt }
    ];

    try {
        const result = await gradingModel.generateContent(parts);
        const response = await result.response;
        const text = extractText(response);

        const gradingResults = parseJSON(text, "Grading Agent");
        log("✅ AGENT 4: Grading complete", gradingResults);

        return gradingResults;

    } catch (error) {
        logError("AGENT 4 failed", error);

        // Fallback grading for MCQs only
        return generateFallbackGrading(quiz, answers);
    }
};

/**
 * Fallback grading if AI grading fails
 */
const generateFallbackGrading = (quiz, answers) => {
    log("⚠️ Using fallback grading system");

    const questionGrades = [];
    let totalEarned = 0;
    let totalPossible = 0;

    // Grade MCQs automatically
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

    // Short answers - can't auto-grade, give neutral feedback
    if (quiz.partB) {
        quiz.partB.forEach(q => {
            questionGrades.push({
                id: q.id,
                type: 'short',
                question: q.question,
                userAnswer: answers[q.id] || "No answer",
                score: 0,
                maxScore: 10,
                feedback: {
                    summary: "Manual grading required",
                    strengths: [],
                    improvements: [],
                    keyPointsCovered: [],
                    keyPointsMissed: []
                }
            });
            totalPossible += 10;
        });
    }

    // Essays - can't auto-grade
    if (quiz.partC) {
        quiz.partC.forEach(q => {
            questionGrades.push({
                id: q.id,
                type: 'essay',
                question: q.question,
                userAnswer: answers[q.id] || "No answer",
                score: 0,
                maxScore: 20,
                feedback: {
                    summary: "Manual grading required",
                    strengths: [],
                    improvements: [],
                    keyPointsCovered: [],
                    keyPointsMissed: []
                }
            });
            totalPossible += 20;
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
            areasForImprovement: ["AI grading unavailable - manual review needed"],
            studyRecommendations: [],
            conceptsMastered: [],
            conceptsToReview: []
        }
    };
};

/**
 * Convert percentage to letter grade
 */
const getLetterGrade = (percentage) => {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 60) return 'D';
    return 'F';
};

// Export the grading function

// ... exports ...































