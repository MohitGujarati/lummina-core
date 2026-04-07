/**
 * AI Model Configuration
 *
 * Centralized config for all Gemini model identifiers used across the app.
 * Change values here to update models globally — no need to touch individual agents.
 */

export const AI_MODELS = {
    /** Content analysis: lecture files → structured knowledge map */
    ANALYZER: 'gemini-3-flash-preview',

    /** Quiz generation and grading */
    QUIZ: 'gemini-3-flash-preview',

    /** Student Q&A chat against lecture context */
    CHAT: 'gemini-3-flash-preview',

    /** Cheat sheet / study guide generation */
    STUDY_GUIDE: 'gemini-3-flash-preview',

    /** Viva oral exam sessions */
    VIVA: 'gemini-3-flash-preview',

    /** Startup health-check ping */
    HEALTH_CHECK: 'gemini-3-flash-preview',
};
