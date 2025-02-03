import { DotYouClient } from '../../DotYouClient';

import { TransitInstructionSet } from '../../../peer/peerData/PeerTypes';
import {
  UploadFileMetadata,
  UploadInstructionSet,
  AppendInstructionSet,
  UploadResult,
  UploadManifest,
  AppendResult,
  UpdateResult,
  UpdateInstructionSet,
  UpdateManifest,
  UpdateHeaderInstructionSet,
  isUpdateHeaderInstructionSet,
  isUpdateInstructionSet,
} from './DriveUploadTypes';
import {
  encryptWithKeyheader,
  encryptWithSharedSecret,
  encryptKeyHeader,
} from '../SecurityHelpers';
import {
  jsonStringify64,
  uint8ArrayToBase64,
  stringToUint8Array,
  getRandom16ByteArray,
} from '../../../helpers/DataUtil';
import {
  ThumbnailFile,
  SystemFileType,
  PayloadFile,
  KeyHeader,
  PayloadFileWithManualEncryption,
} from '../File/DriveFileTypes';
import { AxiosRequestConfig } from 'axios';
import { getSecuredBlob } from '../../../helpers/BlobHelpers';
import { PeerAppendInstructionSet } from '../../../peer/peer';

const EMPTY_KEY_HEADER: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

const toBlob = async (o: unknown): Promise<Blob> => {
  const json = jsonStringify64(o);
  const content = new TextEncoder().encode(json);
  return await getSecuredBlob([content], { type: 'application/octet-stream' });
};

export const encryptMetaData = async (
  metadata: UploadFileMetadata,
  keyHeader: KeyHeader | undefined
) => {
  return keyHeader && metadata.appData.content
    ? {
        ...metadata,
        appData: {
          ...metadata.appData,
          content: metadata.appData.content
            ? uint8ArrayToBase64(
                await encryptWithKeyheader(stringToUint8Array(metadata.appData.content), keyHeader)
              )
            : undefined,
        },
      }
    : metadata;
};

export const buildManifest = (
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  generateIv?: boolean
): UploadManifest => {
  return {
    PayloadDescriptors: payloads?.map((payload) => ({
      payloadKey: payload.key,
      descriptorContent: payload.descriptorContent,
      previewThumbnail: payload.previewThumbnail,
      contentType: payload.payload.type,
      thumbnails: thumbnails
        ?.filter((thumb) => thumb.key === payload.key)
        .map((thumb) => ({
          thumbnailKey: thumb.key + thumb.pixelWidth,
          pixelWidth: thumb.pixelWidth,
          pixelHeight: thumb.pixelHeight,
          contentType: thumb.payload.type,
        })),
      iv:
        (payload as PayloadFileWithManualEncryption).iv ||
        (generateIv ? getRandom16ByteArray() : undefined),
    })),
  };
};

export const buildUpdateManifest = (
  payloads: PayloadFile[] | undefined,
  toDeletePayloads: { key: string }[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  generateIv?: boolean
): UpdateManifest => {
  return {
    PayloadDescriptors: [
      ...(payloads?.map((payload) => ({
        payloadKey: payload.key,
        descriptorContent: payload.descriptorContent,
        previewThumbnail: payload.previewThumbnail,
        contentType: payload.payload.type,
        thumbnails: thumbnails
          ?.filter((thumb) => thumb.key === payload.key)
          .map((thumb) => ({
            thumbnailKey: thumb.key + thumb.pixelWidth,
            pixelWidth: thumb.pixelWidth,
            pixelHeight: thumb.pixelHeight,
            contentType: thumb.payload.type,
          })),
        iv:
          (payload as PayloadFileWithManualEncryption).iv ||
          (generateIv ? getRandom16ByteArray() : undefined),
        payloadUpdateOperationType: 'appendOrOverwrite' as const,
      })) || []),
      ...(toDeletePayloads?.map((toDelete) => ({
        payloadKey: toDelete.key,
        payloadUpdateOperationType: 'deletePayload' as const,
      })) || []),
    ],
  };
};

export const buildDescriptor = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions:
    | UploadInstructionSet
    | UpdateHeaderInstructionSet
    | TransitInstructionSet
    | UpdateInstructionSet,
  metadata: UploadFileMetadata
): Promise<Uint8Array> => {
  if (!instructions.transferIv) throw new Error('Transfer IV is required');

  return await encryptWithSharedSecret(
    dotYouClient,
    {
      ...(isUpdateInstructionSet(instructions)
        ? {
            keyHeaderIv: keyHeader?.iv,
          }
        : isUpdateHeaderInstructionSet(instructions)
          ? {
              encryptedKeyHeader: keyHeader
                ? await encryptKeyHeader(
                    dotYouClient,
                    { aesKey: new Uint8Array(Array(16).fill(0)), iv: keyHeader?.iv },
                    instructions.transferIv
                  )
                : undefined,
            }
          : {
              encryptedKeyHeader: await encryptKeyHeader(
                dotYouClient,
                keyHeader ?? EMPTY_KEY_HEADER,
                instructions.transferIv
              ),
            }),
      fileMetadata: await encryptMetaData(metadata, keyHeader),
    },
    instructions.transferIv
  );
};

