import {DriveFileId, EncryptedKeyHeader} from './DriveTypes';

export interface UploadInstructionSet {
    TransferIv: Uint8Array,
    StorageOptions: StorageOptions | null,
    TransitOptions: TransitOptions | null
}

export interface StorageOptions {
    DriveId?: string | null,
    OverwriteFileId?: string | null,
    ExpiresTimestamp?: number | null
}

export interface TransitOptions {
    Recipients: string[]
}

export interface UploadFileDescriptor {
    EncryptedKeyHeader: EncryptedKeyHeader
    FileMetadata: UploadFileMetadata
}

export interface UploadFileMetadata {
    ContentType: string,
    AppData: UploadAppFileMetaData
}

export interface UploadAppFileMetaData {
    CategoryId: string | null
    ContentIsComplete: boolean,
    FileType: number,
    JsonContent: string | null
}

export interface UploadResult {
    encryptedPayload: Uint8Array,
    encryptedKeyHeader: Uint8Array,
    file: DriveFileId,
    recipientStatus: { [key: string]: TransferStatus; }//any //TODO: figure out how to represent c# dictionary<string,number>
}

export enum TransferStatus {
    AwaitingTransferKey = 1,
    TransferKeyCreated = 3,
    Delivered = 5,
    PendingRetry = 8
}