/**
 * server/routes/vivaLive.js
 *
 * WebSocket proxy: Browser <-> Express <-> Gemini Live API (BidiGenerateContent)
 *
 * Security: The GEMINI_API_KEY never leaves the server — it is injected into the
 * upstream Gemini URL here. The browser only connects to ws://localhost:3001/ws/viva.
 *
 * Protocol (mirrors BobVoice.md exactly):
 *   Browser  → server: { type: 'init', lectureId, lectureTitle }  (first message)
 *   Browser  → server: { realtimeInput: { audio: { mimeType, data } } }  (mic chunks)
 *   Server   → browser: { type: 'ready' }  (setup complete, mic can start)
 *   Server   → browser: Gemini JSON frames (audio replies, turnComplete, errors)
 */

import WebSocket from 'ws';

const GEMINI_LIVE_URL =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const GEMINI_LIVE_MODEL = 'models/gemini-2.0-flash-live-001';

// ---------------------------------------------------------------------------
// Build the examiner system prompt from a lecture title
// ---------------------------------------------------------------------------
function buildExaminerPrompt(lectureTitle) {
    return `You are a formal academic examiner conducting an oral viva examination on the topic: "${lectureTitle}".

Your role:
- Ask ONE clear, focused question at a time
- After each student answer, give very brief feedback (1 sentence max) then ask your next question
- Be professional, encouraging, and educational
- After 10 questions, give a brief 2-sentence summary of the student's performance and say "The examination is now concluded."
- NEVER use markdown, bullet points, asterisks, or any formatting — plain natural speech only
- Keep each response under 3 sentences unless giving the final summary

Start by greeting the student warmly and asking your first question about "${lectureTitle}".`;
}

// ---------------------------------------------------------------------------
// Build the Gemini Live setup frame
// CRITICAL: contextWindowCompression must be a SIBLING of generationConfig,
// NOT nested inside it — wrong placement causes code 1007 silent failure.
// ---------------------------------------------------------------------------
function buildSetupFrame(systemPrompt) {
    return {
        setup: {
            model: GEMINI_LIVE_MODEL,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                    }
                }
            },
            // Sibling of generationConfig — NOT inside it
            contextWindowCompression: {
                triggerTokens: 104857,
                slidingWindow: { targetTokens: 52428 }
            }
        }
    };
}

// ---------------------------------------------------------------------------
// Main handler — called once per browser WebSocket connection
// ---------------------------------------------------------------------------
export function handleVivaLiveWebSocket(browserSocket, _req) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[vivaLive] GEMINI_API_KEY is missing — closing connection');
        browserSocket.close(1011, 'Server configuration error');
        return;
    }

    let geminiSocket = null;
    let sessionReady = false;

    // -----------------------------------------------------------------------
    // Messages from the browser
    // -----------------------------------------------------------------------
    browserSocket.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch {
            console.error('[vivaLive] Received non-JSON message from browser');
            return;
        }

        // First message must be the session init payload
        if (!sessionReady) {
            if (msg.type !== 'init') {
                console.warn('[vivaLive] Expected init message, got:', msg.type);
                return;
            }

            const { lectureTitle = 'the selected topic' } = msg;
            console.log(`[vivaLive] Session init — topic: "${lectureTitle}"`);

            const geminiUrl = `${GEMINI_LIVE_URL}?key=${apiKey}`;
            geminiSocket = new WebSocket(geminiUrl);

            // When upstream WebSocket opens, send the setup frame
            geminiSocket.on('open', () => {
                const setupFrame = buildSetupFrame(buildExaminerPrompt(lectureTitle));
                geminiSocket.send(JSON.stringify(setupFrame));
                console.log('[vivaLive] Setup frame sent to Gemini Live');
            });

            // Messages from Gemini → forward to browser, but intercept setupComplete
            geminiSocket.on('message', (geminiData) => {
                const raw = geminiData.toString();
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                } catch {
                    // Binary or non-JSON frame from Gemini
                    console.warn('[vivaLive] Non-JSON frame from Gemini — forwarding as-is, first 120 chars:', raw.slice(0, 120));
                    if (browserSocket.readyState === WebSocket.OPEN) {
                        browserSocket.send(geminiData);
                    }
                    return;
                }

                const topKeys = Object.keys(parsed);
                console.log('[vivaLive] Gemini frame keys:', topKeys);

                // setupComplete → signal the browser that mic can start
                if (parsed.setupComplete !== undefined) {
                    sessionReady = true;
                    console.log('[vivaLive] Gemini setup complete — signalling browser');
                    if (browserSocket.readyState === WebSocket.OPEN) {
                        browserSocket.send(JSON.stringify({ type: 'ready' }));
                    }
                    return;
                }

                // Log audio chunk summary (avoid printing full base64)
                const parts = parsed?.serverContent?.modelTurn?.parts ?? [];
                if (parts.length > 0) {
                    const summary = parts.map(p => p?.inlineData ? `audio(${p.inlineData.mimeType},${p.inlineData.data?.length}b64)` : p?.text ? `text("${p.text.slice(0,40)}")` : '?');
                    console.log('[vivaLive] Forwarding modelTurn parts:', summary);
                }
                if (parsed?.serverContent?.turnComplete) {
                    console.log('[vivaLive] turnComplete received — forwarding to browser');
                }

                // Forward all other Gemini frames (audio, turnComplete, errors) to browser
                if (browserSocket.readyState === WebSocket.OPEN) {
                    browserSocket.send(geminiData);
                }
            });

            geminiSocket.on('close', (code, reason) => {
                console.log(`[vivaLive] Gemini socket closed: ${code} ${reason}`);
                if (browserSocket.readyState === WebSocket.OPEN) browserSocket.close();
            });

            geminiSocket.on('error', (err) => {
                console.error('[vivaLive] Gemini socket error:', err.message);
                if (browserSocket.readyState === WebSocket.OPEN) {
                    browserSocket.send(JSON.stringify({ type: 'error', message: 'Upstream connection error' }));
                    browserSocket.close();
                }
            });

            return;
        }

        // All subsequent messages from browser → forward to Gemini (audio chunks etc.)
        if (geminiSocket?.readyState === WebSocket.OPEN) {
            geminiSocket.send(data);
        }
    });

    // -----------------------------------------------------------------------
    // Browser disconnects → tear down upstream
    // -----------------------------------------------------------------------
    browserSocket.on('close', (code) => {
        console.log(`[vivaLive] Browser disconnected (${code}) — closing Gemini socket`);
        if (geminiSocket?.readyState === WebSocket.OPEN) geminiSocket.close();
    });

    browserSocket.on('error', (err) => {
        console.error('[vivaLive] Browser socket error:', err.message);
        if (geminiSocket?.readyState === WebSocket.OPEN) geminiSocket.close();
    });
}
