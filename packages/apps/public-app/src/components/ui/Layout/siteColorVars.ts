export const RGB_TRIPLE = /^\d{1,3} \d{1,3} \d{1,3}$/;

const ROLE_OF_SITE_COLOR: Record<string, string> = {
  'page-background': 'page-background',
  background: 'background',
  foreground: 'foreground',
  button: 'primary',
  'button-text': 'primary-contrast',
};

// The roles an owner can't pick: the site's text mixed into its background by this much
const DERIVED_FROM_SITE_COLORS: Record<string, number> = {
  'muted-foreground': 0.6,
  outline: 0.45,
  'outline-variant': 0.2,
  secondary: 0.08,
  'surface-container-low': 0.04,
  'surface-container': 0.06,
  'surface-container-high': 0.08,
  'surface-container-highest': 0.12,
};

export const siteColorVars = (row?: Record<string, string>) => {
  const vars: Record<string, string> = {};
  Object.entries(ROLE_OF_SITE_COLOR).forEach(([key, role]) => {
    if (RGB_TRIPLE.test(row?.[key] ?? '')) vars[role] = row![key];
  });
  const { foreground, background } = vars;
  if (foreground && background) {
    const fg = foreground.split(' ').map(Number);
    const bg = background.split(' ').map(Number);
    Object.entries(DERIVED_FROM_SITE_COLORS).forEach(([role, amount]) => {
      vars[role] = bg.map((c, i) => Math.round(fg[i] * amount + c * (1 - amount))).join(' ');
    });
    vars['secondary-contrast'] = foreground;
  }
  return Object.entries(vars)
    .map(([role, value]) => `--color-${role}: ${value};`)
    .join('');
};
