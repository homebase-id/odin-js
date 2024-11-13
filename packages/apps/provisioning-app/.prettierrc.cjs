/** @type {import("prettier").Config} */
const config = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'auto',
  plugins: ['prettier-plugin-tailwindcss'],
};

module.exports = config;
