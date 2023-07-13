import { isLocalStorageAvailable } from '../../helpers/BrowserUtil';

const STORAGE_IDENTITY = 'identity';
export const saveIdentity = (identity: string) => {
  if (!isLocalStorageAvailable()) return;
  localStorage.setItem(STORAGE_IDENTITY, identity);
};
export const retrieveIdentity = () => {
  if (!isLocalStorageAvailable()) return;
  return localStorage.getItem(STORAGE_IDENTITY) || '';
};
