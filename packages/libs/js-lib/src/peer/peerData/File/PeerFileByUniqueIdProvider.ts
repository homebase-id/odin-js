import { OdinClient } from '../../../core/OdinClient';
import { decryptKeyHeader, decryptJsonContent } from '../../../core/DriveData/SecurityHelpers';
import { TargetDrive, HomebaseFile, SystemFileType } from '../../../core/core';
import {
  assertIfDefined,
  tryJsonParse,
  stringifyToQueryParams,
  assertIfDefinedAndNotDefault,
} from '../../../helpers/DataUtil';
import { getAxiosClient } from '../../../core/DriveData/File/DriveFileHelper';

interface GetFileRequest {
  odinId: string;
  alias: string;
  type: string;
  uniqueId: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

export const getFileHeaderOverPeerByUniqueId = async <T = string>(
  odinClient: OdinClient,
  odinId: string,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesOverPeerByUniqueId(
    odinClient,
    odinId,
    targetDrive,
    uniqueId,
    {
      decrypt,
      systemFileType,
    }
  );
  if (!fileHeader) return null;

  const typedFileHeader: HomebaseFile<T> = {
    ...fileHeader,
    fileMetadata: {
      ...fileHeader.fileMetadata,
      appData: {
        ...fileHeader.fileMetadata.appData,
        content: tryJsonParse<T>(fileHeader.fileMetadata.appData.content),
      },
    },
  };

  return typedFileHeader;
};

export const getFileHeaderBytesOverPeerByUniqueId = async (
  odinClient: OdinClient,
  odinId: string,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
): Promise<HomebaseFile> => {
  assertIfDefined('OdinClient', odinClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('uniqueId', uniqueId);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = `${odinId}+${targetDrive.alias}-${targetDrive.type}+${uniqueId}+${decrypt}`;
  if (_internalMetadataPromiseCache.has(cacheKey)) {
    const cacheData = await _internalMetadataPromiseCache.get(cacheKey);
    if (cacheData) return cacheData;
  }

  const client = getAxiosClient(odinClient, systemFileType);

  const request: GetFileRequest = {
    odinId: odinId,
    ...targetDrive,
    uniqueId,
  };

  const promise = client
    .get('/transit/query/header_byuniqueId?' + stringifyToQueryParams(request))
    .then((response) => response.data)
    .then(async (fileHeader) => {
      if (decrypt) {
        const keyheader = fileHeader.fileMetadata.isEncrypted
          ? await decryptKeyHeader(odinClient, fileHeader.sharedSecretEncryptedKeyHeader)
          : undefined;

        fileHeader.fileMetadata.appData.content = await decryptJsonContent(
          fileHeader.fileMetadata,
          keyheader
        );
      }
      _internalMetadataPromiseCache.delete(cacheKey);
      return fileHeader;
    })
    .catch((error) => {
      if (error.response?.status === 404) return null;
      console.error('[DotYouCore-js:getFileHeaderBytesOverPeerByUniqueId]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};
