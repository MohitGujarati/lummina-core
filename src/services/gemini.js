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
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_NAME = 'gemini-3-flash-preview';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Initialize
let genAI = null;
let model = null;

try {
    if (!API_KEY) {
        logError("⚠️ VITE_GEMINI_API_KEY is missing from .env file");
    } else {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: MODEL_NAME });
        log("✅ Gemini model initialized");
    }
} catch (error) {
    logError("Failed to initialize:", error.message);
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

// Example usage in React:
// <div dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }} />