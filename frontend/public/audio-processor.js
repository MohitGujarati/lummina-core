/**
 * audio-processor.js — AudioWorklet processor for 16kHz PCM mic capture
 *
 * This file MUST be served as a static asset (not bundled by Vite).
 * Vite serves everything in /public at the root URL, so it will be available at:
 *   /audio-processor.js
 *
 * Usage in the app:
 *   await audioContext.audioWorklet.addModule('/audio-processor.js');
 *
 * Input:  Float32 samples at whatever sampleRate the AudioContext was created with
 * Output: Int16 PCM chunks posted back to the main thread via this.port.postMessage
 *
 * Chunk size: 3200 Int16 samples = 0.1 seconds at 16kHz = 6400 bytes per chunk
 * This matches the BobVoice reference implementation (Android AudioRecord read loop).
 */

class PcmCaptureProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        // Target sample rate for Gemini Live API input (always 16000 Hz)
        this._targetSampleRate = 16000;

        // Actual context sample rate — passed in via processorOptions if resampling needed
        this._actualSampleRate = (options?.processorOptions?.actualSampleRate) || sampleRate;

        // Chunk size in TARGET samples (0.1s × 16000 = 1600 samples)
        this._chunkSamples = 1600;

        // Accumulation buffer (Float32 values before conversion)
        this._buffer = [];

        // Resampling state: fractional position in input stream
        this._resamplePos = 0;

        // Ratio: how many input samples per 1 output sample
        this._ratio = this._actualSampleRate / this._targetSampleRate;
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0] || input[0].length === 0) return true;

        const inputSamples = input[0]; // Float32Array, mono

        if (Math.abs(this._ratio - 1.0) < 0.01) {
            // No resampling needed — context is already at 16kHz
            for (let i = 0; i < inputSamples.length; i++) {
                this._buffer.push(inputSamples[i]);
            }
        } else {
            // Linear interpolation downsampling to 16kHz
            while (this._resamplePos < inputSamples.length) {
                const idx = Math.floor(this._resamplePos);
                const frac = this._resamplePos - idx;
                const s0 = inputSamples[idx] ?? 0;
                const s1 = inputSamples[idx + 1] ?? s0;
                this._buffer.push(s0 + frac * (s1 - s0));
                this._resamplePos += this._ratio;
            }
            this._resamplePos -= inputSamples.length;
        }

        // Emit a chunk whenever the buffer has enough samples
        while (this._buffer.length >= this._chunkSamples) {
            const floatChunk = this._buffer.splice(0, this._chunkSamples);

            // Convert Float32 → Int16 PCM
            const int16 = new Int16Array(floatChunk.length);
            for (let i = 0; i < floatChunk.length; i++) {
                const clamped = Math.max(-1, Math.min(1, floatChunk[i]));
                int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
            }

            // Transfer the ArrayBuffer (zero-copy) to the main thread
            this.port.postMessage({ pcm: int16.buffer }, [int16.buffer]);
        }

        return true; // keep processor alive
    }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
