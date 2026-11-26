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
        neo: {
          bg: '#FFFDF5',
          card: '#FFFFFF',
          yellow: '#FFDE59',
          purple: '#B4A7FF',
          green: '#B8F4B8',
          coral: '#FF8A80',
          blue: '#A6E1FA',
          black: '#111111',
          border: '#111111',
          muted: '#666666',
        },
        dark: {
          bg: '#121212',
          card: '#1E1E1E',
          sidebar: '#181818',
          text: '#F5F5F5',
          secondary: '#B3B3B3',
          muted: '#A3A3A3',
          border: '#E5E5E5',
          yellow: '#FFDE59',
          purple: '#B4A7FF',
          green: '#B8F4B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #111111',
        'neo': '4px 4px 0px #111111',
        'neo-md': '5px 5px 0px #111111',
        'neo-lg': '6px 6px 0px #111111',
        'neo-xl': '8px 8px 0px #111111',
        'neo-yellow': '4px 4px 0px #FFDE59',
        'neo-purple': '4px 4px 0px #B4A7FF',
        'neo-dark-sm': '2px 2px 0px #E5E5E5',
        'neo-dark': '4px 4px 0px #E5E5E5',
        'neo-dark-lg': '6px 6px 0px #E5E5E5',
        'neo-dark-xl': '8px 8px 0px #E5E5E5',
        'neo-inset': 'inset 2px 2px 0px #111111',
      },
      borderWidth: {
        '2': '2px',
        '3': '3px',
      },
      keyframes: {
        waveBar: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '34px' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        }
      },
      animation: {
        'wave-bar-1': 'waveBar 0.8s ease-in-out infinite',
        'wave-bar-2': 'waveBar 0.8s ease-in-out infinite 0.15s',
        'wave-bar-3': 'waveBar 0.8s ease-in-out infinite 0.3s',
        'wave-bar-4': 'waveBar 0.8s ease-in-out infinite 0.45s',
        'wave-bar-5': 'waveBar 0.8s ease-in-out infinite 0.6s',
        'pop': 'pop 0.15s ease-out',
      }
    },
  },
  plugins: [],
}
