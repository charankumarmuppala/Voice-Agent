/** @type {import('tailwindcss').Config} */
export default {
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
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px rgba(23, 23, 23, 0.04)',
      },
    },
  },
  plugins: [],
}
