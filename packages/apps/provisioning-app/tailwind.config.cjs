/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../../common/common-app/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables so the shell can follow the device theme;
        // the values live in Layout's SharedStyleTag
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        button: 'rgb(99 101 241 / <alpha-value>)',
        'button-text': 'rgb(255 255 255 / <alpha-value>)',
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
