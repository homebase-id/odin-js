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

// As enforced server side by AsciiDomainNameValidator.MAX_DNS_LABEL_LENGTH
export const MAX_DNS_LABEL_LENGTH = 63;

const MIN_DNS_LABEL_LENGTH = 2;

// The server rejects underscores even though they are word characters, so \w is
// wrong here
export const cleanLabel = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+/, '')
    .slice(0, MAX_DNS_LABEL_LENGTH);

// The server rejects a leading or trailing hyphen on any label
export const isCompleteLabel = (label: string) =>
  label.length >= MIN_DNS_LABEL_LENGTH && !label.endsWith('-');

// Live domain cleaner, applied on every keystroke/paste of a full-domain input:
// strips a pasted URL down to its host (same idea as YouAuthLoginBox's stripIdentity),
// lowercases, turns spaces into dots, strips characters a domain can't contain,
// collapses duplicate dots and cleans each label (via cleanLabel). Deliberately KEEPS
// a single trailing dot - the user is probably about to type the next label.
export const cleanDomainInput = (value: string) =>
  value
    .replace(/^(https?):\/\//, '')
    .split('/')[0]
    .toLocaleLowerCase()
    .replace(/\s+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./, '')
    .split('.')
    .map(cleanLabel)
    .join('.');

// Final domain cleaner, run when input is done (blur/submit): also drops trailing dots
export const cleanDomain = (value: string) => cleanDomainInput(value).replace(/\.+$/, '');

export const websiteFromDomain = (domain: string) => (domain ? `https://${domain}/` : '');

export const primaryMailFromDomain = (domain: string) => (domain ? `mail@${domain}` : '');

// The personal address: the first label becomes the mailbox, everything after
// it becomes the mail domain. So john.doe + id.pub -> john@doe.id.pub, and a
// single-label prefix john + dominion.id -> john@dominion.id
export const splitMailFromPrefixAndApex = (prefix: string, apex: string) => {
  if (!prefix || !apex) return '';

  const labels = prefix.split('.');
  return `${labels[0]}@${[...labels.slice(1), apex].join('.')}`.toLocaleLowerCase();
};
