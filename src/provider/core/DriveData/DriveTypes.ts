import { AccessControlList } from '../TransitData/TransitTypes';
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

// export interface EncryptedClientFileHeader {
//   encryptedKeyHeader: EncryptedKeyHeader;
//   fileMetadata: FileMetadata;
// }

export interface FileMetadata {
  file: ExternalFileIdentifier;
  created: number;
  updated: number;
  contentType: string;
  payloadIsEncrypted: boolean;
  senderDotYouId: boolean;
  payloadSize: number;
  originalRecipientList: string[];
  appData: AppFileMetaData;
}

export interface ServerMetaData {
  accessControlList: AccessControlList;
}

export interface ThumbSize {
  contentType: string;
  pixelHeight: number;
  pixelWidth: number;
}

export interface EmbeddedThumb extends ThumbSize {
  content: string;
}

export interface AppFileMetaData {
  fileType: number;
  tags: string[] | null;
  contentIsComplete: boolean;
  jsonContent: string;
  previewThumbnail?: EmbeddedThumb;
  additionalThumbnails?: ThumbSize[];
}

export interface ExternalFileIdentifier {
  fileId: string;
  targetDrive: TargetDrive;
}

export interface DriveDefinition {
  name: string;
  targetDriveInfo: TargetDrive;
  // alias: string;
  // type: string;
  metadata: string;
  isReadonly: boolean;
  allowAnonymousReads: boolean;
}

export interface DriveSearchResult {
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  fileMetadata: FileMetadata;
  serverMetadata: ServerMetaData;
  priority: number;
}

// TODO: replace with regular DriveSearchResult without generic?
// export interface UnencryptedFileHeader {
//   sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
//   fileMetadata: FileMetadata;
//   serverMetadata: ServerMetaData;
//   priority: number;
// }

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
  sender?: string[] | undefined; //list of base64 encoded byte arrays
  threadId?: string[] | undefined; //list of base64 encoded byte arrays
  userDate?: TimeRange;
  tagsMatchAtLeastOne?: string[] | undefined; //list of base64 encoded byte arrays
  tagsMatchAll?: string[] | undefined; //list of base64 encoded byte arrays
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

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface TimeRange {
  start: number;
  end: number;
}
