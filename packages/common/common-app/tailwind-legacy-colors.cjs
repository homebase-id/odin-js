/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
// common-app's colour tokens as Tailwind 3 colours, with the names src/theme/tokens.css gives them
const { readFileSync } = require('fs');
const { join } = require('path');

const tokensCss = readFileSync(join(__dirname, 'src/theme/tokens.css'), 'utf8');
const names = [...tokensCss.matchAll(/--color-([a-z0-9-]+):/g)].map((match) => match[1]);

module.exports = Object.fromEntries(
  names.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`])
);
