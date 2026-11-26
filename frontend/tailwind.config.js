/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F2E9',
        card: '#FFFCF7',
        'border-neo': '#D6CDBB',
        'text-neo': '#171717',
        'text-secondary': '#737373',
        forest: {
          DEFAULT: '#14532D',
          light: '#1e7842',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          700: '#15803d',
          800: '#166534',
          900: '#14532D',
          950: '#052e16',
        },
        pastel: {
          green: '#E2F1E7',
          yellow: '#FFF1CC',
          border: '#D6CDBB',
        },
        emerald: {
          DEFAULT: '#10B981',
          500: '#10B981',
          600: '#059669',
        },
        background: '#F5F2E9',
        surface: '#FFFCF7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px rgba(23, 23, 23, 0.04)',
        neo: '2px 2px 0px #D6CDBB',
        'neo-md': '3px 3px 0px #D6CDBB',
        'neo-lg': '4px 4px 0px #D6CDBB',
        'neo-dark': '2px 2px 0px #30363D',
        'neo-green': '2px 2px 0px #14532D',
        'neo-green-md': '3px 3px 0px #14532D',
      },
      keyframes: {
        waveBar: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.04)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'wave-bar-1': 'waveBar 0.9s ease-in-out infinite',
        'wave-bar-2': 'waveBar 0.9s ease-in-out infinite 0.15s',
        'wave-bar-3': 'waveBar 0.9s ease-in-out infinite 0.3s',
        'wave-bar-4': 'waveBar 0.9s ease-in-out infinite 0.45s',
        'wave-bar-5': 'waveBar 0.9s ease-in-out infinite 0.6s',
        'pulse-slow': 'pulseSlow 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
      }
    },
  },
  plugins: [],
}
