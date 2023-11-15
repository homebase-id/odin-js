import {
  TargetDrive,
  FileMetadata,
  ServerMetaData,
  ArchivalStatus,
  SystemFileType,
  EmbeddedThumb,
} from '../File/DriveFileTypes';

export interface PermissionedDrive {
  drive: TargetDrive;
  permission: DrivePermissionType[];
}

export enum DrivePermissionType {
  Read = 1,
  Write = 2,
  React = 4,
  Comment = 8,
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

export interface DriveDefinition {
  name: string;
  targetDriveInfo: TargetDrive;
  metadata: string;
  allowAnonymousReads: boolean;
  allowSubscriptions: boolean;
  ownerOnly: boolean;
}

export interface DriveSearchResult<T = string> {
  fileId: string;
  fileState: 'active';
  fileSystemType: SystemFileType;

  fileMetadata: FileMetadata<T>;
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  serverMetadata: ServerMetaData | undefined;

  priority: number;
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
}

export interface QueryParams {
  targetDrive: TargetDrive;
  fileType?: number | undefined;
  dataType?: number | undefined;
  tag?: string | undefined;
  userDate?: TimeRange;

  includeMetadataHeader?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface FileQueryParams {
  targetDrive: TargetDrive;
  fileType?: number[] | undefined;
  dataType?: number[] | undefined;
  fileState?: (0 | 1)[] | undefined;
  sender?: string[] | undefined;
  groupId?: string[] | undefined;
  userDate?: TimeRange;
  tagsMatchAtLeastOne?: string[] | undefined;
  tagsMatchAll?: string[] | undefined;
  globalTransitId?: string[] | undefined;
  clientUniqueIdAtLeastOne?: string[] | undefined;
  systemFileType?: SystemFileType;
  archivalStatus?: ArchivalStatus[];
}

export interface GetModifiedResultOptions {
  maxRecords: number;
  includeHeaderContent?: boolean;
  excludePreviewThumbnail?: boolean;
  maxDate?: number | undefined;
  cursor?: number | undefined;
}

export interface GetBatchQueryResultOptions {
  cursorState?: string | undefined;
  maxRecords: number;
  includeMetadataHeader?: boolean;
  sorting?: 'fileId' | 'userDate'; // default is 'fileId'
  ordering?: 'default' | 'newestFirst' | 'oldestFirst'; // default is 'default'
}

export interface QueryModifiedResponse {
  includeHeaderContent: boolean;
  cursor: number;
  searchResults: DriveSearchResult[];
}

export interface QueryBatchResponse {
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
  searchResults: DriveSearchResult[];
}

export interface QueryBatchResponseResult extends QueryBatchResponse {
  name: string;
}

export interface QueryBatchCollectionResponse {
  results: QueryBatchResponseResult[];
}

export interface TimeRange {
  start: number;
  end: number;
}
