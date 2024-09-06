export const isLocalStorageAvailable = () => {
  const test = 'test';
  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export const hasDebugFlag = () =>
  isLocalStorageAvailable()
    ? localStorage.getItem('debug') === '1'
    : typeof navigator !== 'undefined' &&
      navigator.product === 'ReactNative' &&
      'debug' in global &&
      global.debug;
