import {
  TargetDrive,
  ThumbSize,
  GlobalTransitIdFileIdentifier,
  EmbeddedThumb,
  ArchivalStatus,
  ExternalFileIdentifier,
  SystemFileType,
} from '../File/DriveFileTypes';
import { EncryptedKeyHeader } from '../Drive/DriveTypes';

export interface UploadInstructionSet {
  transferIv: Uint8Array;
  storageOptions: StorageOptions | null;
  transitOptions: TransitOptions | null;
  systemFileType?: SystemFileType;
}

export interface AppendInstructionSet {
  targetFile: {
    fileId: string;
    targetDrive: TargetDrive;
  };
  thumbnails?: ThumbSize[];
  systemFileType?: SystemFileType;
}

export interface StorageOptions {
  drive: TargetDrive;
  overwriteFileId?: string | null;
  expiresTimestamp?: number | null;
  storageIntent?: 'metadataOnly'; // 'overwrite' is default
}

export interface TransitOptions {
  recipients: string[];
  isTransient?: boolean; // File is removed after it's received by all recipients
  useGlobalTransitId?: boolean | undefined;
  schedule: ScheduleOptions;
  sendContents: SendContents;
  remoteTargetDrive?: TargetDrive;
}

export enum SendContents {
  HeaderOnly = 0,
  Thumbnails = 1,
  Payload = 2,
  All = Thumbnails | Payload,
}

export enum ScheduleOptions {
  SendNowAwaitResponse = 'sendNowAwaitResponse',
  SendLater = 'sendLater',
}

export interface UploadFileDescriptor {
  encryptedKeyHeader?: EncryptedKeyHeader;
  fileMetadata: UploadFileMetadata;
}

export interface UploadFileMetadata {
  allowDistribution: boolean;
  senderOdinId?: string;
  payloadIsEncrypted: boolean;
  accessControlList?: AccessControlList;
  appData: UploadAppFileMetaData;
  referencedFile?: GlobalTransitIdFileIdentifier;
  versionTag?: string;
}

export interface AccessControlList {
  requiredSecurityGroup: SecurityGroupType;
  circleIdList?: string[] | null;
  odinIdList?: string[] | null;
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
  archivalStatus?: ArchivalStatus;
}

export interface UploadResult {
  encryptedPayload: Uint8Array;
  encryptedKeyHeader: Uint8Array;
  file: ExternalFileIdentifier;
  globalTransitIdFileIdentifier: GlobalTransitIdFileIdentifier;
  recipientStatus: { [key: string]: TransferStatus };
  newVersionTag: string;
}

export enum TransferStatus {
  AwaitingTransferKey = 'awaitingtransferkey',
  TransferKeyCreated = 'transferkeycreated',
  DeliveredToInbox = 'deliveredtoinbox',
  DeliveredToTargetDrive = 'deliveredtotargetdrive',
  PendingRetry = 'pendingretry',
  TotalRejectionClientShouldRetry = 'totalrejectionclientshouldretry',
  FileDoesNotAllowDistribution = 'filedoesnotallowdistribution',
  RecipientReturnedAccessDenied = 'recipientreturnedaccessdenied',
}
