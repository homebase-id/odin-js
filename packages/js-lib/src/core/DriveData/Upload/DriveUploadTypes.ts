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
  KeyHeader,
} from '../File/DriveFileTypes';

export interface UploadInstructionSet {
  storageOptions: StorageOptions | null;
  transitOptions?: TransitOptions;
  transferIv?: Uint8Array;
  systemFileType?: SystemFileType;
}

export interface AppendInstructionSet {
  targetFile: {
    fileId: string;
    targetDrive: TargetDrive;
  };
  versionTag: string | undefined;
  systemFileType?: SystemFileType;
}

export interface StorageOptions {
  drive: TargetDrive;
  overwriteFileId?: string;
  expiresTimestamp?: number;
  storageIntent?: 'metadataOnly'; // 'overwrite' is default
}

interface BaseTransitOptions {
  recipients: string[];
  isTransient?: boolean; // File is removed after it's received by all recipients
  useGlobalTransitId?: boolean | undefined;
  schedule: ScheduleOptions;
  sendContents: SendContents;
  remoteTargetDrive?: TargetDrive;
}

export interface PushNotificationOptions {
  appId: string;
  typeId: string;
  tagId: string;
  silent: boolean;
  unEncryptedMessage?: string;
}

interface TransitOptionsWithoutNotifications extends BaseTransitOptions {
  useAppNotification?: false;
}

interface TransitOptionsWithNotifications extends BaseTransitOptions {
  useAppNotification: true;
  appNotificationOptions: PushNotificationOptions;
}

export type TransitOptions = TransitOptionsWithoutNotifications | TransitOptionsWithNotifications;

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
  tags?: string[];
  fileType?: number;
  dataType?: number;
  userDate?: number;
  groupId?: string;
  archivalStatus?: ArchivalStatus;
  content?: string;
  previewThumbnail?: EmbeddedThumb;
}

export interface UploadResult {
  keyHeader: KeyHeader | undefined;
  file: ExternalFileIdentifier;
  globalTransitIdFileIdentifier: GlobalTransitIdFileIdentifier;
  recipientStatus: { [key: string]: TransferStatus };
  newVersionTag: string;
}

export interface AppendResult {
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
