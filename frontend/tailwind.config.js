import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#ffffff',
        accent: '#ffffff',
        ascii: '#1a1a1a',
        dark: {
          DEFAULT: '#000000',
          card: '#0a0a0a',
          border: '#222222',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', 'Courier New', ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
}
