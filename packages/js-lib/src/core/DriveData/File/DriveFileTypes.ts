import { ReactionPreview } from './DriveFileReactionTypes';

export type SystemFileType = 'Standard' | 'Comment';

export interface FileMetadata<T = string> {
  created: number;
  updated: number;
  transitCreated?: number;
  transitUpdated?: number;

  globalTransitId?: string;
  isEncrypted: boolean;
  senderOdinId: string;
  appData: AppFileMetaData<T>;
  reactionPreview?: ReactionPreview;
  versionTag: string;

  payloads: PayloadDescriptor[];
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
  AutoConnected = 'autoconnected',
  // ConfirmConnected = 'confirmconnected', // Attempted to rename to this.. But failed on the BE
  Owner = 'owner',
}

export enum TransferStatus {
  Delivered = 'delivered',
  RecipientIdentityReturnedAccessDenied = 'recipientidentityreturnedaccessdenied',
  SourceFileDoesNotAllowDistribution = 'sourcefiledoesnotallowdistribution',
  RecipientServerNotResponding = 'recipientservernotresponding',
  RecipientIdentityReturnedServerError = 'recipientidentityreturnedservererror',
  RecipientIdentityReturnedBadRequest = 'recipientidentityreturnedbadrequest',
  UnknownServerError = 'unknownservererror',
}

export const FailedTransferStatuses = [
  TransferStatus.RecipientIdentityReturnedAccessDenied,
  TransferStatus.SourceFileDoesNotAllowDistribution,
  TransferStatus.RecipientServerNotResponding,
  TransferStatus.RecipientIdentityReturnedServerError,
  TransferStatus.RecipientIdentityReturnedBadRequest,
  TransferStatus.UnknownServerError,
];

export interface RecipientTransferHistory {
  lastUpdated: number;
  latestTransferStatus: TransferStatus;
  isInOutbox: string;
  latestSuccessfullyDeliveredVersionTag: string | null;
  isReadByRecipient: boolean;
}

export interface ServerMetaData {
  doNotIndex: boolean;
  allowDistribution: boolean;
  accessControlList: AccessControlList;
  transferHistory?: {
    recipients: { [key: string]: RecipientTransferHistory };
  };
}

export interface ImageSize {
  pixelHeight: number;
  pixelWidth: number;
}

// Thumb that gets embedded; E.g: previewThumbnail
export interface EmbeddedThumb extends ImageSize {
  contentType: ContentType;
  content: string;
}

// Thumb that gets appended; E.g: additionalThumbnails
export interface ThumbnailFile extends ImageSize {
  key: string;
  payload: File | Blob;
  skipEncryption?: boolean;
}

export interface BasePayloadFile {
  key: string;
  payload: File | Blob;
  previewThumbnail?: EmbeddedThumb;
  descriptorContent?: string;
  skipEncryption?: boolean;
}

export interface PayloadFileWithRegularEncryption extends BasePayloadFile {
  skipEncryption?: false | undefined;
}

export interface PayloadFileWithManualEncryption extends BasePayloadFile {
  // Options to skip encryption for payloads and hav it handled outside
  skipEncryption: true;
  iv: Uint8Array;
}

export type PayloadFile = PayloadFileWithRegularEncryption | PayloadFileWithManualEncryption;

type None = 0;
type Archived = 1;
type Removed = 2;

export type ArchivalStatus = None | Archived | Removed | number;

export interface AppFileMetaData<T = string> {
  fileType: number;
  dataType: number;
  groupId?: string;
  userDate?: number;
  tags?: string[];
  uniqueId?: string;
  content: T;
  previewThumbnail?: EmbeddedThumb;
  archivalStatus?: ArchivalStatus;
}
interface BaseFileIdentifier {
  targetDrive: TargetDrive;
}
export interface FileIdFileIdentifier extends BaseFileIdentifier {
  fileId: string;
}
export interface GlobalTransitIdFileIdentifier extends BaseFileIdentifier {
  globalTransitId: string;
}
export interface UniqueIdFileIdentifier extends BaseFileIdentifier {
  uniqueId: string;
}

export type FileIdentifier =
  | FileIdFileIdentifier
  | GlobalTransitIdFileIdentifier
  | UniqueIdFileIdentifier;

export type ImageContentType =
  | 'image/webp'
  | 'image/png'
  | 'image/bmp'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/svg+xml';

export type ContentType = ImageContentType | string;

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface PayloadDescriptor {
  key: string;
  descriptorContent: string | undefined;
  contentType: ContentType;
  bytesWritten: number;
  lastModified: number;
  thumbnails: ThumbnailDescriptor[];
  previewThumbnail: EmbeddedThumb | undefined;
  iv: Uint8Array | undefined;
}

export interface ThumbnailDescriptor extends ImageSize {
  contentType: ContentType;
}

export interface UploadPayloadDescriptor {
  payloadKey: string;
  descriptorContent: string | undefined;
  thumbnails?: UploadThumbnailDescriptor[];
  previewThumbnail?: EmbeddedThumb;
  contentType: ContentType;
  iv: Uint8Array | undefined;
}

export interface UploadThumbnailDescriptor extends ImageSize {
  thumbnailKey: string;
}

// Management of media files; New uploads and existing payloadDescriptor
export interface MediaFile {
  fileId?: string | undefined;
  key: string;
  contentType: ContentType;
}

export interface NewMediaFile {
  key?: string;
  file: File | Blob;
  thumbnail?: ThumbnailFile;
}

export interface KeyHeader {
  iv: Uint8Array;
  aesKey: Uint8Array;
}

export interface EncryptedKeyHeader {
  encryptionVersion: number;
  type: number; //value is always 11
  iv: Uint8Array;
  encryptedAesKey: Uint8Array;
}

interface BaseHomebaseFile<T = string> {
  fileId: string;

  fileSystemType: SystemFileType;

  fileMetadata: FileMetadata<T>;
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  serverMetadata: ServerMetaData | undefined;

  priority: number;
}

export interface HomebaseFile<T = string> extends BaseHomebaseFile<T> {
  fileState: 'active';
}

export interface DeletedHomebaseFile<T = string> extends BaseHomebaseFile<T> {
  fileState: 'deleted';
}

export interface NewHomebaseFile<T = string>
  extends Omit<Partial<BaseHomebaseFile<T>>, 'fileMetadata' | 'serverMetadata'> {
  fileMetadata: NewFileMetadata<T>;
  serverMetadata: Omit<ServerMetaData, 'doNotIndex' | 'allowDistribution'> | undefined;
}

export interface NewFileMetadata<T = string>
  extends Omit<Partial<FileMetadata<T>>, 'appData' | 'payloads'> {
  appData: NewAppFileMetaData<T>;
  payloads?: NewPayloadDescriptor[];
}

export interface NewAppFileMetaData<T = string> extends Partial<AppFileMetaData<T>> {
  content: T;
}

export interface NewPayloadDescriptor extends Partial<PayloadDescriptor> {
  pendingFile?: File | Blob;
  uploadProgress?: { phase?: string; progress?: number };
}
