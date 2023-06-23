const STORAGE_IDENTITY = 'identity';
export const saveIdentity = (identity: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_IDENTITY, identity);
};
export const retrieveIdentity = () => {
  if (typeof window === 'undefined') return;
  return localStorage.getItem(STORAGE_IDENTITY) || '';
};
