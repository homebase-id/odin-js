/*
  common-app's colour tokens as Tailwind 3 colours, for the apps still on it (community,
  provisioning). Each reads the RGB channels of the same name, set by src/theme/legacy-indigo.css or
  the app's Layout, so an opacity modifier (bg-nav/50) still works. nav-hover and nav-shadow carry
  their own alpha. primary is left to each app: provisioning has none.
*/
const tokens = [
  'page-background',
  'background',
  'foreground',
  'subtle-foreground',
  'primary-contrast-subtle',
  'secondary',
  'secondary-contrast',
  'surface-container-high',
  'destructive',
  'destructive-hover',
  'destructive-contrast',
  'error-container',
  'error-container-hover',
  'error-container-contrast',
  'nav',
  'nav-contrast',
  'nav-active',
  'nav-active-contrast',
  'nav-more',
  'nav-outline',
  'nav-ring',
];

// eslint-disable-next-line no-undef
module.exports = {
  ...Object.fromEntries(tokens.map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`])),
  'nav-hover': 'rgb(var(--color-nav-hover))',
  'nav-shadow': 'rgb(var(--color-nav-shadow))',
};
