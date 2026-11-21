import { DotYouClient } from '../../../core/DotYouClient';
import { decryptKeyHeader, decryptJsonContent } from '../../../core/DriveData/SecurityHelpers';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/constants';
import {
  TargetDrive,
  HomebaseFile,
  FileMetadata,
  EncryptedKeyHeader,
  SystemFileType,
  ImageContentType,
  ContentType,
} from '../../../core/core';
import {
  assertIfDefined,
  tryJsonParse,
  assertIfDefinedAndNotDefault,
} from '../../../helpers/DataUtil';
import { getAxiosClientV2, parseBytesToObject } from '../../../core/DriveData/File/DriveFileHelper';
import { getPeerPayloadBytesV2, getPeerThumbBytesV2, peerFileByGtidV2 } from '../PeerRoutesV2';

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile | null>>();

export const getPayloadAsJsonOverPeerByGlobalTransitId = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
  }
): Promise<T | null> => {
  const { systemFileType } = options ?? { systemFileType: 'Standard' };

  return getPayloadBytesOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
    key,
    {
      systemFileType,
      decrypt: true,
    }
  ).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefinedAndNotDefault('GlobalTransitId', globalTransitId);
  assertIfDefinedAndNotDefault('Key', key);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const { chunkStart, chunkEnd, lastModified } = options || {};
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  return getPeerPayloadBytesV2(
    dotYouClient,
    peerFileByGtidV2(odinId, targetDrive.alias, globalTransitId),
    key,
    { systemFileType, chunkStart, chunkEnd, decrypt, lastModified },
    'getPayloadBytesOverPeerByGlobalTransitId'
  );
};

export const getThumbBytesOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  payloadKey: string,
  width: number,
  height: number,
  options?: {
    systemFileType?: SystemFileType;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GlobalTransitId', globalTransitId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const { systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  return getPeerThumbBytesV2(
    dotYouClient,
    peerFileByGtidV2(odinId, targetDrive.alias, globalTransitId),
    payloadKey,
    width,
    height,
    { systemFileType, lastModified },
    'getThumbBytesOverPeerByGlobalTransitId'
  );
};

export const getFileHeaderOverPeerByGlobalTransitId = async <T = string>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
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

export const getFileHeaderBytesOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType } | undefined
): Promise<HomebaseFile> => {
  assertIfDefined('DotYouClient', dotYouClient);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('GlobalTransitId', globalTransitId);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = `${odinId}+${targetDrive.alias}-${targetDrive.type}+${globalTransitId}+${decrypt}`;
  if (_internalMetadataPromiseCache.has(cacheKey)) {
    const cacheData = await _internalMetadataPromiseCache.get(cacheKey);
    if (cacheData) return cacheData;
  }

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  const promise = client
    .get(`${peerFileByGtidV2(odinId, targetDrive.alias, globalTransitId)}/header`)
    .then((response) => response.data)
    .then(async (fileHeader) => {
      if (decrypt) {
        const keyheader = fileHeader.fileMetadata.isEncrypted
          ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
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
      console.error('[odin-js:getFileHeaderBytesOverPeerByGlobalTransitId]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getContentFromHeaderOrPayloadOverPeerByGlobalTransitId = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  dsr: {
    globalTransitId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  const { globalTransitId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  const contentIsComplete =
    fileMetadata.payloads?.filter((payload) => payload.key === DEFAULT_PAYLOAD_KEY).length === 0;
  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader)
    : undefined;

  if (contentIsComplete) {
    let decryptedJsonContent;
    if (includesJsonContent) {
      decryptedJsonContent = await decryptJsonContent(fileMetadata, keyHeader);
    } else {
      // When contentIsComplete but includesJsonContent == false the query before was done without including the content; So we just get and parse
      const fileHeader = await getFileHeaderOverPeerByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        globalTransitId,
        {
          systemFileType,
        }
      );
      if (!fileHeader) return null;
      decryptedJsonContent = await decryptJsonContent(fileHeader.fileMetadata, keyHeader);
    }
    return tryJsonParse<T>(decryptedJsonContent);
  } else {
    return await getPayloadAsJsonOverPeerByGlobalTransitId<T>(
      dotYouClient,
      odinId,
      targetDrive,
      globalTransitId,
      DEFAULT_PAYLOAD_KEY
    );
  }
};
