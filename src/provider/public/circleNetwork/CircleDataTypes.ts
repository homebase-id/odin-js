import { PermissionedDrive, PermissionSet } from '../../core/DriveData/DriveTypes';

export interface ConnectionRequestHeader {
  contactData: ContactData;
  recipient: string;
  message: string;
  circleIds: string[];
}

export interface CircleNetworkNotification {
  targetSystemApi: number;
  notificationId: number;
}

export interface DotYouProfile {
  dotYouId: string;
  originalContactData: ContactData;
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

export interface ConnectionInfo {
  status: 'none' | 'connected' | 'blocked';
  created: number;
  lastUpdated: number;
  accessGrant: AccessGrant;
  clientAccessTokenHalfKey: string;
  clientAccessTokenId: string;
  clientAccessTokenSharedSecret: string;
  originalContactData?: ContactData;
}

export interface ConnectionRequest {
  id: string;
  status: 'pending' | 'sent';
  recipient: string;
  message: string;
  senderDotYouId: string;
  receivedTimestampMilliseconds: number;
  contactData?: ContactData;
}

export interface ContactData {
  name?: string;
  imageId?: string;
}

export interface AcknowledgedConnectionRequest {
  recipientGivenName: string;
  recipientSurname: string;
  connectionRequestId: string;
  senderDotYouId: string;
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
  permissionsKey: {
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
  contactData: ContactData;
}

export interface DotYouIdRequest {
  dotYouId: string;
}
