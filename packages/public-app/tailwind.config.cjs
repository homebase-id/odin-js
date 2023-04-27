/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'page-background': 'rgb(var(--color-page-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        button: 'rgb(var(--color-button) / <alpha-value>)',
        'button-text': 'rgb(var(--color-button-text) / <alpha-value>)',

        // primary: 'rgb(var(--color-primary) / <alpha-value>)',
        // 'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        // secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        // 'secondary-hover': 'rgb(var(--color-secondary-hover) / <alpha-value>)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
