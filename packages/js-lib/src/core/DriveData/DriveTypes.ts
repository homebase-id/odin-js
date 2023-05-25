import {
  TargetDrive,
  FileMetadata,
  ServerMetaData,
  ArchivalStatus,
  SystemFileType,
} from './DriveFileTypes';

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

export interface DriveDefinition {
  name: string;
  targetDriveInfo: TargetDrive;
  metadata: string;
  allowAnonymousReads: boolean;
  allowSubscriptions: boolean;
  ownerOnly: boolean;
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
  archivalStatus?: ArchivalStatus[];
}

export interface GetModifiedResultOptions {
  maxRecords: number;
  includeJsonContent?: boolean;
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

export interface TimeRange {
  start: number;
  end: number;
}
