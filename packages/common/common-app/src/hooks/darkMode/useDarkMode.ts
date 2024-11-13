import { useState } from 'react';
const LOCALSTORAGE_KEY = 'prefersDark';
export const IS_DARK_CLASSNAME = 'dark';

export const useDarkMode = () => {
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const localPreference = localStorage.getItem(LOCALSTORAGE_KEY);

  const finalChoice =
    localPreference !== undefined && localPreference !== null
      ? localPreference === '1'
      : prefersDarkMode;

  const [isDarkMode, setIsDarkMode] = useState(finalChoice);

  const setDocumentClass = (isDarkMode: boolean) => {
    if (isDarkMode) document.documentElement.classList.add(IS_DARK_CLASSNAME);
    else document.documentElement.classList.remove(IS_DARK_CLASSNAME);
  };

  setDocumentClass(finalChoice);

  const toggleDarkMode = () => {
    const wasDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

    const isDarkMode = !wasDarkMode;
    if ((isDarkMode && prefersDarkMode) || (!isDarkMode && !prefersDarkMode))
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
