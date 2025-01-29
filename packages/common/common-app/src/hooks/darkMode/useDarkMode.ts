import { useState } from 'react';
const LOCALSTORAGE_KEY = 'prefersDark';
export const IS_DARK_CLASSNAME = 'dark';

export const useDarkMode = () => {
  const browserPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const finalChoice = (() => {
    const search = window.location.search;
    const urlPreference = new URLSearchParams(search).get(LOCALSTORAGE_KEY);
    if (urlPreference !== null) return urlPreference === '1';

    const localPreference = localStorage.getItem(LOCALSTORAGE_KEY);
    if (localPreference !== undefined && localPreference !== null) return localPreference === '1';

    const browserPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return browserPreference;
  })();

  const [isDarkMode, setIsDarkMode] = useState(finalChoice);

  const setDocumentClass = (isDarkMode: boolean) => {
    if (isDarkMode) document.documentElement.classList.add(IS_DARK_CLASSNAME);
    else document.documentElement.classList.remove(IS_DARK_CLASSNAME);
  };

  setDocumentClass(finalChoice);

  const toggleDarkMode = () => {
    // remove search params
    const url = new URL(window.location.href);
    url.searchParams.delete(LOCALSTORAGE_KEY);
    window.history.replaceState({}, '', url.toString());

    const wasDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

    const isDarkMode = !wasDarkMode;
    if ((isDarkMode && browserPreference) || (!isDarkMode && !browserPreference))
      localStorage.removeItem(LOCALSTORAGE_KEY);
    else localStorage.setItem(LOCALSTORAGE_KEY, isDarkMode ? '1' : '0');

    setDocumentClass(isDarkMode);
    setIsDarkMode(isDarkMode);
  };

  return {
    toggleDarkMode,
    isDarkMode: isDarkMode,
  };
};
