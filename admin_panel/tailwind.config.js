/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eaf3ef',
          100: '#d3e8dd',
          200: '#a6d1bb',
          300: '#78b999',
          400: '#3f9668',
          500: '#1B6B3A',
          600: '#165a31',
          700: '#124a28',
          800: '#0e3a20',
          900: '#0a2b17',
          950: '#081f11',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.06), 0 1px 3px 0 rgba(16, 24, 40, 0.08)',
      },
    },
  },
  plugins: [],
};
