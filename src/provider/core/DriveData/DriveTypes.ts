import { AccessControlList, SystemFileType } from './DriveUploadTypes';

export interface PermissionedDrive {
  drive: TargetDrive;
  permission: DrivePermissions;
}

export enum DrivePermissions {
  None = 0,
  Read = 1,
  Write = 2,
  React = 4,
  ReadWrite = Read | Write | React,
  All = ReadWrite,
}

export interface PermissionSet {
  keys: number[];
}

export interface EncryptedKeyHeader {
  encryptionVersion: number;
  type: number; //value is always 11
  iv: Uint8Array;
  encryptedAesKey: Uint8Array;
}

export interface KeyHeader {
  iv: Uint8Array;
  aesKey: Uint8Array;
}

// export interface EncryptedClientFileHeader {
//   encryptedKeyHeader: EncryptedKeyHeader;
//   fileMetadata: FileMetadata;
// }

export interface FileMetadata {
  created: number;
  globalTransitId?: string;
  updated: number;
  contentType: string;
  payloadIsEncrypted: boolean;
  senderOdinId: string;
  payloadSize: number;
  originalRecipientList: string[];
  appData: AppFileMetaData;
  reactionPreview?: ReactionPreview;
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

export interface ThumbSize extends ImageSize {
  contentType: ImageContentType;
}

// Thumb that gets embedded; E.g: previewThumbnail
export interface EmbeddedThumb extends ThumbSize {
  content: string;
}

// Thumb that gets appended; E.g: additionalThumbnails
export interface ThumbnailFile extends ThumbSize {
  payload: Uint8Array;
}

export interface AppFileMetaData {
  fileType: number;
  dataType: number;
  groupId?: string;
  userDate?: number;
  tags: string[] | null;
  uniqueId?: string;
  contentIsComplete: boolean;
  jsonContent: string;
  previewThumbnail?: EmbeddedThumb;
  additionalThumbnails?: ThumbSize[];
}

export interface ExternalFileIdentifier {
  fileId: string;
  targetDrive: TargetDrive;
}

export interface GlobalTransitIdFileIdentifier {
  globalTransitId: string;
  targetDrive: TargetDrive;
}

export interface DriveDefinition {
  name: string;
  targetDriveInfo: TargetDrive;
  // alias: string;
  // type: string;
  metadata: string;
  // isReadonly: boolean;
  allowAnonymousReads: boolean;

  allowSubscriptions: boolean;

  ownerOnly: boolean;
}

export interface ReactionPreview {
  comments: {
    odinId: string;
    jsonContent: string;
    reactions: { key: string; count: string; reactionContent: string }[];
  }[];
  reactions: Record<string, { key: string; count: string; reactionContent: string }>;
  totalCommentCount: number;
}

export interface DriveSearchResult {
  fileId: string;
  fileState: 'active';
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  fileMetadata: FileMetadata;
  serverMetadata: ServerMetaData;
  priority: number;
}

export interface QueryParams {
  targetDrive: TargetDrive;
  fileType?: number | undefined;
  dataType?: number | undefined;
  tag?: string | undefined;
  userDate?: TimeRange;

  //specifies if the DriveSearchResult.jsonContent field should be parsed as JSON
  includeMetadataHeader?: boolean;
  includePayload?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface FileQueryParams {
  targetDrive: TargetDrive;
  fileType?: number[] | undefined;
  dataType?: number[] | undefined;
  sender?: string[] | undefined;
  groupId?: string[] | undefined;
  userDate?: TimeRange;
  tagsMatchAtLeastOne?: string[] | undefined;
  tagsMatchAll?: string[] | undefined;
  globalTransitId?: string[] | undefined;
  clientUniqueIdAtLeastOne?: string[] | undefined;
  systemFileType?: SystemFileType;
}

export interface GetModifiedResultOptions {
  maxRecords: number;
  includeJsonContent?: boolean;
  excludePreviewThumbnail?: boolean;
  maxDate?: number | undefined;
  cursor?: number | undefined;
}

export interface GetBatchQueryResultOptions {
  /// <summary>
  /// Base64 encoded value of the cursor state used when paging/chunking through records.
  /// </summary>
  cursorState?: string | undefined;
  maxRecords: number;
  includeMetadataHeader?: boolean;
}

export interface QueryModifiedResponse {
  includeJsonContent: boolean;
  cursor: number;
  searchResults: DriveSearchResult[];
}

export interface QueryBatchResponse {
  cursorState: string;
  includeMetadataHeader: boolean;
  searchResults: DriveSearchResult[];
}

export interface QueryBatchResponseResult extends QueryBatchResponse {
  name: string;
}

export interface QueryBatchCollectionResponse {
  results: QueryBatchResponseResult[];
}

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

export type ImageContentType =
  | 'image/webp'
  | 'image/png'
  | 'image/bmp'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/svg+xml';
