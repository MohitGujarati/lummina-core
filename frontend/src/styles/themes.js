import { palette as p } from './tokens';

// ─── LIGHT THEME ─────────────────────────────────────────────────────────────
export const lightTheme = {
  // ── Backgrounds ─────────────────────────────────────────────────────────────
  bg: {
    app:      p.warm[100],          // page background
    surface:  p.warm[50],           // cards, panels, chat area
    sidebar:  p.warm[100],          // sidebar
    elevated: p.white,              // modals, dropdowns, inputs
    overlay:  'rgba(0,0,0,0.4)',
  },

  // ── Text ────────────────────────────────────────────────────────────────────
  text: {
    primary:   p.warm[950],         // headings, body
    secondary: p.warm[700],         // labels, captions
    tertiary:  p.warm[600],         // placeholders, hints
    muted:     p.warm[500],         // disabled, very secondary
    inverse:   p.white,             // text on dark bg
  },

  // ── Brand ───────────────────────────────────────────────────────────────────
  brand: {
    primary:     p.navy[600],
    hover:       p.navy[700],
    light:       p.navy[500],
    subtle:      'rgba(36,56,108,0.08)',
    subtleHover: 'rgba(36,56,108,0.14)',
    text:        p.navy[600],
  },

  // ── Borders ─────────────────────────────────────────────────────────────────
  border: {
    default: p.warm[300],
    strong:  p.warm[400],
    subtle:  p.warm[200],
    focus:   p.blue,
  },

  // ── Interactive ─────────────────────────────────────────────────────────────
  interactive: {
    hover:      p.warm[200],
    active:     p.warm[300],
    activeText: p.warm[950],
  },

  // ── Chat Bubbles ────────────────────────────────────────────────────────────
  chat: {
    userBg:    p.navy[600],
    userText:  p.warm[50],
    botBg:     p.warm[50],
    botText:   p.warm[950],
    botBorder: p.warm[300],
  },

  // ── Status ──────────────────────────────────────────────────────────────────
  status: {
    success:     p.green,
    error:       p.red,
    warning:     p.yellow,
    info:        p.blue,
    errorBg:     p.redLight,
    errorBorder: p.redBorder,
    errorText:   p.redText,
  },

  // ── Code ────────────────────────────────────────────────────────────────────
  code: {
    bg:       p.codeBg,
    text:     p.codeText,
    inlineBg: 'rgba(0,0,0,0.06)',
  },

  // ── Misc ────────────────────────────────────────────────────────────────────
  accent: p.orange,
  shadow: 'rgba(0,0,0,0.06)',
};

// ─── DARK THEME ──────────────────────────────────────────────────────────────
export const darkTheme = {
  ...lightTheme,

  bg: {
    app:      p.zinc[950],          // #09090b
    surface:  p.zinc[900],          // #18181b
    sidebar:  '#121215',
    elevated: p.zinc[800],          // #27272a
    overlay:  'rgba(0,0,0,0.6)',
  },

  text: {
    primary:   p.zinc[50],          // #fafafa
    secondary: p.zinc[400],         // #a1a1aa
    tertiary:  p.zinc[600],         // #52525b
    muted:     p.zinc[700],         // #3f3f46
    inverse:   p.zinc[950],
  },

  brand: {
    primary:     p.navy[500],
    hover:       p.navy[400],
    light:       '#4a6fa5',
    subtle:      'rgba(90,120,191,0.15)',
    subtleHover: 'rgba(90,120,191,0.22)',
    text:        '#7aa3d4',
  },

  border: {
    default: 'rgba(255,255,255,0.08)',
    strong:  'rgba(255,255,255,0.14)',
    subtle:  'rgba(255,255,255,0.04)',
    focus:   p.blue,
  },

  interactive: {
    hover:      'rgba(255,255,255,0.06)',
    active:     'rgba(255,255,255,0.1)',
    activeText: p.zinc[50],
  },

  chat: {
    userBg:    p.navy[500],
    userText:  p.zinc[50],
    botBg:     p.zinc[800],
    botText:   p.zinc[50],
    botBorder: 'rgba(255,255,255,0.08)',
  },

  code: {
    ...lightTheme.code,
    inlineBg: 'rgba(255,255,255,0.08)',
  },

  shadow: 'rgba(0,0,0,0.3)',
};
