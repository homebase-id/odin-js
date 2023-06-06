const STORAGE_IDENTITY = 'identity';
export const saveIdentity = (identity: string) => {
  localStorage.setItem(STORAGE_IDENTITY, identity);
};
export const retrieveIdentity = () => {
  return localStorage.getItem(STORAGE_IDENTITY) || '';
};
