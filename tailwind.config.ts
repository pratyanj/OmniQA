/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Background layers
        bg: {
          base:   'var(--bg-base)',
          card:   'var(--bg-card)',
          raised: 'var(--bg-raised)',
          hover:  'var(--bg-hover)',
          border: 'var(--bg-border)',
          muted:  'var(--bg-muted)',
        },
        // Brand
        brand: {
          DEFAULT: 'var(--brand)',
          dark:    'var(--brand-dark)',
          light:   'var(--brand-light)',
          glow:    'var(--brand-glow)',
        },
        // Severity
        critical: { DEFAULT: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)' }, // Rose for Critical
        high:     { DEFAULT: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)' }, // Orange for High
        medium:   { DEFAULT: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)' }, // Amber for Medium
        low:      { DEFAULT: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)' }, // Sky for Low
        cosmetic: { DEFAULT: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' }, // Violet for Cosmetic
        // Status
        verified: { DEFAULT: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)' }, // Emerald for Verified
        // Text
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          disabled:  'var(--text-disabled)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 60%)',
      },
      boxShadow: {
        'glow-brand':    '0 0 20px rgba(37,99,235,0.15)',
        'glow-critical': '0 0 20px rgba(244,63,94,0.15)',
        'glow-verified': '0 0 20px rgba(16,185,129,0.15)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
