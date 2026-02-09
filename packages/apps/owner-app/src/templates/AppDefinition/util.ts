import { PermissionSet } from '@homebase-id/js-lib/core';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';
import { DriveGrantRequest } from '../../provider/app/AppManagementProviderTypes';
import { AppDriveAuthorizationParams } from '@homebase-id/js-lib/auth';

export const circleToCircleIds = (queryParamVal: string | undefined): string[] => {
  const parsedString = queryParamVal && tryJsonParse<string[]>(queryParamVal);
  if (Array.isArray(parsedString)) {
    return parsedString;
  }
  return queryParamVal?.split(',') || [];
};

export const drivesParamToDriveGrantRequest = (
  queryParamVal: string | undefined
): DriveGrantRequest[] => {
  if (!queryParamVal) return [];

  try {
    const drivesParamObject = queryParamVal && tryJsonParse(queryParamVal);
    return (Array.isArray(drivesParamObject) ? drivesParamObject : [drivesParamObject]).map(
      (d: AppDriveAuthorizationParams) => {
        return {
          permissionedDrive: {
            drive: {
              alias: d.a,
              type: d.t,
            },
            permission: [
              d.p
                ? Number.isNaN(parseInt(d.p as unknown as string))
                  ? 0
                  : parseInt(d.p as unknown as string)
                : 0,
            ],
          },
          driveMeta: {
            name: d.n,
            description: d.d,
            allowAnonymousReads: d.r || false,
            allowSubscriptions: d.s || false,
            attributes: (d.at && tryJsonParse(d.at)) || undefined,
          },
        };
      }
    );
  } catch (ex) {
    console.warn('Error parsing drives param', ex);
    return [];
  }
};

export const permissionParamToPermissionSet = (
  queryParamVal: string | undefined
): PermissionSet => {
  return {
    keys:
      queryParamVal
        ?.split(',')
        .map((str) => parseInt(str))
        .filter((val) => !!val) ?? [],
  };
};

export const circleParamToCircleIds = (queryParamVal: string | undefined): string[] => {
  return queryParamVal?.split(',') ?? [];
};
