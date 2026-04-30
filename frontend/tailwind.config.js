export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50:  '#f8fafc',
          100: '#1a1a2e',
          200: '#16213e',
          300: '#0f3460',
          400: '#533483',
          bg:  '#0d0d0d',
          card:'#1a1a1a',
          border: '#2a2a2a',
          hover: '#252525',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light:   '#a855f7',
          dark:    '#5b21b6',
        }
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] }
    }
  },
  plugins: []
};
