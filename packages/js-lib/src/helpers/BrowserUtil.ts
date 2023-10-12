export const isLocalStorageAvailable = () => {
  const test = 'test';
  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const hasDebugFlag = () =>
  isLocalStorageAvailable() ? localStorage.getItem('debug') === '1' : false;
