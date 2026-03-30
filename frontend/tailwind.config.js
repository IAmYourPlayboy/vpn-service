/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4a6fa5',
        accent: '#2a9d8f',
        dark: {
          DEFAULT: '#1a1a2e',
          card: '#252545',
          border: '#333355',
        },
      },
    },
  },
  plugins: [],
}
