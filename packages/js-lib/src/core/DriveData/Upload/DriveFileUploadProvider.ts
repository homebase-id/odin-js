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
  buildManifest,
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

  // Force isEncrypted on the metadata to match the encrypt flag
  metadata.isEncrypted = encrypt;

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
  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildManifest(payloads, thumbnails);
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
  };

  // Build package
  const encryptedDescriptor = await buildDescriptor(
    dotYouClient,
    keyHeader,
    instructions,
    metadata
  );

  const data = await buildFormData(
    instructionsWithManifest,
    encryptedDescriptor,
    payloads,
    thumbnails,
    keyHeader
  );

  // Upload
  return await pureUpload(dotYouClient, data, systemFileType, onVersionConflict);
};

export const uploadHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader | undefined,
  instructions: UploadInstructionSet,
  metadata: UploadFileMetadata
): Promise<UploadResult | void> => {
  const keyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : metadata.isEncrypted
    ? GenerateKeyHeader()
    : undefined;

  const { systemFileType, ...strippedInstructions } = instructions;
  if (!strippedInstructions.storageOptions) throw new Error('storageOptions is required');

  strippedInstructions.storageOptions.storageIntent = 'metadataOnly';

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
  return await pureUpload(dotYouClient, data, systemFileType);
};

export const appendDataToFile = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader | undefined,
  instructions: AppendInstructionSet,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  onVersionConflict?: () => void
) => {
  const keyHeader = encryptedKeyHeader
    ? await decryptKeyHeader(dotYouClient, encryptedKeyHeader)
    : undefined;

  const { systemFileType, ...strippedInstructions } = instructions;

  const manifest = buildManifest(payloads, thumbnails);
  const instructionsWithManifest = {
    ...strippedInstructions,
    manifest,
  };

  const data = await buildFormData(
    instructionsWithManifest,
    undefined,
    payloads,
    thumbnails,
    keyHeader
  );

  return await pureAppend(dotYouClient, data, systemFileType, onVersionConflict);
};
