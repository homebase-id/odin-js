import {
  TargetDrive,
  GlobalTransitIdFileIdentifier,
  EmbeddedThumb,
  ArchivalStatus,
  ExternalFileIdentifier,
  SystemFileType,
  UploadPayloadDescriptor,
  AccessControlList,
  EncryptedKeyHeader,
} from '../File/DriveFileTypes';

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
  isEncrypted: boolean;
  accessControlList?: AccessControlList;
  appData: UploadAppFileMetaData;
  referencedFile?: GlobalTransitIdFileIdentifier;
  versionTag?: string;
}

export interface UploadManifest {
  PayloadDescriptors?: UploadPayloadDescriptor[];
}

export interface UploadAppFileMetaData {
  uniqueId?: string;
  tags: string[] | null;
  fileType?: number;
  dataType?: number;
  userDate?: number;
  groupId?: string;
  archivalStatus?: ArchivalStatus;
  content: string | null;
  previewThumbnail?: EmbeddedThumb;
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
