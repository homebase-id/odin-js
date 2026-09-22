/**
 * Wire types for `/api/v2/app-registrations` (odin-core docs/app-registration-v2-api.md).
 *
 * JSON is camelCase. Enums arrive as camelCase strings (`"readWrite"`, `"read, write"`) and are
 * accepted as strings or numbers, so every enum field here is typed as `string | number`.
 */

export interface TargetDriveV2 {
  alias: string;
  type: string;
}

/**
 * DrivePermission flags: none=0, read=1, write=2, react=4, comment=8, conditionalTemporalRead=16,
 * readWrite=15 (read|write|react|comment). Output is a camelCase string; input may be either.
 */
export type DrivePermissionV2 = string | number;

export const DrivePermissionV2Flags = {
  none: 0,
  read: 1,
  write: 2,
  react: 4,
  comment: 8,
  conditionalTemporalRead: 16,
  readWrite: 15,
} as const;

export interface PermissionedDriveV2 {
  drive: TargetDriveV2;
  permission: DrivePermissionV2;
  temporalReadWindowSeconds?: number;
}

export interface DriveGrantRequestV2 {
  permissionedDrive: PermissionedDriveV2;
}

export interface PermissionSetV2 {
  keys: number[];
}

export interface PermissionSetGrantRequestV2 {
  drives?: DriveGrantRequestV2[] | null;
  permissionSet?: PermissionSetV2 | null;
}

/** 'none' | 'connect' | 'ownFlowConnect' | 'review' (see odin-core CircleEnrollment.cs) */
export type CircleGrantOnV2 = string;

/** 'personal' | 'audience' | 'vendor' */
export type CircleDesignationV2 = string;

export interface OwnedDrive {
  name: string;
  targetDrive: TargetDriveV2;
  metadata?: string | null;
  allowAnonymousReads: boolean;
  allowSubscriptions: boolean;
  allowCdn: boolean;
  ownerOnly: boolean;
  /** Required. OdinSlug: [a-z0-9-] */
  driveSlug: string;
  /** Required. OdinSlug: [a-z0-9-] */
  driveTypeSlug: string;
  attributes?: Record<string, string> | null;
}

export interface OwnedCircle {
  id: string;
  name: string;
  description?: string | null;
  driveGrants?: DriveGrantRequestV2[] | null;
  permissions?: PermissionSetV2 | null;
  grantOn: CircleGrantOnV2;
  designation: CircleDesignationV2;
  emoji?: string | null;
}

export interface AppManifestV2 {
  appId: string;
  name: string;
  /** Required, OdinSlug: [a-z0-9-], 1..14, immutable */
  appSlug: string;
  /** "host" or "host:port", immutable */
  corsHostName?: string;
  /** Identity-wide keys the app holds */
  permissionSet?: PermissionSetV2;
  /** Explicit access; owned drives need not be listed */
  drives?: DriveGrantRequestV2[];
  authorizedCircles?: string[];
  circleMemberPermissionGrant?: PermissionSetGrantRequestV2;
  ownedDrives?: OwnedDrive[];
  ownedCircles?: OwnedCircle[];
}

export interface AddOwnedResourcesRequest {
  ownedDrives?: OwnedDrive[];
  ownedCircles?: OwnedCircle[];
}

export interface UpdateAppPermissionsV2Request {
  permissionSet?: PermissionSetV2;
  drives?: DriveGrantRequestV2[];
}

export interface UpdateAuthorizedCirclesV2Request {
  authorizedCircles?: string[];
  circleMemberPermissionGrant?: PermissionSetGrantRequestV2;
}

/** Undefined/null leaves a field unchanged. */
export interface UpdateOwnedDriveRequest {
  allowAnonymousReads?: boolean;
  allowSubscriptions?: boolean;
  allowCdn?: boolean;
  isArchived?: boolean;
  metadata?: string;
  attributes?: Record<string, string>;
}

export interface AppRegistrationProblem {
  code: string;
  subject: string;
  message: string;
}

export interface DriveAccessEntry {
  targetDrive: TargetDriveV2;
  permission: DrivePermissionV2;
  driveName?: string | null;
  owningAppId?: string | null;
  owningAppName?: string | null;
}

export interface AppRegistrationDiff {
  drivesToCreate: OwnedDrive[];
  drivesAlreadyOwned: OwnedDrive[];
  circlesToCreate: OwnedCircle[];
  circlesAlreadyOwned: OwnedCircle[];
  /** The app's access afterwards */
  driveAccess: DriveAccessEntry[];
  driveAccessGained: DriveAccessEntry[];
  driveAccessLost: DriveAccessEntry[];
  permissionKeysGained: number[];
  permissionKeysLost: number[];
  authorizedCirclesAdded: string[];
  authorizedCirclesRemoved: string[];
}

export interface AppRegistrationValidationResult {
  isValid: boolean;
  /** false: install wording; true: update wording */
  isRegistered: boolean;
  problems: AppRegistrationProblem[];
  diff: AppRegistrationDiff;
}

export interface RedactedDriveGrantV2 {
  permissionedDrive: PermissionedDriveV2;
  hasStorageKey: boolean;
}

export interface RedactedExchangeGrantV2 {
  isRevoked: boolean;
  permissionSet?: PermissionSetV2 | null;
  driveGrants: RedactedDriveGrantV2[];
  hasIcrKey?: boolean;
}

/** The V1 RedactedAppRegistration shape, as V2 serializes it. */
export interface RedactedAppRegistrationV2 {
  appId: string;
  appSlug?: string | null;
  name: string;
  isRevoked: boolean;
  created: number;
  modified: number;
  grant: RedactedExchangeGrantV2;
  authorizedCircles?: string[] | null;
  circleMemberPermissionSetGrantRequest?: PermissionSetGrantRequestV2 | null;
  corsHostName?: string | null;
}

export interface OwnedDriveInfo {
  driveId: string;
  targetDrive: TargetDriveV2;
  name: string;
  driveSlug?: string | null;
  driveTypeSlug?: string | null;
  allowAnonymousReads: boolean;
  allowSubscriptions: boolean;
  allowCdn: boolean;
  ownerOnly: boolean;
  isArchived: boolean;
}

export interface RedactedCircleDefinitionV2 {
  id: string;
  name: string;
  description?: string | null;
  appId?: string | null;
  grantOn?: CircleGrantOnV2;
  designation?: CircleDesignationV2;
  emoji?: string | null;
  driveGrants?: DriveGrantRequestV2[] | null;
  permissions?: PermissionSetV2 | null;
  created?: number;
  lastUpdated?: number;
  disabled?: boolean;
}

export interface AppRegistrationV2 {
  registration: RedactedAppRegistrationV2;
  /** Built-in apps (and Mail); V2 cannot register or update these */
  isReserved: boolean;
  ownedDrives: OwnedDriveInfo[];
  ownedCircles: RedactedCircleDefinitionV2[];
  created: number;
}