export const buildFormData = async (
  instructionSet:
    | UploadInstructionSet
    | TransitInstructionSet
    | AppendInstructionSet
    | PeerAppendInstructionSet
    | UpdateInstructionSet,
  encryptedDescriptor: Uint8Array | undefined,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader | undefined,
  manifest: UploadManifest | UpdateManifest | undefined
) => {
  const data = new FormData();
  const instructionType =
    'targetFile' in instructionSet && !('locale' in instructionSet)
      ? 'payloadUploadInstructions'
      : 'instructions';
  data.append(instructionType, await toBlob(instructionSet));
  if (encryptedDescriptor) data.append('metadata', await getSecuredBlob([encryptedDescriptor]));

  if (payloads) {
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const encryptedPayload =
        keyHeader && !payload.skipEncryption
          ? await encryptWithKeyheader(payload.payload, {
              ...keyHeader,
              iv:
                manifest?.PayloadDescriptors?.find((p) => p.payloadKey === payload.key)?.iv ||
                keyHeader.iv,
            })
          : payload.payload;

      data.append('payload', encryptedPayload, payload.key);
    }
  }

  if (thumbnails) {
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      const encryptedThumb =
        keyHeader && !thumb.skipEncryption
          ? await encryptWithKeyheader(thumb.payload, {
              ...keyHeader,
              iv:
                manifest?.PayloadDescriptors?.find((p) => p.payloadKey === thumb.key)?.iv ||
                keyHeader.iv,
            })
          : thumb.payload;

      data.append('thumbnail', encryptedThumb, thumb.key + thumb.pixelWidth);
    }
  }

  return data;
};

export const pureUpload = async (
  dotYouClient: DotYouClient,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UploadResult | void> => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true, systemFileType });
  const url = '/drive/files/upload';

  const config: AxiosRequestConfig = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  return client
    .post<UploadResult>(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      if (error.response?.status === 400)
        console.error('[odin-js:pureUpload]', error.response?.data);
      else console.error('[odin-js:pureUpload]', error);
      throw error;
    });
};

export const pureAppend = async (
  dotYouClient: DotYouClient,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | AppendResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<AppendResult | void> => {
  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    systemFileType,
  });
  const url = '/drive/files/uploadpayload';

  const config = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  return client
    .post(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      console.error('[odin-js:pureUpload]', error);
      throw error;
    });
};

export const pureUpdate = async (
  dotYouClient: DotYouClient,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | UpdateResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UpdateResult | void> => {
  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    systemFileType,
  });
  const url = '/drive/files/update';

  const config = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  return client
    .patch(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      console.error('[odin-js:pureUpdate]', error);
      throw error;
    });
};

export const GenerateKeyHeader = (aesKey?: Uint8Array): KeyHeader => {
  return {
    iv: getRandom16ByteArray(),
    aesKey: aesKey || getRandom16ByteArray(),
  };
};
