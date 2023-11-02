import { hasDebugFlag } from '../../../helpers/BrowserUtil';
import { DotYouClient } from '../../DotYouClient';
import { PayloadFile, ThumbnailFile } from '../File/DriveFileTypes';
import { KeyHeader, EncryptedKeyHeader } from '../Drive/DriveTypes';
import {
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  AppendInstructionSet,
} from './DriveUploadTypes';
import { decryptKeyHeader, encryptWithSharedSecret } from '../SecurityHelpers';
import {
  GenerateKeyHeader,
  encryptMetaData,
  buildDescriptor,
  buildFormData,
  pureUpload,
  pureAppend,
} from './UploadHelpers';

const isDebug = hasDebugFlag();

/// Upload methods:
export const uploadFile = async (
  dotYouClient: DotYouClient,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  encrypt = true,
  onVersionConflict?: () => void
): Promise<UploadResult | void> => {
  isDebug &&
    console.debug('request', new URL(`${dotYouClient.getEndpoint()}/drive/files/upload`).pathname, {
      instructions,
      metadata,
    });

  // Force payloadIsEncrypted on the metadata to match the encrypt flag
  metadata.payloadIsEncrypted = encrypt;

  const keyHeader = encrypt ? GenerateKeyHeader() : undefined;
  return uploadUsingKeyHeader(
    dotYouClient,
    keyHeader,
    instructions,
    metadata,
    payloads,
    thumbnails,
    onVersionConflict
  );
};

const uploadUsingKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payloads?: PayloadFile[],
  thumbnails?: ThumbnailFile[],
  onVersionConflict?: () => void
): Promise<UploadResult | void> => {
  // Rebuild instructions without the systemFileType
  const strippedInstructions: UploadInstructionSet = {
    storageOptions: instructions.storageOptions,
    transferIv: instructions.transferIv,
    transitOptions: instructions.transitOptions,
  };

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructions,
    encryptedMetaData
  );

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader
  );

  // Upload
  return await pureUpload(dotYouClient, data, instructions.systemFileType, onVersionConflict);
};

export const uploadHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata
): Promise<UploadResult | void> => {
  const keyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  // Rebuild instructions without the systemFileType
  const strippedInstructions: UploadInstructionSet = {
    storageOptions: instructions.storageOptions,
    transferIv: instructions.transferIv,
    transitOptions: instructions.transitOptions,
  };

  // Build package
  const encryptedMetaData = await encryptMetaData(metadata, keyHeader);

  const encryptedDescriptor = await encryptWithSharedSecret(
    dotYouClient,
    {
      fileMetadata: encryptedMetaData,
    },
    instructions.transferIv
  );

  const data = await buildFormData(
    strippedInstructions,
    encryptedDescriptor,
    undefined,
    undefined,
    undefined
  );

  // Upload
  return await pureUpload(dotYouClient, data, instructions.systemFileType);
};

export const appendDataToFile = async (
  dotYouClient: DotYouClient,
  instructions: AppendInstructionSet,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader,
  onVersionConflict?: () => void
) => {
  const strippedInstructions: AppendInstructionSet = {
    targetFile: instructions.targetFile,
    thumbnails: instructions.thumbnails,
  };

  const data = await buildFormData(
    strippedInstructions,
    undefined,
    payloads,
    thumbnails,
    keyHeader
  );

  return await pureAppend(dotYouClient, data, instructions.systemFileType, onVersionConflict);
};
