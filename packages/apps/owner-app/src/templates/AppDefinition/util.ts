import { PermissionSet } from '@homebase-id/js-lib/core';
import { isValidSlug, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { DriveGrantRequest } from '../../provider/app/AppManagementProviderTypes';
import { AppDriveAuthorizationParams } from '@homebase-id/js-lib/auth';

export const circleToCircleIds = (queryParamVal: string | undefined): string[] => {
  const parsedString = queryParamVal && tryJsonParse<string[]>(queryParamVal);
  if (Array.isArray(parsedString)) {
    return parsedString;
  }
  return queryParamVal?.split(',') || [];
};

/**
 * Parses the `d`/`cd` query param an app hands the owner console into drive grant requests.
 *
 * Returns `undefined` when the param is malformed, which the caller shows as a bad request. It is a
 * URL an app built, so a bad one is a bug in that app and not something the owner can act on -- but
 * quietly dropping a drive from a permission prompt would mean the owner approves less than the app
 * asked for and neither side finds out.
 *
 * `ts` (the drive type slug) is required on every grant for the same reason: the app knows the type
 * of the drive it is asking for, and a grant without one cannot name the drive it wants. `ts`, and
 * `ds` when stated, must be valid slugs: the server refuses anything else and never coerces.
 */
export const drivesParamToDriveGrantRequest = (
  queryParamVal: string | undefined
): DriveGrantRequest[] | undefined => {
  if (!queryParamVal) return [];

  try {
    const drivesParamObject = queryParamVal && tryJsonParse(queryParamVal);
    return (Array.isArray(drivesParamObject) ? drivesParamObject : [drivesParamObject]).map(
      (d: AppDriveAuthorizationParams) => {
        if (!isValidSlug(d.ts))
          throw new Error(
            `Drive grant for ${d.a}/${d.t} ("${d.n}") is missing a valid drive type slug (ts)`
          );
        // A stated drive slug is sent to the server as is, and the server refuses a malformed one --
        // so refuse it here, before the owner is asked to approve anything.
        if (d.ds && !isValidSlug(d.ds))
          throw new Error(
            `Drive grant for ${d.a}/${d.t} ("${d.n}") has an invalid drive slug (ds)`
          );

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
            // Left undefined, ensureDrive derives the slug; see TargetDriveAccessRequest.driveSlug.
            driveSlug: d.ds || undefined,
            driveTypeSlug: d.ts,
          },
        };
      }
    );
  } catch (ex) {
    console.error('Error parsing drives param', ex);
    return undefined;
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
