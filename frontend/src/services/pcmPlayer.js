/**
 * src/services/pcmPlayer.js
 *
 * Decodes base64-encoded 24kHz 16-bit mono PCM from Gemini Live and
 * plays it through the browser's speakers via Web Audio API.
 *
 * Key design notes (from BobVoice.md):
 * - Gemini outputs 24kHz — AudioContext must be created at 24000 Hz
 * - Chunks arrive sequentially; we schedule them back-to-back using _nextPlayTime
 *   so there are no gaps or overlaps between consecutive chunks
 * - flush() is used for barge-in: immediately stops buffered audio
 *
 * Usage:
 *   const player = createPcmPlayer();
 *   player.play(base64PcmChunk);  // called for each incoming audio chunk
 *   player.flush();               // barge-in: cut off AI mid-sentence
 *   player.close();               // cleanup on session end / unmount
 */

export function createPcmPlayer() {
    // Gemini Live output is always 24kHz
    let ctx;
    try {
        ctx = new AudioContext({ sampleRate: 24000 });
    } catch {
        // Fallback if sampleRate constraint not supported (rare)
        ctx = new AudioContext();
    }

    // Track when the last scheduled chunk ends so we can queue the next one seamlessly
    let _nextPlayTime = 0;

    // Track active source nodes so we can stop them on flush
    const _activeSources = new Set();

    return {
        /**
         * Schedule a base64-encoded 24kHz PCM chunk for playback.
         * Chunks are queued back-to-back with no gap.
         *
         * @param {string} base64Pcm - base64-encoded Int16 PCM data
         */
        play(base64Pcm) {
            if (ctx.state === 'closed') return;

            // Resume context if suspended (browser autoplay policy)
            if (ctx.state === 'suspended') ctx.resume();

            // Decode base64 → raw bytes
            let binary;
            try {
                binary = atob(base64Pcm);
            } catch {
                console.warn('[PcmPlayer] Failed to decode base64 chunk');
                return;
            }

            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // Int16 → Float32 (Web Audio API works with Float32)
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }

            if (float32.length === 0) return;

            // Create AudioBuffer and schedule it
            const buffer = ctx.createBuffer(1, float32.length, ctx.sampleRate);
            buffer.copyToChannel(float32, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            const now = ctx.currentTime;
            const startAt = Math.max(now, _nextPlayTime);
            source.start(startAt);
            _nextPlayTime = startAt + buffer.duration;

            _activeSources.add(source);
            source.onended = () => _activeSources.delete(source);
        },

        /**
         * Immediately stop all currently playing/buffered audio.
         * Used for barge-in: user interrupts while AI is speaking.
         */
        flush() {
            _activeSources.forEach(src => {
                try { src.stop(); } catch { /* already ended */ }
            });
            _activeSources.clear();
            _nextPlayTime = 0;
        },

        /**
         * Release all audio resources. Call on session end or component unmount.
         */
        close() {
            this.flush();
            if (ctx.state !== 'closed') {
                ctx.close().catch(() => { });
            }
        }
    };
}
