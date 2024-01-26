import { DotYouClient } from '../../DotYouClient';

import { TransitInstructionSet } from '../../../peer/peerData/PeerTypes';
import {
  UploadFileMetadata,
  UploadInstructionSet,
  AppendInstructionSet,
  UploadResult,
  UploadManifest,
} from './DriveUploadTypes';
import {
  encryptWithKeyheader,
  encryptWithSharedSecret,
  encryptKeyHeader,
} from '../SecurityHelpers';
import {
  jsonStringify64,
  mergeByteArrays,
  uint8ArrayToBase64,
  stringToUint8Array,
  getRandom16ByteArray,
} from '../../../helpers/DataUtil';
import { ThumbnailFile, SystemFileType, PayloadFile, KeyHeader } from '../File/DriveFileTypes';

const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;

const EMPTY_KEY_HEADER: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

// Built purely for better support on react-native
export const getSecuredBlob = async (
  blobParts?: BlobPart[] | undefined,
  options?: BlobPropertyBag
) => {
  const returnBlob = new OdinBlob(blobParts, options) as any;

  await new Promise<void>((resolve) => {
    if (returnBlob.written === undefined) resolve();

    const interval = setInterval(async () => {
      if (returnBlob.written) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  return returnBlob as Blob;
};

const toBlob = async (o: unknown): Promise<Blob> => {
  const json = jsonStringify64(o);
  const content = new TextEncoder().encode(json);
  return await getSecuredBlob([content], { type: 'application/octet-stream' });
};

export const streamToByteArray = async (stream: ReadableStream<Uint8Array>, mimeType: string) => {
  if (mimeType != null && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string.');
  }

  const chunks = [];
  const reader = stream.getReader();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (value) chunks.push(value);
    if (done) {
      return mergeByteArrays(chunks);
    }
  }
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
      thumbnails: thumbnails
        ?.filter((thumb) => thumb.key === payload.key)
        .map((thumb) => ({
          thumbnailKey: thumb.key + thumb.pixelWidth,
          pixelWidth: thumb.pixelWidth,
          pixelHeight: thumb.pixelHeight,
        })),
      iv: generateIv ? getRandom16ByteArray() : undefined,
    })),
  };
};

export const buildDescriptor = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: UploadInstructionSet | TransitInstructionSet,
  metadata: UploadFileMetadata
): Promise<Uint8Array> => {
  if (!instructions.transferIv) {
    throw new Error('Transfer IV is required');
  }

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

export const DEFAULT_PAYLOAD_KEY = 'dflt_key';

export const buildFormData = async (
  instructionSet: UploadInstructionSet | TransitInstructionSet | AppendInstructionSet,
  encryptedDescriptor: Uint8Array | undefined,
  payloads: PayloadFile[] | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader | undefined,
  manifest: UploadManifest | undefined
) => {
  const data = new FormData();
  const instructionType =
    'targetFile' in instructionSet ? 'payloadUploadInstructions' : 'instructions';
  data.append(instructionType, await toBlob(instructionSet));
  if (encryptedDescriptor) data.append('metaData', await getSecuredBlob([encryptedDescriptor]));

  if (payloads) {
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      const encryptedPayload = keyHeader
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
      const encryptedThumb = keyHeader
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
  onVersionConflict?: () => void
) => {
  const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const url = '/drive/files/upload';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
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
          onVersionConflict();
          return;
        }
      }

      if (error.response?.status === 400)
        console.error('[DotYouCore-js:pureUpload]', error.response?.data);
      else console.error('[DotYouCore-js:pureUpload]', error);
      throw error;
    });
};

export const pureAppend = async (
  dotYouClient: DotYouClient,
  data: FormData,
  systemFileType?: SystemFileType,
  onVersionConflict?: () => void
): Promise<{ newVersionTag: string }> => {
  const client = dotYouClient.createAxiosClient({
    overrideEncryption: true,
    headers: { 'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard' },
  });
  const url = '/drive/files/uploadpayload';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
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
          onVersionConflict();
          return;
        }
      }

      console.error('[DotYouCore-js:pureUpload]', error);
      throw error;
    });
};

export const GenerateKeyHeader = (): KeyHeader => {
  return {
    iv: getRandom16ByteArray(),
    aesKey: getRandom16ByteArray(),
  };
};
