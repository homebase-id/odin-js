export const getDomainFromUrl = (url?: string): string | undefined => {
  return url
    ?.replace(new RegExp('^(http|https)://'), '')
    .replace(/\s/g, '')
    .split('/')[0]
    ?.toLowerCase();
};

export const getHostFromUrl = (url?: string): string | undefined => {
  return getDomainFromUrl(url)
    ?.split('.')
    .find((part) => part !== 'www');
};

export const getTwoLettersFromDomain = (domain: string): string => {
  const domainParts = domain.replace('www.', '').split('.');
  if (domainParts.length <= 2) {
    return domainParts[0].substring(0, 2);
  }

  return domainParts[0].substring(0, 1) + domainParts[1].substring(0, 1);
};
