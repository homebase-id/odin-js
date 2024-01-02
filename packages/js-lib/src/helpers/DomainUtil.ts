export const getDomainFromUrl = (url?: string): string | undefined => {
  return url?.replace(new RegExp('^(http|https)://'), '').split('/')[0]?.toLowerCase();
};

export const getTwoLettersFromDomain = (domain: string): string => {
  const domainParts = domain.replace('www.', '').split('.');
  if (domainParts.length <= 2) {
    return domainParts[0].substring(0, 2);
  }

  return domainParts[0].substring(0, 1) + domainParts[1].substring(0, 1);
};
