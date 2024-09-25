import ravenLogo from '../assets/raven-logo.svg';
import homebaseLogo from '../assets/homebase-logo.svg';

const ravenHostingConfig = {
  id: 'ravenhosting',
  brandName: 'Raven Hosting',
  brandSlogan: 'Keeping your life private',
  logo: ravenLogo,
  primaryClassName:
    'border border-teal-500 bg-teal-500 text-white transition-colors hover:bg-transparent hover:text-teal-800',
  secondaryClassName:
    'border border-teal-500 bg-white text-teal-800 transition-colors hover:bg-teal-500 hover:text-white',
  termsAndConditionsLink: 'https://ravenhosting.cloud/terms-and-conditions',
  privacyPolicyLink: 'https://ravenhosting.cloud/privacy-policy',
};

const homebaseHostingConfig = {
  id: 'homebase',
  brandName: 'Homebase.id',
  brandSlogan: 'Reclaim the internet',
  logo: homebaseLogo,
  primaryClassName:
    'border border-indigo-500 bg-indigo-500 text-white transition-colors hover:bg-transparent hover:text-indigo-800',
  secondaryClassName:
    'border border-indigo-500 bg-white text-indigo-800 transition-colors hover:bg-indigo-500 hover:text-white',
  termsAndConditionsLink: 'https://homebase.id/terms-and-conditions',
  privacyPolicyLink: 'https://homebase.id/privacy-policy',
};

console.log(import.meta.env.brand);

export const config =
  import.meta.env.VITE_BRAND === ravenHostingConfig.id ? ravenHostingConfig : homebaseHostingConfig;
