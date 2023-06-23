const STORAGE_IDENTITY = 'identity';
export const saveIdentity = (identity: string) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_IDENTITY, identity);
};
export const retrieveIdentity = () => {
  if (typeof localStorage === 'undefined') return;
  return localStorage.getItem(STORAGE_IDENTITY) || '';
};
