/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Gumloop brand palette
        brand: {
          50: '#EAF5FF',
          100: '#D2E9FE',
          200: '#A7D3FE',
          300: '#7BBDFD',
          400: '#4FA7FC',
          500: '#208AEF', // Primary Gumloop blue
          600: '#1A6FBE',
          700: '#13548E',
          800: '#0D3A60',
          900: '#062035',
        },
        ink: {
          50: '#F7F8FA',
          100: '#EEF0F3',
          200: '#DCE0E7',
          300: '#B9C0CC',
          400: '#8B95A6',
          500: '#5E6B80',
          600: '#404C61',
          700: '#2A3447',
          800: '#1A2233',
          900: '#0E141F',
        },
        surface: {
          // Light
          DEFAULT: '#FFFFFF',
          subtle: '#F7F8FA',
          muted: '#EEF0F3',
          border: '#DCE0E7',
          // Dark variants
          dark: '#0E141F',
          'dark-subtle': '#141B2A',
          'dark-muted': '#1A2233',
          'dark-border': '#2A3447',
        },
        status: {
          running: '#208AEF',
          'running-bg': '#EAF5FF',
          completed: '#10B981',
          'completed-bg': '#ECFDF5',
          failed: '#EF4444',
          'failed-bg': '#FEF2F2',
          terminated: '#F59E0B',
          'terminated-bg': '#FFFBEB',
          queued: '#8B95A6',
          'queued-bg': '#F7F8FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
