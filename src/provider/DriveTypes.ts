export interface EncryptedKeyHeader {
    EncryptionVersion: number,
    Type: number //value is always 11
    Iv: Uint8Array
    EncryptedAesKey: Uint8Array
}

export interface KeyHeader {
    iv: Uint8Array
    aesKey: Uint8Array
}

export interface EncryptedClientFileHeader {
    encryptedKeyHeader: EncryptedKeyHeader,
    fileMetadata: FileMetadata,
}

export interface UnencryptedFileHeader {
    keyHeader: KeyHeader,
    metadata: AppFileMetaData
}

export interface FileMetadata {
    file: DriveFileId,
    created: number,
    updated: number,
    contentType: string,
    AppData: AppFileMetaData
}

export interface AppFileMetaData {
    fileType: number,
    tags: string[] | null,
    contentIsComplete: boolean
    jsonContent: string
}

export interface DriveFileId {
    fileId: string,
    driveId: string
}

export interface DriveSearchResult<TJsonContent> {
    fileId: string,
    tags: string[] | null,
    fileType: number,
    contentIsComplete: boolean,
    payloadIsEncrypted: boolean,
    jsonContent: TJsonContent
    createdTimestamp: number,
    senderDotYouId: string | null
    lastUpdatedTimestamp: number,
    payloadSize: number,
    payloadTooLarge: boolean,
    payloadContent: string
}

export interface QueryParams {
    fileType?: number | undefined,
    tag?: string | undefined,
    includeMetadataHeader?: boolean,
    includePayload?: boolean,
    pageNumber: number,
    pageSize: number
}