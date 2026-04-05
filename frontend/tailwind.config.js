import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-text)',
        accent: '#ffffff',
        ascii: '#1a1a1a',
        dark: {
          DEFAULT: 'var(--color-bg)',
          card: 'var(--color-card)',
          border: 'var(--color-border)',
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
