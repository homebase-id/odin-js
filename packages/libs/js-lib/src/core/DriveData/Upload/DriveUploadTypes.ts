import {
  TargetDrive,
  GlobalTransitIdFileIdentifier,
  EmbeddedThumb,
  ArchivalStatus,
  FileIdFileIdentifier,
  SystemFileType,
  UploadPayloadDescriptor,
  AccessControlList,
  EncryptedKeyHeader,
  KeyHeader,
  UpdatePayloadInstruction,
} from '../File/DriveFileTypes';

export interface BaseUploadInstructionSet {
  storageOptions: StorageOptions | null;
  transitOptions?: TransitOptions;
  transferIv?: Uint8Array;
  systemFileType?: SystemFileType;
}

export type UploadInstructionSet = BaseUploadInstructionSet;

export interface UpdateHeaderInstructionSet extends BaseUploadInstructionSet {
  storageIntent: 'header';
}

export const isUpdateHeaderInstructionSet = (
  instructionSet: unknown
): instructionSet is UpdateHeaderInstructionSet => {
  return (
    !!instructionSet &&
    typeof instructionSet === 'object' &&
    'storageIntent' in instructionSet &&
    instructionSet.storageIntent === 'header'
  );
};

export interface AppendInstructionSet extends Omit<BaseUploadInstructionSet, 'storageOptions'> {
  storageIntent: 'append';

  targetFile: FileIdFileIdentifier;
  versionTag: string | undefined;
}

export interface UpdatePeerInstructionSet extends Partial<BaseUploadInstructionSet> {
  file: GlobalTransitIdFileIdentifier;
  versionTag: string | undefined;

  locale: 'peer';
  recipients?: string[];
}

export interface UpdateLocalInstructionSet extends Partial<BaseUploadInstructionSet> {
  file: FileIdFileIdentifier;
  versionTag: string | undefined;

  locale: 'local';
  recipients?: string[];
}

export type UpdateInstructionSet = UpdatePeerInstructionSet | UpdateLocalInstructionSet;

export const isUpdateInstructionSet = (
  instructionSet: unknown
): instructionSet is UpdateInstructionSet => {
  return !!instructionSet && typeof instructionSet === 'object' && 'locale' in instructionSet;
};

export interface StorageOptions {
  drive: TargetDrive;
  overwriteFileId?: string;
  expiresTimestamp?: number;
  storageIntent?: 'metadataOnly'; // 'overwrite' is default
}

interface BaseTransitOptions {
  recipients: string[];
  isTransient?: boolean; // File is removed after it's received by all recipients
  schedule: ScheduleOptions;
  priority: PriorityOptions;
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
  SendLater = 'sendAsync',
}

export enum PriorityOptions {
  High = 1,
  Medium = 2,
  Low = 3,
}

export interface UploadFileDescriptor {
  encryptedKeyHeader?: EncryptedKeyHeader;
  fileMetadata: UploadFileMetadata;
}

export interface UploadFileMetadata {
  allowDistribution: boolean;
  isEncrypted: boolean;
  accessControlList?: AccessControlList;
  appData: UploadAppFileMetaData;
  referencedFile?: GlobalTransitIdFileIdentifier;
  versionTag?: string;
}

export interface UploadManifest {
  PayloadDescriptors?: UploadPayloadDescriptor[];
}

export interface UpdateManifest {
  PayloadDescriptors?: UpdatePayloadInstruction[];
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
  file: FileIdFileIdentifier;
  globalTransitIdFileIdentifier: GlobalTransitIdFileIdentifier;
  recipientStatus: { [key: string]: TransferUploadStatus };
  newVersionTag: string;
}

export interface AppendResult {
  newVersionTag: string;
}

export interface UpdateResult {
  newVersionTag: string;
  recipientStatus: { [key: string]: TransferUploadStatus };
}

export enum TransferUploadStatus {
  Enqueued = 'enqueued',
  EnqueuedFailed = 'enqueuedfailed',

  // Old statuses?
  DeliveredToInbox = 'deliveredtoinbox',
  DeliveredToTargetDrive = 'deliveredtotargetdrive',
  PendingRetry = 'pendingretry',
  TotalRejectionClientShouldRetry = 'totalrejectionclientshouldretry',
  FileDoesNotAllowDistribution = 'filedoesnotallowdistribution',
  RecipientReturnedAccessDenied = 'recipientreturnedaccessdenied',
  RecipientDoesNotHavePermissionToFileAcl = 'recipientdoesnothavepermissiontofileacl',
}