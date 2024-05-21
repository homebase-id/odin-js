import { InfiniteData } from '@tanstack/react-query';

export const validDomainLabelRegEx = /[^\w-]/g;
export const validDomainRegEx = /[^\w-.]/g;

export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_APP_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_APP_VERSION;
    }

    const t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_APP_VERSION;
  }
};

// Flattens all pages, sorts descending and slice on the max number expected
export const flattenInfinteData = <T>(
  rawData:
    | InfiniteData<{
        results: T[];
        cursorState: unknown;
      }>
    | undefined,
  pageSize: number,
  sortFn: (a: T, b: T) => number
) => {
  return rawData?.pages
    .flatMap((page) => page?.results)
    .filter((post) => !!post)
    .sort(sortFn)
    .slice(0, rawData?.pages.length * pageSize) as T[];
};

export const domainFromPrefixAndApex = (prefix: string, apex: string) => {
  if (prefix && apex) {
    return `${prefix}.${apex}`.toLocaleLowerCase().replaceAll(' ', '');
  } else {
    return '';
  }
};
