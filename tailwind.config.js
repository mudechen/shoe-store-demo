import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
      colors: {
        stock: {
          out: {
            DEFAULT: '#EF4444',
            bg: '#FEE2E2',
            text: '#B91C1C',
            darkBg: '#450a0a',
            darkText: '#fca5a5',
            darkBorder: '#dc2626'
          },
          warning: {
            DEFAULT: '#F59E0B',
            bg: '#FEF3C7',
            text: '#B45309',
            darkBg: '#451a03',
            darkText: '#fcd34d',
            darkBorder: '#d97706'
          },
          sufficient: {
            DEFAULT: '#10B981',
            bg: '#D1FAE5',
            text: '#047857',
            darkBg: '#064e3b',
            darkText: '#6ee7b7',
            darkBorder: '#059669'
          }
        }
      }
    },
  },
  plugins: [
    containerQueries,
  ],
}
