export type Region = 'eu' | 'ca';

// Where the region guess came from, so the UI can explain itself
export type RegionSource = 'locale' | 'timezone';

export const REGION_NAMES: Record<Region, string> = {
  eu: 'Europe',
  ca: 'Canada',
};

export const REGIONS = Object.keys(REGION_NAMES) as Region[];

const EU_CC =
  /^(DE|FR|GB|IE|NL|BE|LU|AT|CH|IT|ES|PT|PL|CZ|SK|HU|RO|BG|GR|DK|SE|NO|FI|IS|EE|LV|LT|SI|HR|MT|CY|UA|RS|BA|AL|MK|ZA|NG|KE|EG|MA|IL|TR|SA|AE)$/;

const AM_CC = /^(CA|US|MX|BR|AR|CL|CO|PE|VE|EC|BO|PY|UY|CR|PA|GT|CU|DO|JM)$/;

export const isRegion = (value: string | null | undefined): value is Region =>
  !!value && REGIONS.includes(value as Region);

/**
 * Guess which region to host in, without a network probe.
 *
 * Time zone is tried first, because it comes from the OS clock and is a real
 * location signal. The browser's language list is deliberately second: Chrome
 * and Edge default it to "en-US" whatever the machine's actual locale, so
 * trusting it first sends most of Europe to the wrong datacenter. It's only
 * useful when the time zone doesn't resolve to a region we host in.
 *
 * Returns a null region when neither signal resolves; the caller is expected to
 * ask the user rather than guess.
 */
export const detectRegion = (): { region: Region | null; source: RegionSource | null } => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^(Europe|Africa|Atlantic)\//.test(timeZone)) return { region: 'eu', source: 'timezone' };
    if (/^America\//.test(timeZone)) return { region: 'ca', source: 'timezone' };
  } catch {
    // No Intl support; fall back to the locale
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const language of languages) {
    try {
      const country = new Intl.Locale(language).region;
      if (country && EU_CC.test(country)) return { region: 'eu', source: 'locale' };
      if (country && AM_CC.test(country)) return { region: 'ca', source: 'locale' };
    } catch {
      // Malformed locale tag; try the next one
    }
  }

  return { region: null, source: null };
};

export const regionSourceLabel = (source: RegionSource) =>
  source === 'locale' ? 'based on your device settings' : 'based on your time zone';
