/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../common-app/src/**/*.{js,jsx,ts,tsx}',
    '../feed-app/src/**/*.{js,jsx,ts,tsx}',
    '../rich-text-editor/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-contrast': '#fff',
        secondary: '#fff',
        'secondary-contrast': '#000',

        'page-background': 'rgb(var(--color-page-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
