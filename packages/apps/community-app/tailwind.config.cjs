/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../../libs/ui-lib/src/**/*.{js,jsx,ts,tsx}',
    '../../common/common-app/src/**/*.{js,jsx,ts,tsx}',
    '../../common/rich-text-editor/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-contrast': '#fff',
        // ActionButton's colours (common-app ColorConfig)
        secondary: 'rgb(var(--color-background) / <alpha-value>)',
        'secondary-contrast': 'rgb(var(--color-foreground) / <alpha-value>)',
        destructive: '#ef4444',
        'destructive-contrast': '#fff',
        'error-container': 'var(--error-container)',
        'on-error-container': 'var(--on-error-container)',
        // Sidenav's colours (common-app Sidenav)
        nav: 'rgb(var(--color-nav) / <alpha-value>)',
        'nav-foreground': 'rgb(var(--color-nav-foreground) / <alpha-value>)',
        'nav-active': 'rgb(var(--color-nav-active) / <alpha-value>)',
        'nav-active-foreground': 'rgb(var(--color-nav-active-foreground) / <alpha-value>)',
        'nav-more': 'rgb(var(--color-nav-more) / <alpha-value>)',
        'nav-outline': 'rgb(var(--color-nav-outline) / <alpha-value>)',

        'page-background': 'rgb(var(--color-page-background) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
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
