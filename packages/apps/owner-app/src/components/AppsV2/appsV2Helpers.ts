import { t } from '@homebase-id/common-app';
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { CircleDefinition, CircleDesignation, CircleGrantOn } from '@homebase-id/js-lib/network';
import {
  getDrivePermissionFromNumber,
  getDrivePermissionFromString,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import {
  AppRegistrationV2,
  DrivePermissionV2,
  OdinV2ApiError,
  RedactedBundleToken,
  RedactedCircleDefinitionV2,
  TargetDriveV2,
} from '@homebase-id/js-lib/auth';

/**
 * V2 sends DrivePermission as a camelCase string ("readWrite", "read, write"); the V1 components
 * want DrivePermissionType[]. These convert, label and key V2 values.
 */

const PERMISSION_BITS = [
  DrivePermissionType.Read,
  DrivePermissionType.Write,
  DrivePermissionType.React,
  DrivePermissionType.Comment,
];

export const toDrivePermissionTypes = (
  permission: DrivePermissionV2 | DrivePermissionType[] | undefined | null
): DrivePermissionType[] => {
  if (permission === undefined || permission === null) return [];
  if (Array.isArray(permission)) return permission;
  if (typeof permission === 'number') return PERMISSION_BITS.filter((bit) => (permission & bit) === bit);

  const trimmed = permission.trim();
  if (/^\d+$/.test(trimmed)) return toDrivePermissionTypes(parseInt(trimmed, 10));
  return getDrivePermissionFromString(trimmed);
};

export const drivePermissionLabel = (permission: DrivePermissionV2 | undefined | null) => {
  const types = toDrivePermissionTypes(permission);
  if (!types.length) {
    if (typeof permission === 'string' && /temporal/i.test(permission)) return t('Conditional temporal read');
    return t('none');
  }
  return types.map((type) => t(getDrivePermissionFromNumber([type]))).join(', ');
};

export const targetDriveKey = (drive: TargetDriveV2 | undefined) =>
  `${drive?.alias ?? ''}-${drive?.type ?? ''}`.toLowerCase().replace(/-/g, '');

export const errorMessageOf = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (error instanceof OdinV2ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
};

/** For reusing CircleOverview on circles that exist. */
export const toCircleDefinition = (circle: RedactedCircleDefinitionV2): CircleDefinition => ({
  id: circle.id,
  name: circle.name,
  description: circle.description ?? '',
  appId: circle.appId ?? undefined,
  created: circle.created,
  lastUpdated: circle.lastUpdated,
  disabled: circle.disabled,
  emoji: circle.emoji ?? undefined,
  grantOn: (circle.grantOn as CircleGrantOn | undefined) ?? undefined,
  designation: (circle.designation as CircleDesignation | undefined) ?? undefined,
  permissions: { keys: circle.permissions?.keys ?? [] },
  driveGrants: (circle.driveGrants ?? []).map((grant) => ({
    permissionedDrive: {
      drive: grant.permissionedDrive.drive,
      permission: toDrivePermissionTypes(grant.permissionedDrive.permission),
    },
  })),
});

export const formatDate = (value: number | undefined) =>
  value ? new Date(value).toLocaleDateString() : undefined;


// ---------------------------------------------------------------------------------------------
// Cross-app reach
// ---------------------------------------------------------------------------------------------

/**
 * The built-in System app owns the transient drive that every transit-using app is granted
 * automatically; that grant is plumbing, not reach into another app.
 */
export const SYSTEM_APP_ID = 'ac126e09-54cb-4878-a690-856be692da16';

export interface DriveReachEntry {
  targetDrive: TargetDriveV2;
  permission: DrivePermissionV2;
  driveName?: string;
  owner?: { appId: string; name: string };
}

export interface AppReach {
  /** Drives the app owns. */
  own: DriveReachEntry[];
  /** Drives another app owns: the app itself can reach into that app. */
  otherApps: DriveReachEntry[];
  /** Drives no app owns: the identity owner's own drives. */
  yours: DriveReachEntry[];
  /** System plumbing (the transient drive). */
  system: DriveReachEntry[];
  /** Other apps sharing a bundle token with this app: clients holding those tokens reach them too. */
  tokenPeers: { appId: string; name: string; tokenCount: number }[];
}

/** Which drive belongs to which app, across every registration. */
export const driveOwners = (apps: AppRegistrationV2[] | undefined) =>
  new Map(
    (apps ?? []).flatMap((app) =>
      app.ownedDrives.map(
        (drive) =>
          [
            targetDriveKey(drive.targetDrive),
            { appId: app.registration.appId, name: app.registration.name, driveName: drive.name },
          ] as const
      )
    )
  );

/** Where an app's registration reaches, and which apps its bundle tokens put it alongside. */
export const appReach = (
  app: AppRegistrationV2,
  allApps: AppRegistrationV2[] | undefined,
  tokens: RedactedBundleToken[] | undefined,
  driveName?: (drive: TargetDriveV2) => string | undefined
): AppReach => {
  const appId = app.registration.appId;
  const owners = driveOwners(allApps);
  const reach: AppReach = { own: [], otherApps: [], yours: [], system: [], tokenPeers: [] };

  for (const grant of app.registration.grant?.driveGrants ?? []) {
    const drive = grant.permissionedDrive.drive;
    const owner = owners.get(targetDriveKey(drive));
    const entry: DriveReachEntry = {
      targetDrive: drive,
      permission: grant.permissionedDrive.permission,
      driveName: owner?.driveName ?? driveName?.(drive),
      owner: owner ? { appId: owner.appId, name: owner.name } : undefined,
    };

    if (!owner) reach.yours.push(entry);
    else if (stringGuidsEqual(owner.appId, appId)) reach.own.push(entry);
    else if (stringGuidsEqual(owner.appId, SYSTEM_APP_ID)) reach.system.push(entry);
    else reach.otherApps.push(entry);
  }

  const peers = new Map<string, { appId: string; name: string; tokenCount: number }>();
  for (const token of tokens ?? []) {
    if (!token.apps.some((member) => stringGuidsEqual(member.appId, appId))) continue;
    for (const member of token.apps) {
      if (stringGuidsEqual(member.appId, appId)) continue;
      const key = member.appId.toLowerCase().replace(/-/g, '');
      const peer = peers.get(key) ?? { appId: member.appId, name: member.name || member.appId, tokenCount: 0 };
      peer.tokenCount += 1;
      peers.set(key, peer);
    }
  }
  reach.tokenPeers = [...peers.values()].sort((a, b) => a.name.localeCompare(b.name));

  return reach;
};
