/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../common-app/src/**/*.{js,jsx,ts,tsx}',
    '../rich-text-editor/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'page-background': 'rgb(var(--color-page-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        button: 'rgb(var(--color-button) / <alpha-value>)',
        'button-text': 'rgb(var(--color-button-text) / <alpha-value>)',

        primary: 'rgb(var(--color-button) / <alpha-value>)',
        'primary-contrast': 'rgb(var(--color-button-text) / <alpha-value>)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
