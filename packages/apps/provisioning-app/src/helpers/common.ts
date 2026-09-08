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
