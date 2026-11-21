import { DotYouClient } from '../../DotYouClient';
import { getAxiosClientV2 } from '../File/DriveFileHelper';

import { TransitInstructionSet } from '../../../peer/peerData/PeerTypes';
import {
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
  UploadManifest,
  UpdateResult,
  UpdateInstructionSet,
  UpdateManifest,
  TransferUploadStatus,
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
  TargetDrive,
  FileIdFileIdentifier,
  GlobalTransitIdFileIdentifier,
} from '../File/DriveFileTypes';
import { AxiosRequestConfig } from 'axios';
import { getSecuredBlob } from '../../../helpers/BlobHelpers';

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
  instructions: UploadInstructionSet | TransitInstructionSet | UpdateInstructionSet,
  metadata: UploadFileMetadata
): Promise<Uint8Array> => {
  if (!instructions.transferIv) throw new Error('Transfer IV is required');

  return await encryptWithSharedSecret(
    dotYouClient,
    {
      encryptedKeyHeader: await encryptKeyHeader(
        dotYouClient,
        keyHeader ?? EMPTY_KEY_HEADER,
        instructions.transferIv
      ),
      fileMetadata: await encryptMetaData(metadata, keyHeader),
    },
    instructions.transferIv
  );
};

export const buildFormData = async (
  instructionSet: UploadInstructionSet | TransitInstructionSet | UpdateInstructionSet,
  encryptedDescriptor: Uint8Array | undefined,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader | undefined,
  manifest: UploadManifest | UpdateManifest | undefined
) => {
  const data = new FormData();
  data.append('instructions', await toBlob(instructionSet));
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

/// V2 create and update take V1's multipart body; the file system type still travels in its header

/// The flattened CreateFileResult / UpdateFileResult V2 returns
interface FileWriteResultV2 {
  fileId: string;
  driveId: string;
  globalTransitId?: string | null;
  recipientStatus: { [key: string]: TransferUploadStatus };
  newVersionTag: string;
  updated?: number | null;
  payloads?: unknown[];
}

/// Back into V1's shape, so callers read globalTransitId, updated and payloads as before
const toV1FileWriteResult = (result: FileWriteResultV2, targetDrive: TargetDrive) => {
  const file: FileIdFileIdentifier = { fileId: result.fileId, targetDrive };
  const globalTransitIdFileIdentifier = (
    result.globalTransitId ? { globalTransitId: result.globalTransitId, targetDrive } : null
  ) as GlobalTransitIdFileIdentifier;

  return { ...result, file, globalTransitIdFileIdentifier };
};

/// Mapped before a version-conflict handler runs, so the handler's own result passes through
const sendMultipartV2 = async <T>(
  dotYouClient: DotYouClient,
  method: 'post' | 'patch',
  url: string,
  targetDrive: TargetDrive,
  data: FormData,
  systemFileType: SystemFileType | undefined,
  onVersionConflict: (() => Promise<void | T> | void) | undefined,
  axiosConfig: AxiosRequestConfig | undefined,
  logName: string
) => {
  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });

  const config: AxiosRequestConfig = {
    ...axiosConfig,
    headers: {
      'content-type': 'multipart/form-data',
      ...axiosConfig?.headers,
    },
  };

  return client[method]<FileWriteResultV2>(url, data, config)
    .then((response) => toV1FileWriteResult(response.data, targetDrive))
    .catch((error) => {
      if (error.response?.data?.errorCode === 'versionTagMismatch') {
        if (!onVersionConflict) {
          console.warn('VersionTagMismatch, to avoid this, add an onVersionConflict handler');
        } else {
          return onVersionConflict();
        }
      }

      if (error.response?.status === 400)
        console.error(`[odin-js:${logName}]`, error.response?.data);
      else console.error(`[odin-js:${logName}]`, error);
      throw error;
    });
};

// V1's in-place overwrite: the only one that can switch a file between encrypted and not
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

/// V2 refuses an overwriteFileId here; the caller sets the keyHeader
export const pureUploadV2 = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | UploadResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UploadResult | void> =>
  sendMultipartV2<UploadResult>(
    dotYouClient,
    'post',
    `/drives/${targetDrive.alias}/files`,
    targetDrive,
    data,
    systemFileType,
    onVersionConflict,
    axiosConfig,
    'pureUploadV2'
  ).then((result) =>
    result && !('keyHeader' in result) ? { ...result, keyHeader: undefined } : result
  );

/// Updates a local file by its file id: PATCH /api/v2/drives/{driveId}/files/{fileId}
export const pureUpdateV2 = async (
  dotYouClient: DotYouClient,
  file: FileIdFileIdentifier,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | UpdateResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UpdateResult | void> =>
  sendMultipartV2<UpdateResult>(
    dotYouClient,
    'patch',
    `/drives/${file.targetDrive.alias}/files/${file.fileId}`,
    file.targetDrive,
    data,
    systemFileType,
    onVersionConflict,
    axiosConfig,
    'pureUpdateV2'
  );

/// Updates a file on another identity, with no local copy: PATCH /api/v2/peer/{odinId}/drives/{driveId}/files/by-gtid/{gtid}
export const pureUpdateOverPeerV2 = async (
  dotYouClient: DotYouClient,
  recipient: string,
  file: GlobalTransitIdFileIdentifier,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => Promise<void | UpdateResult> | void,
  axiosConfig?: AxiosRequestConfig
): Promise<UpdateResult | void> =>
  sendMultipartV2<UpdateResult>(
    dotYouClient,
    'patch',
    `/peer/${encodeURIComponent(recipient)}/drives/${file.targetDrive.alias}/files/by-gtid/${file.globalTransitId}`,
    file.targetDrive,
    data,
    systemFileType,
    onVersionConflict,
    axiosConfig,
    'pureUpdateOverPeerV2'
  );

export const GenerateKeyHeader = (aesKey?: Uint8Array): KeyHeader => {
  return {
    iv: getRandom16ByteArray(),
    aesKey: aesKey || getRandom16ByteArray(),
  };
};
