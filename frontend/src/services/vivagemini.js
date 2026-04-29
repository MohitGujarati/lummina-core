/* ============================================================================
   VIVA GEMINI SERVICE — Frontend proxy layer
   All viva session calls are forwarded to the Express server (backend/).
   ============================================================================ */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

/**
 * Start a new viva session.
 * @param {string} lectureId
 * @returns {{ sessionId: string, message: string }}
 */
export const startVivaSession = async (lectureId) => {
    console.log('🎤 [VIVA] Starting session for:', lectureId);
    return post('/api/viva/start', { lectureId });
};

/**
 * Process one turn in the viva exam.
 * @param {string} sessionId
 * @param {string} userAudioText
 * @param {number} currentRound
 * @param {number} totalRounds
 * @returns {{ message: string }}
 */
export const processVivaTurn = async (sessionId, userAudioText, currentRound, totalRounds) => {
    console.log(`🎤 [VIVA] Processing turn — Round ${currentRound}/${totalRounds}`);
    return post('/api/viva/turn', { sessionId, userText: userAudioText, currentRound, totalRounds });
};

/**
 * End a viva session and return the transcript summary.
 * @param {string} sessionId
 */
export const endVivaSession = async (sessionId) => {
    console.log('🏁 [VIVA] Ending session:', sessionId);
    const res = await fetch(`${API_BASE}/api/viva/end`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return null;
    return res.json();
};

console.log('✅ Viva service initialized (proxy mode)');
