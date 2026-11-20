import { DotYouClient } from '../../core/DotYouClient';
import {
  ContentType,
  ImageContentType,
  SystemFileType,
} from '../../core/DriveData/File/DriveFileTypes';
import {
  decryptBytesResponse,
  decryptChunkedBytesResponse,
} from '../../core/DriveData/SecurityHelpers';
import {
  getAxiosClientV2,
  getRangePath,
  toV2QueryString,
} from '../../core/DriveData/File/DriveFileHelper';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/// An absent alias becomes the empty guid, so the server answers with a validation error, not a route miss
export const peerDriveRootV2 = (odinId: string, driveAlias: string | undefined) =>
  `/peer/${encodeURIComponent(odinId)}/drives/${driveAlias || EMPTY_GUID}`;

export const peerFileByIdV2 = (odinId: string, driveAlias: string, fileId: string) =>
  `${peerDriveRootV2(odinId, driveAlias)}/files/${fileId}`;

export const peerFileByGtidV2 = (odinId: string, driveAlias: string, globalTransitId: string) =>
  `${peerDriveRootV2(odinId, driveAlias)}/files/by-gtid/${globalTransitId}`;

/// A partial read uses the ranged route with the same 16-byte aligned start V1 put in its Range header
export const getPeerPayloadBytesV2 = async (
  dotYouClient: DotYouClient,
  fileRoute: string,
  key: string,
  options: {
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt: boolean;
    lastModified?: number;
  },
  logTag: string
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  const { systemFileType, chunkStart, chunkEnd, decrypt, lastModified } = options;
  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });
  const { startOffset, updatedChunkStart, rangePath } = getRangePath(chunkStart, chunkEnd);

  return client
    .get<ArrayBuffer>(
      `${fileRoute}/payload/${encodeURIComponent(key)}${rangePath}${toV2QueryString({ lastModified })}`,
      { responseType: 'arraybuffer' }
    )
    .then(async (response) => {
      if (!response.data) return null;
      return {
        bytes: !decrypt
          ? new Uint8Array(response.data)
          : updatedChunkStart !== undefined
            ? (
                await decryptChunkedBytesResponse(
                  dotYouClient,
                  response,
                  startOffset,
                  updatedChunkStart
                )
              ).slice(
                0,
                chunkEnd !== undefined && chunkStart !== undefined
                  ? chunkEnd - chunkStart
                  : undefined
              )
            : await decryptBytesResponse(dotYouClient, response),

        contentType: `${response.headers.decryptedcontenttype}` as ContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error(`[odin-js:${logTag}]`, error);
      return null;
    });
};

/// A peer thumbnail read on V2; see getPeerPayloadBytesV2 for why the shared secret is skipped
export const getPeerThumbBytesV2 = async (
  dotYouClient: DotYouClient,
  fileRoute: string,
  payloadKey: string,
  width: number,
  height: number,
  options: { systemFileType?: SystemFileType; lastModified?: number },
  logTag: string
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  const { systemFileType, lastModified } = options;
  const client = getAxiosClientV2(dotYouClient, systemFileType, { noSharedSecret: true });

  return client
    .get<ArrayBuffer>(
      `${fileRoute}/payload/${encodeURIComponent(payloadKey)}/thumb/${width}/${height}${toV2QueryString({ lastModified })}`,
      { responseType: 'arraybuffer' }
    )
    .then(async (response) => {
      if (!response.data) return null;
      return {
        bytes: await decryptBytesResponse(dotYouClient, response),
        contentType: `${response.headers.decryptedcontenttype}` as ImageContentType,
      };
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error(`[odin-js:${logTag}]`, error);
      return null;
    });
};
