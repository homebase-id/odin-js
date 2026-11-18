// eslint-disable-next-line no-undef, @typescript-eslint/no-require-imports
const legacyColors = require('../../common/common-app/tailwind-legacy-colors.cjs');

/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../../common/common-app/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...legacyColors,
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
