import { InfiniteData } from '@tanstack/react-query';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { compareAcl } from '@homebase-id/js-lib/helpers';
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

export const ellipsisAtMaxChar = (str: string | undefined, maxChar?: number) => {
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
        compareAcl(
          highAttr.serverMetadata?.accessControlList,
          attr.serverMetadata?.accessControlList
        ) ||
        highAttr.fileMetadata.appData.content.priority < attr.fileMetadata.appData.content.priority
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

export const moveElementInArray = (arr: Array<unknown>, fromIndex: number, toIndex: number) => {
  const element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);

  return arr;
};

// Utility to format seconds to mm:ss or h:mm:ss
export const formatDuration = (milliseconds?: number): string => {
  if (!milliseconds || milliseconds <= 0) return '';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};
