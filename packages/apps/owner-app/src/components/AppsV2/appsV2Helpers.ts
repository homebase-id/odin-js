import { t } from '@homebase-id/common-app';
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { CircleDefinition, CircleDesignation, CircleGrantOn } from '@homebase-id/js-lib/network';
import { getDrivePermissionFromNumber, getDrivePermissionFromString } from '@homebase-id/js-lib/helpers';
import {
  DrivePermissionV2,
  OdinV2ApiError,
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

