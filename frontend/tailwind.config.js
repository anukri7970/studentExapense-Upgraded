/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0E14',
          raised: '#12161F',
          panel: '#161B26',
          border: '#1F2530',
        },
        parchment: {
          DEFAULT: '#EDEEF0',
          dim: '#C7CBD3',
        },
        slate: {
          muted: '#8B93A3',
          faint: '#5C6475',
        },
        signal: {
          gold: '#D4A24C',
          goldDim: '#9C7A3D',
        },
        mint: {
          DEFAULT: '#3FB78A',
          dim: '#2A8E68',
        },
        coral: {
          DEFAULT: '#E2685B',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(212,162,76,0.35), 0 0 24px -4px rgba(212,162,76,0.25)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
