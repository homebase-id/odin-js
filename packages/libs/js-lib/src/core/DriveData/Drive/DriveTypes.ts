import {
    TargetDrive,
    ArchivalStatus,
    SystemFileType,
    HomebaseFile,
    DeletedHomebaseFile,
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

export interface DriveDefinition {
    driveId: string;
    name: string;

    /**
     * The drive's wire address. Not served by every identity host, so treat it as optional.
     */
    driveSlug?: string | null;

    /**
     * The address of the drive's type, shared by every drive of that type. Not served by every
     * identity host, so treat it as optional.
     */
    driveTypeSlug?: string | null;

    /**
     * The drive's write-only public key (JWK). This is the half a remote caller seals a deposit to;
     * the private half never leaves the identity host. Null on a drive that has no keypair, and not
     * served by every identity host, so treat it as optional.
     */
    writeOnlyPublicKeyJwk?: string | null;

    /**
     * CRC32C of the public key -- a short fingerprint for showing which key a drive holds without
     * printing the whole JWK.
     */
    writeOnlyPublicKeyCrc32?: number | null;

    targetDriveInfo: TargetDrive;
    metadata: string;
    allowAnonymousReads: boolean;
    allowSubscriptions: boolean;
    allowCdn: boolean;
    ownerOnly: boolean;
    isArchived: boolean;
    isSystemDrive: boolean;
    attributes: { [key: string]: string };
}

export interface QueryParams {
    targetDrive: TargetDrive;
    fileType?: number | undefined;
    dataType?: number | undefined;
    tag?: string | undefined;
    userDate?: TimeRange;

    //specifies if the HomebaseFile.content field should be parsed as JSON
    includeMetadataHeader?: boolean;
    includeTransferHistory?: boolean;
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
    userDateStart?: number | undefined;
    userDateEnd?: number | undefined;
    tagsMatchAtLeastOne?: string[] | undefined;
    tagsMatchAll?: string[] | undefined;
    localTagsMatchAtLeastOne?: string[] | undefined;
    localTagsMatchAll?: string[] | undefined;
    globalTransitId?: string[] | undefined;
    clientUniqueIdAtLeastOne?: string[] | undefined;
    systemFileType?: SystemFileType;
    archivalStatus?: ArchivalStatus[];
}

export interface GetModifiedResultOptions {
    maxRecords: number;
    includeHeaderContent?: boolean;
    includeTransferHistory?: boolean;
    excludePreviewThumbnail?: boolean;
    maxDate?: number | undefined;
    cursor?: string | undefined;
}

export interface GetBatchQueryResultOptions {
    cursorState?: string | undefined;
    maxRecords: number;
    includeMetadataHeader?: boolean;
    includeTransferHistory?: boolean;
    sorting?: 'fileId' | 'userDate' | 'createdDate' | 'anyChangeDate' | 'onlyModifiedDate' // default is 'fileId'
    ordering?: 'default' | 'newestFirst' | 'oldestFirst'; // default is 'default'
}

export interface QueryModifiedResponse {
    includeHeaderContent: boolean;
    cursor: unknown;
    searchResults: (HomebaseFile | DeletedHomebaseFile)[];
}

export interface QueryBatchResponse {
    cursorState: string;
    queryTime: number;
    includeMetadataHeader: boolean;
    searchResults: HomebaseFile[];
}

export interface QueryBatchResponseWithDeletedResults {
    cursorState: string;
    queryTime: number;
    includeMetadataHeader: boolean;
    searchResults: (HomebaseFile | DeletedHomebaseFile)[];
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
