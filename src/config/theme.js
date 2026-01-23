/**
 * Design System & Theme Tokens - Production Version
 * 
 * Defines the core visual language of the application.
 * Focused on a "Premium Enterprise" aesthetic.
 */

export const THEME = {
    COLORS: {
        // Primary Brand - Deep Professional Blue/Gray
        PRIMARY: '#1e293b',      // Slate 800
        PRIMARY_LIGHT: '#334155', // Slate 700
        PRIMARY_Hover: '#0f172a', // Slate 900

        // Accents - Subtle, not shouting
        ACCENT: '#2563eb',       // Blue 600
        ACCENT_SUBTLE: '#eff6ff', // Blue 50

        // Backgrounds
        BG_APP: '#f8fafc',       // Slate 50 (Very light gray)
        BG_SURFACE: '#ffffff',   // White
        BG_SIDEBAR: '#ffffff',   // White

        // Text
        TEXT_PRIMARY: '#0f172a', // Slate 900
        TEXT_SECONDARY: '#64748b', // Slate 500
        TEXT_TERTIARY: '#94a3b8', // Slate 400
        TEXT_INVERSE: '#ffffff',

        // Borders
        BORDER: '#e2e8f0',       // Slate 200
        BORDER_HOVER: '#cbd5e1', // Slate 300

        // State
        SUCCESS: '#10b981',      // Emerald 500
        ERROR: '#ef4444',        // Red 500
    },

    FONTS: {
        SANS: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },

    SHADOWS: {
        SM: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        FLOAT: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    }
};
