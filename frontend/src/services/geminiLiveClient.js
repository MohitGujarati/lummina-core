/**
 * src/services/geminiLiveClient.js
 *
 * Browser-side WebSocket client for the Gemini Live proxy.
 * Connects to ws://localhost:3001/ws/viva (Express proxy, not Gemini directly).
 * The API key never reaches the browser.
 *
 * Usage:
 *   const client = createGeminiLiveClient({ onReady, onAudio, onTurnComplete, onError });
 *   client.init('subject-uuid', 'Introduction to Networks');
 *   client.sendAudio(base64PcmString);
 *   client.close();
 */

const WS_BASE = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws')
    : 'ws://localhost:3001';

const WS_URL = `${WS_BASE}/ws/viva`;

/**
 * @param {object} callbacks
 * @param {() => void}        callbacks.onReady        - Proxy signalled setupComplete; mic can start
 * @param {(b64: string) => void} callbacks.onAudio    - Received a 24kHz PCM audio chunk (base64)
 * @param {() => void}        callbacks.onTurnComplete - AI finished speaking this turn
 * @param {(err: string) => void} callbacks.onError    - Fatal error (proxy or Gemini)
 * @param {() => void}        callbacks.onClose        - WebSocket closed (any reason)
 */
export function createGeminiLiveClient({ onReady, onAudio, onTurnComplete, onError, onClose } = {}) {
    console.log('[GeminiLive] Connecting to proxy at', WS_URL);
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log('[GeminiLive] WebSocket open');
    };

    socket.onmessage = (event) => {
        // Log raw frame type so we can diagnose binary vs text issues
        const frameType = event.data instanceof Blob ? 'Blob' : event.data instanceof ArrayBuffer ? 'ArrayBuffer' : 'string';
        console.debug(`[GeminiLive] Frame received — type=${frameType}, size=${event.data?.length ?? '?'}`);

        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            console.warn('[GeminiLive] Non-JSON frame — raw content:', event.data);
            return;
        }

        console.debug('[GeminiLive] Parsed message keys:', Object.keys(msg));

        // Proxy-level control messages
        if (msg.type === 'ready') {
            console.log('[GeminiLive] Proxy ready — mic can start');
            onReady?.();
            return;
        }

        if (msg.type === 'error') {
            console.error('[GeminiLive] Proxy error:', msg.message);
            onError?.(msg.message || 'Unknown proxy error');
            return;
        }

        // Gemini audio response chunks
        // Format: { serverContent: { modelTurn: { parts: [{ inlineData: { data, mimeType } }] } } }
        const parts = msg?.serverContent?.modelTurn?.parts ?? [];
        if (parts.length > 0) {
            console.debug(`[GeminiLive] modelTurn parts: ${parts.length}, types:`, parts.map(p => p?.inlineData?.mimeType ?? (p?.text ? 'text' : '?')));
        }
        for (const part of parts) {
            if (part?.inlineData?.data) {
                console.debug(`[GeminiLive] Audio chunk — mime=${part.inlineData.mimeType}, b64len=${part.inlineData.data.length}`);
                onAudio?.(part.inlineData.data); // base64-encoded 24kHz PCM
            }
            if (part?.text) {
                console.log('[GeminiLive] Text part (unexpected in audio mode):', part.text);
            }
        }

        // Turn complete — AI finished speaking, mic should re-open
        if (msg?.serverContent?.turnComplete === true) {
            console.log('[GeminiLive] Turn complete — re-opening mic');
            onTurnComplete?.();
        }

        // Log any unhandled top-level keys for diagnosis
        const knownKeys = new Set(['type', 'serverContent']);
        const unknownKeys = Object.keys(msg).filter(k => !knownKeys.has(k));
        if (unknownKeys.length > 0) {
            console.log('[GeminiLive] Unhandled message keys:', unknownKeys, msg);
        }
    };

    socket.onerror = (event) => {
        console.error('[GeminiLive] WebSocket error', event);
        onError?.('WebSocket connection error');
    };

    socket.onclose = (event) => {
        console.log(`[GeminiLive] Closed (${event.code})`);
        onClose?.();
    };

    return {
        /**
         * Send the session init message to the proxy.
         * Must be the first message after the socket opens.
         */
        init(lectureId, lectureTitle) {
            const send = () => {
                socket.send(JSON.stringify({ type: 'init', lectureId, lectureTitle }));
                console.log('[GeminiLive] Sent init for:', lectureTitle);
            };

            if (socket.readyState === WebSocket.OPEN) {
                send();
            } else {
                // Wait for open if called before socket is ready
                socket.addEventListener('open', send, { once: true });
            }
        },

        /**
         * Send a base64-encoded 16kHz PCM audio chunk to Gemini Live.
         * CRITICAL: field must be "audio" not "mediaChunks" (v1alpha vs v1beta).
         */
        sendAudio(base64Pcm) {
            if (socket.readyState !== WebSocket.OPEN) return;
            socket.send(JSON.stringify({
                realtimeInput: {
                    audio: {
                        mimeType: 'audio/pcm',
                        data: base64Pcm
                    }
                }
            }));
        },

        /** Gracefully close the WebSocket. */
        close() {
            // Remove event handlers first so the onerror/onclose callbacks
            // don't fire after an intentional close (e.g. React StrictMode cleanup)
            socket.onerror = null;
            socket.onclose = null;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        }
    };
}
