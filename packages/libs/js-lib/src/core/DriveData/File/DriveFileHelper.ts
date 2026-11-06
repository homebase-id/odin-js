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

/// A partial read's V2 route suffix: `payload/{key}/{start}/{length}`, with a 16-byte aligned start for decrypting with
/// an offset. A length of 0 means "to the end". Empty when the whole payload is read.
export const getRangePath = (chunkStart?: number, chunkEnd?: number) => {
  if (chunkStart === undefined) {
    return { startOffset: 0, updatedChunkStart: undefined, rangePath: '' };
  }

  const updatedChunkStart = chunkStart === 0 ? 0 : roundToSmallerMultipleOf16(chunkStart - 16);
  const startOffset = Math.abs(chunkStart - updatedChunkStart);
  // End of range is inclusive, so we need to subtract 1
  const updatedChunkEnd = chunkEnd !== undefined ? roundToLargerMultipleOf16(chunkEnd) - 1 : undefined;
  const length = updatedChunkEnd !== undefined ? updatedChunkEnd - updatedChunkStart + 1 : 0;
  return { startOffset, updatedChunkStart, rangePath: `/${updatedChunkStart}/${length}` };
};

/// A query string for a V2 payload or thumb read, which carries it unencrypted; undefined values are left out
export const toV2QueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const queryString = stringifyToQueryParams(params);
  return queryString ? '?' + queryString : '';
};
