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

/// `noSharedSecret`: payload and thumb reads take their query in the clear and answer raw bytes
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

/// The start is 16-byte aligned so an encrypted chunk can be decrypted with an offset; a length of 0 means to the end
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
