import { useSyncExternalStore } from 'react';

// ponytail: one query per call, fine for the single breakpoint cards use
export const useMinWidth = (px: number) => {
  const query = `(min-width: ${px}px)`;
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches
  );
};
