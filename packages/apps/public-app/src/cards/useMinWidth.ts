import { useCallback, useSyncExternalStore } from 'react';

// ponytail: one query per call, fine for the single breakpoint cards use; subscribe is memoized
// on query so React doesn't tear down and re-subscribe the media query listener on every render
export const useMinWidth = (px: number) => {
  const query = `(min-width: ${px}px)`;
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
};
