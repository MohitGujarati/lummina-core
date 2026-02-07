/* ============================================================================
   VIVA EXAM ENGINE (Gemini 2.0 Flash)
   ============================================================================ */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// CONFIGURATION
// ============================================================================


const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "demo_fake_key_12345";
const MODEL_NAME = 'gemini-3-flash-preview';

let genAI = null;
if (API_KEY && API_KEY !== "demo_fake_key_12345") {
    genAI = new GoogleGenerativeAI(API_KEY);
    console.log("✅ [VIVA] Gemini initialized with API key");
} else {
    console.warn("⚠️ [VIVA] No API key - demo mode");
}

// In-Memory Session Store
const sessions = new Map();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const extractText = (response) => {
    try {
        if (response?.text) return response.text();
        if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.candidates[0].content.parts[0].text;
        }
        return "I couldn't process that response.";
    } catch (e) {
        console.error("Text extraction error:", e);
        return "Error processing response.";
    }
};

const getLectureContext = async (lectureId) => {
    const topic = lectureId.replace(/_/g, ' ').replace(/leacture/i, 'Lecture');
    return `TOPIC: ${topic}`;
};

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export const startVivaSession = async (lectureId) => {
    console.log("🎤 [VIVA] Starting session for:", lectureId);

    if (!genAI) {
        console.warn("⚠️ No valid API Key. Running in demo mode.");
        const demoSessionId = "demo_session";
        sessions.set(demoSessionId, {
            lectureId,
            lectureTitle: lectureId.replace(/_/g, ' '),
            history: [],
            questionCount: 1
        });
        return {
            sessionId: demoSessionId,
            message: "Welcome to the demo exam. What do you understand about this topic?"
        };
    }

    const sessionId = `viva_${Date.now()}`;
    const lectureTitle = lectureId.replace(/_/g, ' ').replace(/leacture/i, 'Lecture');

    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 712,
            }
        });

        const firstQuestionPrompt = `You are an oral examiner. Ask ONE clear Question then Ask new Question , concise question to test the student's understanding of: ${lectureTitle}. Keep it under 2 sentences. No formatting or markdown.`;

        console.log("❓ Generating first question...");
        const result = await model.generateContent(firstQuestionPrompt);
        const firstQuestion = extractText(result.response)
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();

        console.log("✅ First question:", firstQuestion);

        // Store session with history starting with user kickstart (required by Gemini chat)
        sessions.set(sessionId, {
            lectureId,
            lectureTitle,
            history: [
                { role: 'user', parts: [{ text: 'I am ready for my oral exam.' }] },
                { role: 'model', parts: [{ text: firstQuestion }] }
            ],
            questionCount: 1
        });

        return {
            sessionId,
            message: firstQuestion
        };

    } catch (error) {
        console.error("❌ Session Start Failed!");
        console.error("❌ Error:", error.message);
        console.error("❌ Full error:", error);

        // Fallback to demo mode on error
        const demoSessionId = "demo_session";
        sessions.set(demoSessionId, {
            lectureId,
            lectureTitle: lectureId.replace(/_/g, ' '),
            history: [],
            questionCount: 1
        });
        return {
            sessionId: demoSessionId,
            message: "I'm having trouble connecting, but let's begin. What is the core concept of this topic?"
        };
    }
};

export const processVivaTurn = async (sessionId, userAudioText, currentRound, totalRounds) => {
    console.log(`🎤 [VIVA] Processing turn - Round ${currentRound}/${totalRounds}`);
    console.log(`📝 User said: "${userAudioText}"`);

    const session = sessions.get(sessionId);

    if (!session) {
        throw new Error("Session expired or not found. Please restart.");
    }

    // Demo mode handling
    if (sessionId === "demo_session" || !genAI) {
        const demoResponses = [
            "Interesting perspective. Can you elaborate on that?",
            "That's a good start. What evidence supports your answer?",
            "I see. How does this concept relate to practical applications?",
            "Good point. Can you explain the underlying mechanism?",
            "Thank you. What are the potential challenges with this approach?"
        ];
        const response = demoResponses[Math.min(currentRound - 1, demoResponses.length - 1)];
        return { message: response };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512,
            }
        });

        // Add user response to history
        session.history.push({
            role: 'user',
            parts: [{ text: userAudioText }]
        });

        // Build conversation context
        const conversationContext = session.history.map(h =>
            `${h.role === 'model' ? 'Examiner' : 'Student'}: ${h.parts[0].text}`
        ).join('\n');

        // Create prompt based on round
        let instructions;
        if (currentRound >= totalRounds) {
            instructions = `FINAL ROUND: Give a brief assessment of their answer, then provide a 2-sentence summary of their overall performance. End with "The exam is now concluded."`;
        } else {
            instructions = `REQUIRED FORMAT:
1. First sentence: Evaluate their answer (correct/partially correct/incorrect) with a brief explanation.
2. Second sentence: Ask ONE new question about ${session.lectureTitle}.

CRITICAL: You MUST end your response with a question mark (?). Never end without asking a question.`;
        }

        const prompt = `You are a formal academic examiner conducting a Viva Voce exam on: ${session.lectureTitle}

Conversation:
${conversationContext}

${instructions}

Rules:
- Plain text only, no markdown or formatting
- Be direct and professional
- Maximum 3 sentences
- ALWAYS end with a question (unless final round)`;

        const result = await model.generateContent(prompt);
        const responseText = extractText(result.response)
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();

        console.log("✅ AI Response:", responseText);

        // Add AI response to history
        session.history.push({
            role: 'model',
            parts: [{ text: responseText }]
        });

        session.questionCount++;

        return { message: responseText };

    } catch (error) {
        console.error("❌ Turn Processing Failed:", error);
        return { message: "I didn't catch that clearly. Could you please repeat your answer?" };
    }
};

export const endVivaSession = async (sessionId) => {
    console.log("🏁 [VIVA] Ending session:", sessionId);
    const session = sessions.get(sessionId);
    sessions.delete(sessionId);

    if (session) {
        return {
            lectureId: session.lectureId,
            questionsAsked: session.questionCount,
            transcript: session.history
        };
    }
    return null;
};

console.log("✅ Viva Gemini Service Initialized");
console.log(`📊 API Key: ${API_KEY ? 'Configured' : 'Missing (demo mode)'}`);