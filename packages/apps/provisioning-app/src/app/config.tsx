import ravenLogo from '../assets/raven-logo.svg';
import homebaseLogo from '../assets/homebase-logo.svg';

const ravenHostingConfig = {
  id: 'ravenhosting',
  brandName: 'Raven Hosting',
  brandSlogan: 'Keeping your life private',
  logo: ravenLogo,
  primaryClassName:
    'border border-teal-500 bg-teal-500 text-white transition-colors hover:bg-transparent hover:text-teal-800 dark:hover:text-teal-300',
  secondaryClassName:
    'border border-teal-500 bg-white text-teal-800 transition-colors hover:bg-teal-500 hover:text-white dark:bg-transparent dark:text-teal-300 dark:hover:text-white',
  // Brand colour as text/stroke, for accents that aren't buttons
  accentClassName: 'text-teal-600 dark:text-teal-400',
  accentBorderClassName: 'border-teal-500',
  termsAndConditionsLink: 'https://ravenhosting.cloud/terms-and-conditions',
  privacyPolicyLink: 'https://ravenhosting.cloud/privacy-policy',
};

const homebaseHostingConfig = {
  id: 'homebase',
  brandName: 'Homebase.id',
  brandSlogan: 'Reclaim the internet',
  logo: homebaseLogo,
  primaryClassName:
    'border border-indigo-500 bg-indigo-500 text-white transition-colors hover:bg-transparent hover:text-indigo-800 dark:hover:text-indigo-300',
  secondaryClassName:
    'border border-indigo-500 bg-white text-indigo-800 transition-colors hover:bg-indigo-500 hover:text-white dark:bg-transparent dark:text-indigo-300 dark:hover:text-white',
  // Brand colour as text/stroke, for accents that aren't buttons
  accentClassName: 'text-indigo-600 dark:text-indigo-400',
  accentBorderClassName: 'border-indigo-500',
  termsAndConditionsLink: 'https://homebase.id/terms-and-conditions',
  privacyPolicyLink: 'https://homebase.id/privacy-policy',
};

export const config =
  import.meta.env.VITE_BRAND === ravenHostingConfig.id ||
  window.location.hostname.indexOf('ravenhosting') !== -1
    ? ravenHostingConfig
    : homebaseHostingConfig;
