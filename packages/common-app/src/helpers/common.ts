import { InfiniteData } from '@tanstack/react-query';
import { AccessControlList, SecurityGroupType } from '@youfoundation/js-lib/core';
import { AttributeFile } from '@youfoundation/js-lib/profile';

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

    const t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
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
  pageSize: number,
  sortFn?: (a: T, b: T) => number
) => {
  return rawData?.pages
    .flatMap((page) => page?.results)
    .filter((post) => !!post)
    .sort(sortFn)
    .slice(0, rawData?.pages.length * pageSize) as T[];
};

export const ellipsisAtMaxChar = (str?: string, maxChar?: number) => {
  if (!str || !maxChar) {
    return str;
  }

  if (str.length < maxChar) {
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
  attributes?: (AttributeFile | undefined)[]
) => {
  if (attributes) {
    return (attributes?.filter((attr) => !!attr) as AttributeFile[])?.reduce(
      (highestPrioArr, attr) => {
        const highAttr = highestPrioArr.find((highAttr) => highAttr.type === attr.type);
        if (!attr.data) return highestPrioArr;

        if (highAttr) {
          if (
            getAclPriority(highAttr.acl) < getAclPriority(attr.acl) ||
            (getAclPriority(highAttr.acl) === getAclPriority(attr.acl) &&
              highAttr.priority < attr.priority)
          ) {
            return highestPrioArr;
          } else {
            return [...highestPrioArr.filter((highPrio) => highPrio.type !== attr.type), attr];
          }
        } else {
          return [...highestPrioArr, attr];
        }
      },
      [] as AttributeFile[]
    );
  }
};

const getAclPriority = (acl: AccessControlList) => {
  if (!acl || acl.requiredSecurityGroup === SecurityGroupType.Owner) return 0;
  if (
    acl.requiredSecurityGroup === SecurityGroupType.Connected &&
    acl.odinIdList?.length &&
    acl.odinIdList?.length > 0
  )
    return 1;
  if (
    acl.requiredSecurityGroup === SecurityGroupType.Connected &&
    acl.circleIdList?.length &&
    acl.circleIdList?.length > 0
  )
    return 2;
  if (acl.requiredSecurityGroup === SecurityGroupType.Connected) return 3;

  if (acl.requiredSecurityGroup === SecurityGroupType.Authenticated) return 4;
  return 10;
};
