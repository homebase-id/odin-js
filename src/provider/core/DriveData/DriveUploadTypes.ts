import {
  ExternalFileIdentifier,
  EncryptedKeyHeader,
  TargetDrive,
  ThumbSize,
  EmbeddedThumb,
} from './DriveTypes';

export interface UploadInstructionSet {
  transferIv: Uint8Array;
  storageOptions: StorageOptions | null;
  transitOptions: TransitOptions | null;
}

export interface StorageOptions {
  drive: TargetDrive;
  overwriteFileId?: string | null;
  expiresTimestamp?: number | null;
}

export interface TransitOptions {
  recipients: string[];
}

export interface UploadFileDescriptor {
  encryptedKeyHeader?: EncryptedKeyHeader;
  fileMetadata: UploadFileMetadata;
}

export interface UploadFileMetadata {
  contentType: string;
  senderDotYouId?: string;
  payloadIsEncrypted: boolean;
  accessControlList?: AccessControlList;
  appData: UploadAppFileMetaData;
}

export interface AccessControlList {
  requiredSecurityGroup: SecurityGroupType;
  circleIdList?: string[] | null;
  dotYouIdentityList?: string[] | null;
}

export enum SecurityGroupType {
  Anonymous = 'anonymous',
  Authenticated = 'authenticated',
  Connected = 'connected',
  Owner = 'owner',
}

export interface UploadAppFileMetaData {
  tags: string[] | null;
  groupId?: string;
  uniqueId?: string;
  fileType?: number;
  dataType?: number;
  userDate?: number;
  contentIsComplete: boolean;
  jsonContent: string | null;
  previewThumbnail?: EmbeddedThumb;
  additionalThumbnails?: ThumbSize[];
  alias?: string;
}

export interface UploadResult {
  encryptedPayload: Uint8Array;
  encryptedKeyHeader: Uint8Array;
  file: ExternalFileIdentifier;
  recipientStatus: { [key: string]: TransferStatus };
}

export enum TransferStatus {
  AwaitingTransferKey = 1,
  TransferKeyCreated = 3,
  Delivered = 5,
  PendingRetry = 8,
}
