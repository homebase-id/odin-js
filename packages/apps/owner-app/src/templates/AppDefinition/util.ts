import { PermissionSet } from '@homebase-id/js-lib/core';
import { isValidSlug, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { DriveGrantRequest } from '../../provider/app/AppManagementProviderTypes';
import { AppDriveAuthorizationParams } from '@homebase-id/js-lib/auth';
import { t } from '@homebase-id/common-app';

export const circleToCircleIds = (queryParamVal: string | undefined): string[] => {
  const parsedString = queryParamVal && tryJsonParse<string[]>(queryParamVal);
  if (Array.isArray(parsedString)) {
    return parsedString;
  }
  return queryParamVal?.split(',') || [];
};

/**
 * What is wrong with the `d`/`cd` query param an app hands the owner console, in words a developer
 * can act on. Empty when it is absent or fine.
 *
 * `ts` (the drive type slug) is required on every grant: the app knows the type of the drive it is
 * asking for. `ts`, and `ds` when stated, must be valid slugs: the server refuses anything else and
 * never coerces.
 */
export const drivesParamProblems = (
  queryParamVal: string | undefined,
  paramName: 'd' | 'cd'
): string[] => {
  if (!queryParamVal) return [];

  const parsed = tryJsonParse<AppDriveAuthorizationParams | AppDriveAuthorizationParams[]>(
    queryParamVal
  );
  if (!parsed || typeof parsed !== 'object') {
    return [t(`\`${paramName}\` (requested drives) is not valid JSON`)];
  }

  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((d, i) => {
    const which = `\`${paramName}\` drive ${d?.n ? `"${d.n}"` : `#${i + 1}`}`;
    const problems: string[] = [];
    if (!d?.a || !d?.t) problems.push(`${which}: ${t('missing its alias (a) or type (t)')}`);
    if (!d?.ts) problems.push(`${which}: ${t('missing its drive type slug (ts)')}`);
    else if (!isValidSlug(d.ts))
      problems.push(`${which}: ${t('drive type slug (ts) is not a valid slug')} ("${d.ts}")`);
    if (d?.ds && !isValidSlug(d.ds))
      problems.push(`${which}: ${t('drive slug (ds) is not a valid slug')} ("${d.ds}")`);
    return problems;
  });
};

/**
 * Parses the `d`/`cd` query param an app hands the owner console into drive grant requests.
 *
 * Returns `undefined` when the param has any problem (see {@link drivesParamProblems}), which the
 * caller shows as an invalid request. It is a URL an app built, so a bad one is a bug in that app
 * and not something the owner can act on -- but quietly dropping a drive from a permission prompt
 * would mean the owner approves less than the app asked for and neither side finds out.
 */
export const drivesParamToDriveGrantRequest = (
  queryParamVal: string | undefined
): DriveGrantRequest[] | undefined => {
  if (!queryParamVal) return [];
  if (drivesParamProblems(queryParamVal, 'd').length) return undefined;

  const drivesParamObject = tryJsonParse(queryParamVal);
  return (Array.isArray(drivesParamObject) ? drivesParamObject : [drivesParamObject]).map(
    (d: AppDriveAuthorizationParams) => ({
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
    })
  );
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
