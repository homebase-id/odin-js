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
    targetDriveInfo: TargetDrive;
    metadata: string;
    allowAnonymousReads: boolean;
    allowSubscriptions: boolean;
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
