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

export type DriveSharingModel = 'collaborative' | 'private' | 'selectiveShare' | 'unclassified';

/** The models an app may ask a new drive to be: absent means collaborative. */
export const REQUESTABLE_SHARING_MODELS = ['collaborative', 'private', 'selectiveShare'] as const;

/** Private and Selective Share drives hold their key the same way: the server has no copy it can open. */
export const isZeroKnowledgeSharingModel = (
  model: DriveSharingModel | null | undefined
): model is 'private' | 'selectiveShare' => model === 'private' || model === 'selectiveShare';

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
     * The app that owns this drive; absent means an owner drive that no app claims. Only served by
     * identity hosts that have the AppId column, so treat it as optional.
     */
    appId?: string | null;

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

    /**
     * Who holds which key (odin-core docs/zero-knowledge-drives.md). Every drive is Collaborative
     * until the browser converts it; only a converted drive is Private, so the label can be
     * trusted. Served to the owner, and not by every identity host, so treat it as optional.
     */
    sharingModel?: DriveSharingModel | null;

    /**
     * The drive key locked by the owner's zero-knowledge master key. Null until the browser converts
     * the drive. Served to the owner only.
     */
    zkMasterKeyEncryptedStorageKey?: string | null;

    /**
     * The drive's write-only private key (PKCS8), locked by the drive key: what opens a deposit.
     * Null until the browser converts the drive. Served to the owner only.
     */
    zkStorageKeyEncryptedWriteOnlyPrivateKey?: string | null;

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
