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

export type ConnectionRequestOrigin = 'identityowner' | 'introduction';

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
}

export interface DriveGrant {
  permissionedDrive: PermissionedDrive;
}

export interface AcceptRequestHeader {
  sender: string;
  circleIds: string[];
  permissions?: PermissionSet;
}

export interface OdinIdRequest {
  odinId: string;
}
