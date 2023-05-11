/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../common-app/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#22c55e',
        'primary-contrast': '#fff',
        secondary: '#f1f5f9',
        'secondary-contrast': '#000',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
