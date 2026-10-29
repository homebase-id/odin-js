import {
  isZeroKnowledgeSharingModel,
  PermissionSet,
  REQUESTABLE_SHARING_MODELS,
} from '@homebase-id/js-lib/core';
import { isValidSlug, stringGuidsEqual, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { BlogConfig } from '@homebase-id/js-lib/public';
import {
  AppCircleDeclaration,
  DriveGrantRequest,
} from '../../provider/app/AppManagementProviderTypes';
import {
  AppCircleAuthorizationParams,
  AppDriveAuthorizationParams,
} from '@homebase-id/js-lib/auth';
import { t } from '@homebase-id/common-app';

/** A drive permission from a query param: the summed flags, or 0 when absent or not a number. */
const toPermission = (p: unknown): number => parseInt(String(p)) || 0;

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
    // Never quietly downgraded: a drive asked for private is private or isn't made
    if (d?.sm !== undefined && !(REQUESTABLE_SHARING_MODELS as readonly string[]).includes(d.sm))
      problems.push(
        `${which}: ${t('sharing model (sm) is not one of')} ${REQUESTABLE_SHARING_MODELS.join(', ')} ("${d.sm}")`
      );
    else if (isZeroKnowledgeSharingModel(d?.sm)) {
      // The server can't open such a drive, so nothing may read it on the server's behalf.  The server refuses the
      // same (CreateDriveRequest.AssertSharingModel); refused here up front, so a request never ends half-created.
      if (d.r)
        problems.push(`${which}: ${t('a private drive (sm) cannot allow anonymous reads (r)')}`);
      if (d.s)
        problems.push(`${which}: ${t('a private drive (sm) cannot allow subscriptions (s)')}`);
      // The console creates every channel drive CDN-readable
      if (stringGuidsEqual(d.t, BlogConfig.DriveType))
        problems.push(`${which}: ${t('a channel drive cannot be private (sm)')}`);
    }
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
        permission: [toPermission(d.p)],
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
        sharingModel: d.sm,
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

/**
 * What is wrong with the `ac` query param (the circles an app declares), in words a developer can
 * act on. Empty when it is absent or fine.
 *
 * Only the shape is checked here. Whether a circle grants more than the app is being granted is the
 * server's to decide, against the registration -- it refuses the whole install if so.
 */
export const appCirclesParamProblems = (queryParamVal: string | undefined): string[] => {
  if (!queryParamVal) return [];

  const parsed = tryJsonParse<AppCircleAuthorizationParams[]>(queryParamVal);
  if (!Array.isArray(parsed)) return [t('`ac` (declared circles) is not a valid JSON list')];

  const seen = new Set<string>();
  return parsed.flatMap((c, i) => {
    const which = `\`ac\` circle ${c?.n ? `"${c.n}"` : `#${i + 1}`}`;
    const problems: string[] = [];
    if (!c?.n) problems.push(`${which}: ${t('missing its name (n)')}`);
    if (!c?.s) problems.push(`${which}: ${t('missing its slug (s)')}`);
    else if (!isValidSlug(c.s))
      problems.push(`${which}: ${t('slug (s) is not a valid slug')} ("${c.s}")`);
    else if (seen.has(c.s))
      problems.push(`${which}: ${t('slug (s) is declared twice')} ("${c.s}")`);
    if (c?.s) seen.add(c.s);
    (c?.g ?? []).forEach((g, j) => {
      if (!g?.a || !g?.t)
        problems.push(
          `${which}, ${t('drive grant')} #${j + 1}: ${t('missing its alias (a) or type (t)')}`
        );
    });
    return problems;
  });
};

/**
 * Parses the `ac` query param into the circles sent with the registration. Empty when absent,
 * `undefined` when it has any problem (see {@link appCirclesParamProblems}) -- for the same reason as
 * {@link drivesParamToDriveGrantRequest}: dropping a circle quietly would mean the owner approves
 * something other than what the app asked for.
 */
export const appCirclesParamToDeclarations = (
  queryParamVal: string | undefined
): AppCircleDeclaration[] | undefined => {
  if (!queryParamVal) return [];
  if (appCirclesParamProblems(queryParamVal).length) return undefined;

  return (tryJsonParse<AppCircleAuthorizationParams[]>(queryParamVal) ?? []).map((c) => ({
    slug: c.s,
    name: c.n,
    description: c.d,
    emoji: c.e,
    driveGrants: (c.g ?? []).map((g) => ({
      permissionedDrive: {
        drive: { alias: g.a, type: g.t },
        permission: [toPermission(g.p)],
      },
    })),
    permissions: { keys: (c.k ?? []).filter((key) => !!key) },
  }));
};
