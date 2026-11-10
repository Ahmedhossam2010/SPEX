/**
 * Observatory Design System Tokens
 * "Mission control meets deep-space observatory"
 */

export const colors = {
  space: '#02040A',
  panel: '#0C0E14',
  panelElevated: 'rgba(16, 19, 28, 0.85)',
  hairline: 'rgba(255, 255, 255, 0.07)',
  hairlineBright: 'rgba(255, 255, 255, 0.16)',

  // Amber Ramp: Primary action, discoveries, high energy
  amber: {
    primary: '#FFB900',
    secondary: '#FB9600',
    deep: '#EB7F00',
    glow: '0 0 24px rgba(255, 185, 0, 0.28)',
    glowSubtle: '0 0 12px rgba(255, 185, 0, 0.15)',
  },

  // Cyan: Authentic measurements, live data, WCS astrometry
  cyan: {
    primary: '#00D3F3',
    glow: '0 0 24px rgba(0, 211, 243, 0.28)',
    glowSubtle: '0 0 12px rgba(0, 211, 243, 0.15)',
  },

  // Rose: Warnings, doubt mask, instrument artifacts, false alarm
  rose: {
    primary: '#FF637E',
    glow: '0 0 24px rgba(255, 99, 126, 0.28)',
  },

  // Typography
  text: {
    headline: '#F1F5F9',
    body: '#94A3B8',
    muted: '#64748B',
    micro: '#475569',
  },
} as const;

export const fonts = {
  hero: "'Playfair Display', Georgia, serif",
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  arabic: "'Cairo', 'Noto Sans Arabic', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const motion = {
  easing: {
    smooth: [0.16, 1, 0.3, 1] as const,
    spring: { type: 'spring' as const, stiffness: 300, damping: 25 },
    cinematic: [0.25, 0.1, 0.25, 1] as const,
  },
  duration: {
    micro: 0.15,
    quick: 0.25,
    medium: 0.45,
    zoom: 0.9,
  },
} as const;
