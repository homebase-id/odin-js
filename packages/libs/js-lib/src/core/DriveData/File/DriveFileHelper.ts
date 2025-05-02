import {
  byteArrayToString,
  roundToLargerMultipleOf16,
  roundToSmallerMultipleOf16,
  tryJsonParse,
} from '../../../helpers/DataUtil';
import { OdinClient } from '../../OdinClient';
import { TargetDrive, SystemFileType, ContentType } from './DriveFileTypes';

/// Helper methods:
export const getCacheKey = (targetDrive: TargetDrive, id: string, decrypt: boolean) =>
  `${targetDrive.alias}-${targetDrive.type}+${id}+${decrypt}`;

export const getAxiosClient = (odinClient: OdinClient, systemFileType?: SystemFileType) =>
  odinClient.createAxiosClient({
    systemFileType,
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
