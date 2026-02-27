/**
 * GeneMapr Design System v2.0
 * Premium scientific instrument aesthetic
 */

export const colors = {
  // Backgrounds
  background: {
    primary: '#0a0e1a',      // Deep space navy
    secondary: '#0f1628',    // Panel background
    tertiary: '#141b2d',     // Card background
    elevated: '#1a2332',     // Elevated surfaces
  },

  // DNA-themed accents
  accent: {
    cyan: '#00d4ff',         // Primary interactive
    magenta: '#ff3366',      // Alerts/Pathogenic
    green: '#00ff88',        // Benign/Success
    amber: '#ffaa00',        // VUS/Warning
  },

  // Text
  text: {
    primary: '#e2e8f0',      // Main text
    secondary: '#94a3b8',    // Secondary text
    tertiary: '#64748b',     // Muted text
    inverse: '#0a0e1a',      // Text on light backgrounds
  },

  // Semantic colors
  semantic: {
    pathogenic: '#ff3366',
    likelyPathogenic: '#ff6b35',
    vus: '#ffaa00',
    likelyBenign: '#00b4d8',
    benign: '#00ff88',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },

  // Glow effects
  glow: {
    cyan: 'rgba(0, 212, 255, 0.1)',
    cyanMedium: 'rgba(0, 212, 255, 0.2)',
    cyanStrong: 'rgba(0, 212, 255, 0.4)',
    magenta: 'rgba(255, 51, 102, 0.1)',
    magentaMedium: 'rgba(255, 51, 102, 0.2)',
    magentaStrong: 'rgba(255, 51, 102, 0.4)',
    green: 'rgba(0, 255, 136, 0.1)',
    greenMedium: 'rgba(0, 255, 136, 0.2)',
    greenStrong: 'rgba(0, 255, 136, 0.4)',
  },
}

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
}

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
}

export const shadows = {
  // Colored glows
  glowCyan: {
    sm: '0 2px 10px rgba(0, 212, 255, 0.1)',
    md: '0 4px 20px rgba(0, 212, 255, 0.15)',
    lg: '0 8px 30px rgba(0, 212, 255, 0.2)',
    xl: '0 12px 40px rgba(0, 212, 255, 0.25)',
  },
  glowMagenta: {
    sm: '0 2px 10px rgba(255, 51, 102, 0.1)',
    md: '0 4px 20px rgba(255, 51, 102, 0.15)',
    lg: '0 8px 30px rgba(255, 51, 102, 0.2)',
    xl: '0 12px 40px rgba(255, 51, 102, 0.25)',
  },
  glowGreen: {
    sm: '0 2px 10px rgba(0, 255, 136, 0.1)',
    md: '0 4px 20px rgba(0, 255, 136, 0.15)',
    lg: '0 8px 30px rgba(0, 255, 136, 0.2)',
    xl: '0 12px 40px rgba(0, 255, 136, 0.25)',
  },
  // Neutral shadows
  neutral: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
}

export const animations = {
  timing: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    linear: 'linear',
  },
}

export const glassEffect = {
  // Base glass effect
  base: {
    background: 'rgba(20, 27, 45, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 212, 255, 0.1)',
  },
  // Elevated glass
  elevated: {
    background: 'rgba(26, 35, 50, 0.8)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0, 212, 255, 0.15)',
  },
  // Interactive glass (hover state)
  interactive: {
    background: 'rgba(20, 27, 45, 0.85)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0, 212, 255, 0.25)',
  },
}

export const gradients = {
  // Primary gradients
  cyanBlue: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
  magentaRed: 'linear-gradient(135deg, #ff3366 0%, #ff0000 100%)',
  greenCyan: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',

  // DNA double helix gradient
  dnaHelix: 'linear-gradient(90deg, #00d4ff 0%, #ff3366 100%)',

  // Mesh backgrounds
  meshDark: 'radial-gradient(at 0% 0%, rgba(0, 212, 255, 0.1) 0%, transparent 50%), radial-gradient(at 100% 100%, rgba(255, 51, 102, 0.1) 0%, transparent 50%)',

  // Button gradients
  primaryButton: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
  dangerButton: 'linear-gradient(135deg, #ff3366 0%, #cc0000 100%)',
  successButton: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
}

export const typography = {
  fontFamily: {
    headline: "'Outfit', sans-serif",
    body: "'Plus Jakarta Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
}

export const zIndex = {
  background: -1,
  base: 0,
  content: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  popover: 50,
  toast: 60,
}
