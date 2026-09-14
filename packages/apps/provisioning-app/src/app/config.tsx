import ravenLogo from '../assets/raven-logo.svg';
import homebaseLogo from '../assets/homebase-logo.svg';
import { Region } from '../helpers/region';

// Which provisioning host serves each region, per brand.
//
// odin-core has no concept of regions: a cluster serves the sign-up app only for
// requests whose Host equals its own Registry:ProvisioningDomain, and it knows
// nothing of any other cluster - separate registries, separate databases. So the
// hostname *is* the region, and picking one is the front-end sending the user to
// a different host. See helpers/regionRouting.ts.
//
// A brand with no entries (or a partial map) simply does not route: the flow
// stays on whatever host served the page, which is what happened everywhere
// before regions existed.
type ProvisioningHosts = Partial<Record<Region, string>>;

const ravenHostingConfig = {
  id: 'ravenhosting',
  brandName: 'Raven Hosting',
  brandSlogan: 'Keeping your life private',
  logo: ravenLogo,
  primaryClassName:
    'border border-teal-500 bg-teal-500 text-white transition-colors hover:bg-transparent hover:text-teal-800 dark:hover:text-teal-300',
  secondaryClassName:
    'border border-teal-500 bg-white text-teal-800 transition-colors hover:bg-teal-500 hover:text-white dark:bg-transparent dark:text-teal-300 dark:hover:text-white',
  accentClassName: 'text-teal-600 dark:text-teal-400',
  accentBorderClassName: 'border-teal-500',
  accentFocusClassName: 'focus-within:border-teal-500 focus-within:ring-teal-300',
  termsAndConditionsLink: 'https://ravenhosting.cloud/terms-and-conditions',
  privacyPolicyLink: 'https://ravenhosting.cloud/privacy-policy',
  // `createme.<region>` is deliberately a pointer, not a cluster name: repointing
  // the DNS record moves new sign-ups to another cluster without a release here.
  provisioningHosts: {
    eu: 'createme.ravenhosting.cloud',
    ca: 'createme.na.ravenhosting.cloud',
  } as ProvisioningHosts,
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
  accentClassName: 'text-indigo-600 dark:text-indigo-400',
  accentBorderClassName: 'border-indigo-500',
  accentFocusClassName: 'focus-within:border-indigo-500 focus-within:ring-indigo-300',
  termsAndConditionsLink: 'https://homebase.id/terms-and-conditions',
  privacyPolicyLink: 'https://homebase.id/privacy-policy',
  // Single cluster today; add the hosts here when this brand gains a region.
  provisioningHosts: {} as ProvisioningHosts,
};

export const config =
  import.meta.env.VITE_BRAND === ravenHostingConfig.id ||
  window.location.hostname.indexOf('ravenhosting') !== -1
    ? ravenHostingConfig
    : homebaseHostingConfig;
