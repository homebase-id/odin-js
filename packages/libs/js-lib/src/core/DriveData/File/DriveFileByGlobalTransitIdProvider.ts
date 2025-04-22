import { assertIfDefined, stringifyToQueryParams, tryJsonParse } from '../../../helpers/DataUtil';
import { OdinClient } from '../../OdinClient';
import { decryptKeyHeader, decryptJsonContent } from '../SecurityHelpers';
import { getCacheKey, getAxiosClient } from './DriveFileHelper';
import { TargetDrive, SystemFileType, HomebaseFile } from './DriveFileTypes';

interface GetFileByGlobalTransitIdRequest {
  alias: string;
  type: string;
  globalTransitId: string;
}

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

/// Get methods by UniqueId
export const getFileHeaderByGlobalTransitId = async <T = string>(
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { systemFileType?: SystemFileType; decrypt?: boolean }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesByGlobalTransitId(
    odinClient,
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

export const getFileHeaderBytesByGlobalTransitId = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  uniqueId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile | null> => {
  assertIfDefined('OdinClient', odinClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('UniqueId', uniqueId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = getCacheKey(targetDrive, uniqueId, !!decrypt);
  const cacheEntry =
    _internalMetadataPromiseCache.has(cacheKey) &&
    (await _internalMetadataPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const client = getAxiosClient(odinClient, systemFileType);

  const request: GetFileByGlobalTransitIdRequest = {
    ...targetDrive,
    globalTransitId: uniqueId,
  };

  const promise: Promise<HomebaseFile | null> = client
    .get<HomebaseFile>('/drive/files/header_byglobaltransitid?' + stringifyToQueryParams(request))
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
      console.error('[DotYouCore-js:getFileHeaderByGlobalTransitId]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};
