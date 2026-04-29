// ─── PRIMITIVE TOKENS ─────────────────────────────────────────────────────────
// Raw named colours. Never import these directly into components.
// Components should use useColors() or var(--color-*) instead.

export const palette = {

  // ── Brand — Navy ────────────────────────────────────────────────────────────
  navy: {
    400: '#5a78bf',
    500: '#3a5298',
    600: '#24386c',   // primary brand colour
    700: '#1a2a50',
    800: '#111a35',
  },

  // ── Warm Neutrals — the app's earthy UI palette ──────────────────────────────
  warm: {
    50:  '#faf9f5',
    100: '#f5f4ed',
    200: '#eeece4',
    300: '#e8e6dc',
    400: '#d1cfc5',
    500: '#b0afa9',
    600: '#87867f',
    700: '#5e5d59',
    800: '#4d4c48',
    900: '#3a3a38',
    950: '#141413',
  },

  // ── Zinc / Cool Neutrals — dark mode surfaces ────────────────────────────────
  zinc: {
    50:  '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    400: '#a1a1aa',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // ── Status ──────────────────────────────────────────────────────────────────
  green:     '#10b981',
  red:       '#ef4444',
  yellow:    '#f59e0b',
  blue:      '#3898ec',
  redLight:  '#fff5f5',
  redBorder: '#fed7d7',
  redText:   '#b53333',

  // ── Accent ──────────────────────────────────────────────────────────────────
  orange: '#c96442',  // blockquote / link accent

  // ── Code Block ──────────────────────────────────────────────────────────────
  codeBg:   '#1e1e2e',
  codeText: '#cdd6f4',

  // ── Base ────────────────────────────────────────────────────────────────────
  white:       '#ffffff',
  transparent: 'transparent',
};
