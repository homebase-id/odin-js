/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../common-app/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(255 255 255 / <alpha-value>)',
        foreground: 'rgb(11 11 11 / <alpha-value>)',
        button: 'rgb(99 101 241 / <alpha-value>)',
        'button-text': 'rgb(255 255 255 / <alpha-value>)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
