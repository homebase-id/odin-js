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
    AppData: UploadAppFileMetaData,
    SenderDotYouId?: string,
    AccessControlList?: AccessControlList
}

export interface AccessControlList {
    RequiredSecurityGroup: SecurityGroupType,
    CircleId?: string,
    DotYouIdentityList?: string[] | null
}

export enum SecurityGroupType {
    Anonymous = 11,
    YouAuthOrTransitCertificateIdentified = 22,
    Connected = 33,
    CircleConnected = 44,
    CustomList = 55
}

export interface UploadAppFileMetaData {
    contentIsComplete: boolean,
    fileType: number,
    tags: string[] | null,
    jsonContent: string | null,
    payloadIsEncrypted: boolean
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