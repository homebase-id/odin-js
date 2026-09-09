export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_APP_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_APP_VERSION;
    }

    const t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_APP_VERSION;
  }
};

export const domainFromPrefixAndApex = (prefix: string, apex: string) => {
  if (prefix && apex) {
    return `${prefix}.${apex}`.toLocaleLowerCase().replaceAll(/\s/g, '');
  } else {
    return '';
  }
};

import { cleanLabel } from '@homebase-id/common-app';

// Domain-input cleaning is shared with the YouAuth login box - single implementation
// in common-app so a domain typed anywhere behaves the same
export {
  MAX_DNS_LABEL_LENGTH,
  cleanLabel,
  cleanLabelInPlace,
  cleanDomain,
  cleanDomainInput,
  cleanDomainInputInPlace,
} from '@homebase-id/common-app';

const MIN_DNS_LABEL_LENGTH = 2;

// The server rejects a leading or trailing hyphen on any label
export const isCompleteLabel = (label: string) =>
  label.length >= MIN_DNS_LABEL_LENGTH && !label.endsWith('-');

export const websiteFromDomain = (domain: string) => (domain ? `https://${domain}/` : '');

export const primaryMailFromDomain = (domain: string) => (domain ? `mail@${domain}` : '');

// The inverse of domainFromPrefixAndApex, resolved against the apexes THIS
// cluster offers. A region redirect hands a claim to a different cluster, whose
// apex list is its own server config, so the claim may simply not fit here.
// Returns null on anything that does not: an apex not offered, the wrong number
// of labels, junk from a hand-edited URL. The caller then starts with an empty
// form, which is where it would have been anyway.
export const prefixesFromClaimedDomain = <T extends { apex: string; prefixLabels: string[] }>(
  claimed: string,
  apexes: T[]
): { apex: T; prefixes: string[] } | null => {
  const domain = (claimed ?? '').trim().toLocaleLowerCase();
  if (!domain) return null;

  // Longest apex first, so a claim under kin.pub cannot be read as one under a
  // shorter apex that happens to be a suffix of it
  const match = [...apexes]
    .sort((a, b) => b.apex.length - a.apex.length)
    .find(({ apex }) => domain.endsWith(`.${apex}`));
  if (!match) return null;

  const prefixes = domain
    .slice(0, -(match.apex.length + 1))
    .split('.')
    .map(cleanLabel);

  if (prefixes.length !== match.prefixLabels.length) return null;
  if (!prefixes.every(isCompleteLabel)) return null;

  return { apex: match, prefixes };
};
