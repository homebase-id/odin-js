import { InfiniteData } from '@tanstack/react-query';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { Attribute } from '@homebase-id/js-lib/profile';

export const stringify = (obj: Record<string, unknown>) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_VERSION;
    }

    const t = new Date(0);
    t.setSeconds(numberedVersion);
    return t.toISOString();
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_VERSION;
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
  pageSize?: number,
  sortFn?: (a: T, b: T) => number
) => {
  return (rawData?.pages
    .flatMap((page) => page?.results)
    .filter((post) => !!post)
    .sort(sortFn)
    .slice(0, pageSize ? rawData?.pages.length * pageSize : undefined) || []) as T[];
};

export const ellipsisAtMaxChar = (str?: string, maxChar?: number) => {
  if (!str || !maxChar) {
    return str;
  }

  if (str.length <= maxChar) {
    return str;
  }

  return `${str.substring(0, maxChar)}...`;
};

export const pascalCase = (str: string) => {
  const [capital, ...lowercased] = str.toLowerCase();
  return capital.toUpperCase() + lowercased.join('');
};

// TODO: Simplify this function
export const getHighestPrioAttributesFromMultiTypes = (
  attributes?: (HomebaseFile<Attribute | undefined> | null)[]
) => {
  if (!attributes) return undefined;

  return (
    attributes?.filter(
      (attr) => !!attr && !!attr.fileMetadata.appData.content
    ) as HomebaseFile<Attribute>[]
  )?.reduce((highestPrioArr, attr) => {
    const highAttr = highestPrioArr.find(
      (highAttr) =>
        highAttr.fileMetadata.appData.content.type === attr.fileMetadata.appData.content.type
    );
    if (!attr.fileMetadata.appData.content.data) return highestPrioArr;

    if (highAttr) {
      if (
        (highAttr.priority || 0) < (attr.priority || 0) ||
        ((highAttr.priority || 0) === (attr.priority || 0) &&
          highAttr.fileMetadata.appData.content.priority <
            attr.fileMetadata.appData.content.priority)
      ) {
        return highestPrioArr;
      } else {
        return [
          ...highestPrioArr.filter(
            (highPrio) =>
              highPrio.fileMetadata.appData.content.type !== attr.fileMetadata.appData.content.type
          ),
          attr,
        ];
      }
    } else {
      return [...highestPrioArr, attr];
    }
  }, [] as HomebaseFile<Attribute>[]);
};
