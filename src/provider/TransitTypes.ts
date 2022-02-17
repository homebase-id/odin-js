import {DriveFileId, EncryptedKeyHeader} from './DriveTypes';

export interface UploadInstructionSet {
    transferIv: Uint8Array,
    storageOptions: StorageOptions | null,
    transitOptions: TransitOptions | null
}

export interface StorageOptions {
    driveId?: string | null,
    overwriteFileId?: string | null,
    expiresTimestamp?: number | null
}

export interface TransitOptions {
    recipients: string[]
}

export interface UploadFileDescriptor {
    encryptedKeyHeader: EncryptedKeyHeader
    fileMetadata: UploadFileMetadata
}

export interface UploadFileMetadata {
    contentType: string,
    appData: UploadAppFileMetaData,
    senderDotYouId?: string,
    accessControlList?: AccessControlList
}

export interface AccessControlList {
    requiredSecurityGroup: SecurityGroupType,
    circleId?: string,
    dotYouIdentityList?: string[] | null
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