import { ParsedReactionPreview, ReactionPreview } from './DriveFileReactionTypes';

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
  reactionPreview?: ReactionPreview | ParsedReactionPreview;
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
  Owner = 'owner',
}

export interface ServerMetaData {
  doNotIndex: boolean;
  allowDistribution: boolean;
  accessControlList: AccessControlList;
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
}

export interface PayloadFile {
  key: string;
  payload: File | Blob;
  descriptorContent?: string;
}

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

export interface ExternalFileIdentifier {
  fileId: string;
  targetDrive: TargetDrive;
}

export interface GlobalTransitIdFileIdentifier {
  globalTransitId: string;
  targetDrive: TargetDrive;
}

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
  iv: Uint8Array | undefined;
}

export interface ThumbnailDescriptor extends ImageSize {
  contentType: ContentType;
}

export interface UploadPayloadDescriptor {
  payloadKey: string;
  descriptorContent: string | undefined;
  thumbnails?: UploadThumbnailDescriptor[];
  iv: Uint8Array | undefined;
}

export interface UploadThumbnailDescriptor extends ImageSize {
  thumbnailKey: string;
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

interface BaseDriveSearchResult<T = string> {
  fileId: string;

  fileSystemType: SystemFileType;

  fileMetadata: FileMetadata<T>;
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  serverMetadata: ServerMetaData | undefined;

  priority: number;
}

export interface DriveSearchResult<T = string> extends BaseDriveSearchResult<T> {
  fileState: 'active';
}

export interface DeletedDriveSearchResult<T = string> extends BaseDriveSearchResult<T> {
  fileState: 'deleted';
}

export interface NewDriveSearchResult<T = string> {
  fileId?: string;

  fileSystemType?: SystemFileType;

  fileMetadata: NewFileMetadata<T>;
  serverMetadata: Omit<ServerMetaData, 'doNotIndex' | 'allowDistribution'> | undefined;
}

export interface NewFileMetadata<T = string> {
  contentType?: string;
  appData: NewAppFileMetaData<T>;
  versionTag?: string;
}

export interface NewAppFileMetaData<T = string> {
  content: T;
  previewThumbnail?: EmbeddedThumb;
  fileType?: number;
  userDate?: number;
  uniqueId?: string;
  groupId?: string;
}
