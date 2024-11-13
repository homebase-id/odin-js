module.exports = {
  plugins: {
    //'tailwindcss/nesting': {}, Not supported in combination with CRA: https://stackoverflow.com/questions/70665302/getting-the-error-nested-css-was-detected-but-css-nesting-has-not-been-configu
    tailwindcss: {},
    autoprefixer: {},
  },
};
