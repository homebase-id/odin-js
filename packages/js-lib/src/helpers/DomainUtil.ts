export const getDomainFromUrl = (url?: string): string | undefined => {
  return url?.replace(new RegExp('^(http|https)://'), '').split('/')[0];
};
