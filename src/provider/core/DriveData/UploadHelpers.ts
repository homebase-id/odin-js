import { DotYouClient } from '../DotYouClient';
import { uint8ArrayToBase64, stringToUint8Array, jsonStringify64 } from '../helpers/DataUtil';
import { TransitInstructionSet } from '../TransitData/TransitTypes';
import { KeyHeader, ThumbnailFile } from './DriveTypes';
import { UploadFileMetadata, UploadInstructionSet, SystemFileType } from './DriveUploadTypes';
import { encryptWithKeyheader, encryptWithSharedSecret, encryptKeyHeader } from './SecurityHelpers';

const EMPTY_KEY_HEADER: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

const toBlob = (o: unknown): Blob => {
  const json = jsonStringify64(o);
  const content = new TextEncoder().encode(json);
  return new Blob([content]);
};

export const encryptMetaData = async (
  metadata: UploadFileMetadata,
  keyHeader: KeyHeader | undefined
) => {
  return keyHeader && metadata.appData.jsonContent
    ? {
        ...metadata,
        appData: {
          ...metadata.appData,
          jsonContent: metadata.appData.jsonContent
            ? uint8ArrayToBase64(
                await encryptWithKeyheader(
                  stringToUint8Array(metadata.appData.jsonContent),
                  keyHeader
                )
              )
            : null,
        },
      }
    : metadata;
};

export const buildDescriptor = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader | undefined,
  instructions: UploadInstructionSet | TransitInstructionSet,
  encryptedMetaData: UploadFileMetadata
): Promise<Uint8Array> => {
  return await encryptWithSharedSecret(
    dotYouClient,
    {
      encryptedKeyHeader: await encryptKeyHeader(
        dotYouClient,
        keyHeader ?? EMPTY_KEY_HEADER,
        instructions.transferIv
      ),
      fileMetadata: encryptedMetaData,
    },
    instructions.transferIv
  );
};

export const buildFormData = async (
  instructionSet: UploadInstructionSet | TransitInstructionSet,
  encryptedDescriptor: Uint8Array,
  payload: Uint8Array | File | undefined,
  thumbnails: ThumbnailFile[] | undefined,
  keyHeader: KeyHeader | undefined
) => {
  const data = new FormData();
  data.append('instructions', toBlob(instructionSet));
  data.append('metaData', new Blob([encryptedDescriptor]));

  if (!payload) {
    data.append('payload', new Blob([]));
  } else {
    data.append('payload', payload instanceof File ? payload : new Blob([payload]));
  }

  if (thumbnails) {
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      const filename = `${thumb.pixelWidth}x${thumb.pixelHeight}`;

      const thumbnailBytes = keyHeader
        ? await encryptWithKeyheader(thumb.payload, keyHeader)
        : thumb.payload;
      data.append(
        'thumbnail',
        new Blob([thumbnailBytes], {
          type: thumb.contentType,
        }),
        filename
      );
    }
  }

  return data;
};

export const pureUpload = async (
  dotYouClient: DotYouClient,
  data: FormData,
  systemFileType?: SystemFileType
) => {
  const client = dotYouClient.createAxiosClient(true);
  const url = '/drive/files/upload';

  const config = {
    headers: {
      'content-type': 'multipart/form-data',
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  };

  return client
    .post(url, data, config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error('[DotYouCore-js]', error);
      throw error;
    });
};

export const GenerateKeyHeader = (): KeyHeader => {
  return {
    iv: getRandom16ByteArray(),
    aesKey: getRandom16ByteArray(),
  };
};

export const getRandom16ByteArray = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};
