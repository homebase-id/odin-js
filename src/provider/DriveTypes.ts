export interface EncryptedKeyHeader {
    EncryptionVersion: number,
    Type: number //value is always 11
    Iv: Uint8Array
    EncryptedAesKey: Uint8Array
}

export interface KeyHeader {
    Iv: Uint8Array
    AesKey: Uint8Array
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
    FileType: number,
    CategoryId: string
    ContentIsComplete: boolean
    JsonContent: string
}

export interface DriveFileId {
    fileId: string,
    driveId: string
}

export interface SearchResult<TJsonContent> {
    fileId: string,
    createdTimestamp: number,
    lastUpdatedTimestamp: number,
    fileType: number,
    categoryId: number | null,
    contentIsComplete: boolean,
    jsonContent: TJsonContent
}
