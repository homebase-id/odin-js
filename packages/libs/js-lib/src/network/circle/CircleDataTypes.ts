import { PermissionedDrive, PermissionSet } from '../../core/DriveData/Drive/DriveTypes';

export interface ConnectionRequestHeader {
  recipient: string;
  message: string;
  circleIds: string[];
}

export interface CircleNetworkNotification {
  targetSystemApi: number;
  notificationId: number;
}

export interface DotYouProfile {
  odinId: string;
}

export interface ActiveConnection extends DotYouProfile {
  status: 'connected';
  accessGrant: AccessGrant;
  created: number;
  lastUpdated: number;
  introducerOdinId?: string;
  connectionRequestOrigin: ConnectionRequestOrigin;
  hasVerificationHash: boolean;
  rku: boolean;
}

export interface CircleGrant {
  circleId: string;
  permissionSet: PermissionSet;
}
export interface AppGrant {
  appId: string;
  circleId: string;
  driveGrants: DriveGrant[];
  permissionSet: PermissionSet;
}

export interface AccessGrant {
  isRevoked: false;
  masterKeyEncryptedKeyStoreKey: unknown;
  circleGrants: CircleGrant[];
  appGrants: Record<string, AppGrant>;
}

export type ConnectionRequestOrigin = 'identityowner' | 'introduction' | 'identityownerapp';

export interface ConnectionInfo {
  status: 'none' | 'connected' | 'blocked';
  created: number;
  lastUpdated: number;
  accessGrant: AccessGrant;
  clientAccessTokenHalfKey: string;
  clientAccessTokenId: string;
  clientAccessTokenSharedSecret: string;
  connectionRequestOrigin: ConnectionRequestOrigin;
  introducerOdinId?: string;
}

export interface IncomingConnectionRequest {
  senderOdinId: string;
  receivedTimestampMilliseconds: number;
}

export interface ConnectionRequest extends Omit<IncomingConnectionRequest, 'status'> {
  id: string;
  status: 'pending' | 'sent';
  recipient: string;
  message: string;
  connectionRequestOrigin: ConnectionRequestOrigin;
  introducerOdinId?: string;
}

export interface ContactData {
  name?: string;
  imageId?: string;
}

export interface AcknowledgedConnectionRequest {
  recipientGivenName: string;
  recipientSurname: string;
  connectionRequestId: string;
  senderOdinId: string;
  senderPublicKeyCertificate: string;
  receivedTimestampMilliseconds: string;
}

/**
 * When the owning app wants members enrolled in a circle.
 * Mirrors CircleGrantOn in odin-core.
 */
export enum CircleGrantOn {
  /** Manual membership only. The default, and what every circle that predates this is. */
  None = 0,
  /** Granted at any connection establishment, ambient introductions included. */
  Connect = 1,
  /** Granted only when the connection is made through the owning app's own consent flow. */
  OwnFlowConnect = 2,
  /** Granted when the owner completes the connection review. */
  Review = 3,
}

/**
 * What kind of relationship a circle represents. Presentation only.
 * Mirrors CircleDesignation in odin-core.
 */
export enum CircleDesignation {
  Personal = 1,
  Audience = 2,
  Vendor = 3,
}

export interface CircleDefinition {
  id?: string;
  created?: number;
  lastUpdated?: number;
  name: string;
  description: string;
  disabled?: boolean;
  driveGrants?: DriveGrant[];
  permissions: {
    keys: number[];
  };

  /**
   * The app that owns this circle; undefined means an owner circle. Read-only in practice: the
   * server refuses to reassign ownership through an update, so that nobody who can PUT a
   * definition can hand a circle to an app.
   */
  appId?: string;

  /**
   * IMPORTANT: round-trip these when updating a circle. This same type is the update body, and
   * the server assigns grantOn, designation and emoji from whatever it receives -- so a PUT built
   * from a fetched definition that drops them resets them to their defaults. That would silently
   * take an ambient circle (grantOn: Connect) back to None and stop it being granted to
   * auto-connections, with no error.
   */
  grantOn?: CircleGrantOn;
  designation?: CircleDesignation;
  emoji?: string;
}

export interface DriveGrant {
  permissionedDrive: PermissionedDrive;

  /**
   * Whether the grant carries the drive's storage key, i.e. it can decrypt the drive rather than
   * only read what is anonymous. Served on app grants (RedactedDriveGrant); circle grants are
   * DriveGrantRequest and carry no such flag, so it is optional.
   */
  hasStorageKey?: boolean;
}

export interface AcceptRequestHeader {
  sender: string;
  circleIds: string[];
  permissions?: PermissionSet;
}

export interface OdinIdRequest {
  odinId: string;
}
