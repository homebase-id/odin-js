/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../../common/common-app/src/**/*.{js,jsx,ts,tsx}',
    '../feed-app/src/**/*.{js,jsx,ts,tsx}',
    '../chat-app/src/**/*.{js,jsx,ts,tsx}',
    '../../common/rich-text-editor/src/**/*.{js,jsx,ts,tsx}',
    '../../libs/ui-lib/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'page-background': 'rgb(var(--color-page-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        button: 'rgb(var(--color-button) / <alpha-value>)',
        'button-text': 'rgb(var(--color-button-text) / <alpha-value>)',

        primary: '#6366f1',
        'primary-contrast': '#fff',
      },
      keyframes: {
        slowding: {
          '0%, 60%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        slowding: 'slowding 1.2s ease-in-out',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
