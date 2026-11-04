import {
  byteArrayToString,
  roundToLargerMultipleOf16,
  roundToSmallerMultipleOf16,
  tryJsonParse,
  stringifyToQueryParams,
} from '../../../helpers/DataUtil';
import { DotYouClient } from '../../DotYouClient';
import { TargetDrive, SystemFileType, ContentType } from './DriveFileTypes';

/// Helper methods:
export const getCacheKey = (targetDrive: TargetDrive, id: string, decrypt: boolean) =>
  `${targetDrive.alias}-${targetDrive.type}+${id}+${decrypt}`;

export const getAxiosClient = (dotYouClient: DotYouClient, systemFileType?: SystemFileType) =>
  dotYouClient.createAxiosClient({
    systemFileType,
  });

/// A client on the unified V2 api (`/api/v2`). `noSharedSecret` is for the actions marked
/// [NoSharedSecretOnRequest]/[NoSharedSecretOnResponse] (payload and thumb reads): they take their query string
/// in the clear (an encrypted `?ss=` is passed through unread) and answer with raw bytes, so the client skips
/// the shared-secret interceptors.
export const getAxiosClientV2 = (
  dotYouClient: DotYouClient,
  systemFileType?: SystemFileType,
  options?: { noSharedSecret?: boolean }
) =>
  dotYouClient.createAxiosClient({
    systemFileType,
    v2: true,
    overrideEncryption: options?.noSharedSecret,
  });

export const parseBytesToObject = <T>(
  data: {
    bytes: Uint8Array;
    contentType: ContentType;
  } | null
) => {
  if (!data) return null;
  const json = byteArrayToString(new Uint8Array(data.bytes));
  return tryJsonParse<T>(json);
};

export const getRangeHeader = (chunkStart?: number, chunkEnd?: number) => {
  let startOffset = 0;
  let updatedChunkEnd: number | undefined, updatedChunkStart: number | undefined;
  if (chunkStart !== undefined) {
    updatedChunkStart = chunkStart === 0 ? 0 : roundToSmallerMultipleOf16(chunkStart - 16);
    startOffset = Math.abs(chunkStart - updatedChunkStart);
    // End of range is inclusive, so we need to subtract 1
    updatedChunkEnd = chunkEnd !== undefined ? roundToLargerMultipleOf16(chunkEnd) - 1 : undefined;
    return {
      startOffset,
      updatedChunkStart,
      updatedChunkEnd,
      rangeHeader: `bytes=${updatedChunkStart}-${updatedChunkEnd || ''}`,
    };
  }
  return { startOffset, updatedChunkStart, rangeHeader: undefined };
};

/// getRangeHeader as a V2 route suffix: V2's `payload/{key}` ignores a Range header, and a partial read goes to
/// `payload/{key}/{start}/{length}` instead, with the same 16-byte aligned start (so the decrypt-with-offset logic
/// is unchanged). A length of 0 means "to the end", as an open-ended Range did. Empty when the whole payload is read.
export const getRangePath = (chunkStart?: number, chunkEnd?: number) => {
  const { startOffset, updatedChunkStart, updatedChunkEnd } = getRangeHeader(chunkStart, chunkEnd);
  if (updatedChunkStart === undefined) return { startOffset, updatedChunkStart, rangePath: '' };

  const length = updatedChunkEnd !== undefined ? updatedChunkEnd - updatedChunkStart + 1 : 0;
  return { startOffset, updatedChunkStart, rangePath: `/${updatedChunkStart}/${length}` };
};

/// A query string for a V2 payload or thumb read, which carries it unencrypted; undefined values are left out
export const toV2QueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const queryString = stringifyToQueryParams(params);
  return queryString ? '?' + queryString : '';
};
