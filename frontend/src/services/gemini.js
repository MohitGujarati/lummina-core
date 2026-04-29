/* ============================================================================
   GEMINI SERVICE — Frontend proxy layer
   All AI calls are forwarded to the Express server (backend/).
   The Gemini API key lives only in backend/.env — never in the browser bundle.
   ============================================================================ */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const DEBUG = true;
const log = (...args) => DEBUG && console.log('🤖 [AGENT]', ...args);
const logError = (...args) => console.error('❌ [AGENT]', ...args);

// ============================================================================
// HELPERS
// ============================================================================

const post = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Server error ${res.status}`);
    }

    return res.json();
};

// ============================================================================
// PUBLIC API — same signatures as before, drop-in replacements
// ============================================================================

/**
 * Send a chat message and receive a streaming response.
 *
 * Phase 2 — SSE streaming:
 *   Pass an `onChunk` callback to receive text as it arrives.
 *   The full accumulated text is returned as the resolved value.
 *
 * @param {string}   prompt
 * @param {string|null} lectureId
 * @param {Function|null} onChunk  — called with (chunkText, accumulatedText) for each chunk
 */
export const sendMessageToGemini = async (prompt, lectureId = null, onChunk = null) => {
    log(`💬 Sending to server: "${prompt.slice(0, 60)}..."`);

    try {
        log(`📡 Fetching ${API_BASE}/api/gemini/chat`);
        const response = await fetch(`${API_BASE}/api/gemini/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, lectureId }),
        });

        log(`📡 Server responded: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            throw new Error(`Server error ${response.status}`);
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let chunkCount = 0;

        log('📖 Reading SSE stream...');

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                log(`📖 Stream reader done (chunks received: ${chunkCount})`);
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const payload = line.slice(6).trim();

                if (payload === '[DONE]') {
                    log(`✅ [DONE] received — total chunks: ${chunkCount}, chars: ${accumulated.length}`);
                    break;
                }

                try {
                    const { text, error } = JSON.parse(payload);
                    if (error) {
                        logError('Server sent error in stream:', error);
                        throw new Error(error);
                    }
                    if (text) {
                        chunkCount++;
                        accumulated += text;
                        if (chunkCount <= 3) log(`📦 chunk #${chunkCount}: "${text.slice(0, 40)}"`);
                        onChunk?.(text, accumulated);
                    }
                } catch (e) {
                    if (e.message.startsWith('Server sent error')) throw e;
                    // skip truly malformed SSE lines
                }
            }
        }

        return accumulated;
    } catch (error) {
        logError('Chat failed:', error.message);
        return `❌ Error: ${error.message}`;
    }
};

/**
 * Generate a quiz for the given lecture/subject.
 * @param {string} lectureId — UUID (Supabase subject) or legacy folder name
 */
export const generateQuiz = async (lectureId) => {
    log(`📝 Generating quiz for: ${lectureId}`);
    try {
        return await post('/api/gemini/quiz', { lectureId });
    } catch (error) {
        logError('Quiz generation failed:', error.message);
        throw error;
    }
};

/**
 * Grade quiz responses.
 * @param {object} quiz
 * @param {object} answers
 * @param {string|null} lectureId
 */
export const gradeQuizResponses = async (quiz, answers, lectureId = null) => {
    log('📊 Grading quiz...');
    try {
        return await post('/api/gemini/grade', { quiz, answers, lectureId });
    } catch (error) {
        logError('Grading failed:', error.message);
        // Minimal client-side fallback (MCQ only) so the UI never hard-crashes
        return generateFallbackGrading(quiz, answers);
    }
};

/**
 * Generate a personalised study guide / cheat sheet.
 * @param {object} quiz
 * @param {object} answers
 * @param {string} lectureId
 */
export const generateStudyGuide = async (quiz, answers, lectureId) => {
    log('📖 Generating study guide...');
    try {
        const { markdown } = await post('/api/gemini/study-guide', { quiz, answers, lectureId });
        return markdown;
    } catch (error) {
        logError('Study guide failed:', error.message);
        throw error;
    }
};

// ============================================================================
// KEPT: Non-AI helpers still needed by the app
// ============================================================================

/**
 * List locally available lecture folders (from Vite glob — legacy lectures only).
 * UUID-based subjects come from Supabase and are listed via SubjectContext.
 */
const allAssetModules = {
    ...import.meta.glob('/src/assets/**/*.pdf', { eager: true, query: '?url', import: 'default' }),
    ...import.meta.glob('/src/assets/**/*.txt', { eager: true, query: '?url', import: 'default' }),
};

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
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    return text;
};

// ============================================================================
// CLIENT-SIDE GRADING FALLBACK (MCQ only — used when server is unreachable)
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

log('✅ Gemini service initialized (proxy mode — server handles API key)');
