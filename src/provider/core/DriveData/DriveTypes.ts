import { AccessControlList } from '../TransitData/TransitTypes';
import { Guid } from 'guid-typescript';

export interface SecuredFileContent<TPayload> {
  driveId: Guid | null;
  fileId: Guid | null;
  tags: string[];
  accessControlList: AccessControlList;
  content: TPayload;
}

export enum DrivePermissions {
  None = 0,
  Read = 1,
  Write = 2,
  ReadWrite = Read | Write,
  All = ReadWrite,
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

export interface EncryptedClientFileHeader {
  encryptedKeyHeader: EncryptedKeyHeader;
  fileMetadata: FileMetadata;
}

export interface UnencryptedFileHeader {
  keyHeader: KeyHeader;
  metadata: FileMetadata;
}

export interface FileMetadata {
  file: ExternalFileIdentifier;
  created: number;
  updated: number;
  contentType: string;
  payloadIsEncrypted: boolean;
  appData: AppFileMetaData;
}

export interface AppFileMetaData {
  fileType: number;
  tags: string[] | null;
  contentIsComplete: boolean;
  jsonContent: string;
}

export interface ExternalFileIdentifier {
  fileId: string;
  targetDrive: TargetDrive;
}

export interface DriveDefinition {
  name: string;
  alias: string;
  metadata: string;
  type: string;
  allowAnonymousReads: boolean;
  isReadonly: boolean;
}

export interface DriveSearchResult<TJsonContent> {
  fileId: string;
  tags: string[] | null;
  fileType: number;
  contentIsComplete: boolean;
  payloadIsEncrypted: boolean;
  jsonContent: TJsonContent;
  createdTimestamp: number;
  senderDotYouId: string | null;
  lastUpdatedTimestamp: number;
  accessControlList: AccessControlList;
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
  userDate?: TimeRange;
  threadId?: string[] | undefined; //list of base64 encoded byte arrays
  sender?: string[] | undefined; //list of base64 encoded byte arrays
  tagsMatchAtLeastOne?: string[] | undefined; //list of base64 encoded byte arrays
  tagsMatchAll?: string[] | undefined; //list of base64 encoded byte arrays
}

export interface GetRecentResultOptions {
  maxDate?: number | undefined;
  cursor?: number | undefined;
  maxRecords: number;
  includeMetadataHeader?: boolean;
}

export interface GetBatchQueryResultOptions {
  /// <summary>
  /// Base64 encoded value of the cursor state used when paging/chunking through records.
  /// </summary>
  cursorState?: string | undefined;
  maxRecords: number;
  includeMetadataHeader?: boolean;
}

export interface QueryRecentResponse<T> {
  cursorState: number;
  includeMetadataHeader: boolean;
  searchResults: DriveSearchResult<T>[];
}

export interface QueryBatchResponse<T> {
  cursorState: string;
  includeMetadataHeader: boolean;
  searchResults: DriveSearchResult<T>[];
}

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface TimeRange {
  start: number;
  end: number;
}
