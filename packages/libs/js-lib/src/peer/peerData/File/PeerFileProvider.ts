import { AxiosRequestConfig } from 'axios';
import { DotYouClient } from '../../../core/DotYouClient';
import { decryptKeyHeader, decryptJsonContent } from '../../../core/DriveData/SecurityHelpers';
import { DEFAULT_PAYLOAD_KEY } from '../../../core/constants';
import {
  assertIfDefined,
  tryJsonParse,
  assertIfDefinedAndNotDefault,
} from '../../../helpers/DataUtil';
import { getAxiosClientV2, parseBytesToObject } from '../../../core/DriveData/File/DriveFileHelper';
import { getPeerPayloadBytesV2, getPeerThumbBytesV2, peerFileByIdV2 } from '../PeerRoutesV2';
import { HomebaseFile, EncryptedKeyHeader } from '../../../core/DriveData/File/DriveFileTypes';
import {
  ContentType,
  FileMetadata,
  ImageContentType,
  SystemFileType,
  TargetDrive,
} from '../../../core/DriveData/File/DriveFileTypes';

const _internalMetadataPromiseCache = new Map<string, Promise<HomebaseFile>>();

export const getPayloadAsJsonOverPeer = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    axiosConfig?: AxiosRequestConfig;
    lastModified?: number;
  }
): Promise<T | null> => {
  const { systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  return getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, key, {
    systemFileType,
    decrypt: true,
    lastModified,
  }).then((bytes) => parseBytesToObject<T>(bytes));
};

export const getPayloadBytesOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  options?: {
    systemFileType?: SystemFileType;
    chunkStart?: number;
    chunkEnd?: number;
    decrypt?: boolean;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ContentType } | null> => {
  assertIfDefined('OdinId', odinId);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('Key', key);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const { chunkStart, chunkEnd, lastModified } = options || { systemFileType: 'Standard' };
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType;

  return getPeerPayloadBytesV2(
    dotYouClient,
    peerFileByIdV2(odinId, targetDrive.alias, fileId),
    key,
    { systemFileType, chunkStart, chunkEnd, decrypt, lastModified },
    'getPayloadBytesOverPeer'
  );
};

export const getThumbBytesOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  payloadKey: string,
  width: number,
  height: number,
  options?: {
    systemFileType?: SystemFileType;
    lastModified?: number;
  }
): Promise<{ bytes: Uint8Array; contentType: ImageContentType } | null> => {
  assertIfDefined('OdinId', odinId);
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('FileId', fileId);
  assertIfDefined('PayloadKey', payloadKey);
  assertIfDefined('Width', width);
  assertIfDefined('Height', height);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const { systemFileType, lastModified } = options ?? { systemFileType: 'Standard' };

  return getPeerThumbBytesV2(
    dotYouClient,
    peerFileByIdV2(odinId, targetDrive.alias, fileId),
    payloadKey,
    width,
    height,
    { systemFileType, lastModified },
    'getThumbBytes'
  );
};

export const getFileHeaderOverPeer = async <T = string>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile<T> | null> => {
  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const fileHeader = await getFileHeaderBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, {
    decrypt,
    systemFileType,
  });
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

export const getFileHeaderBytesOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<HomebaseFile> => {
  assertIfDefined('TargetDrive', targetDrive);
  assertIfDefined('OdinId', odinId);
  assertIfDefined('FileId', fileId);
  assertIfDefinedAndNotDefault('OdinId', odinId);

  const decrypt = options?.decrypt ?? true;
  const systemFileType = options?.systemFileType ?? 'Standard';

  const cacheKey = `${odinId}+${targetDrive.alias}-${targetDrive.type}+${fileId}+${decrypt}`;
  if (_internalMetadataPromiseCache.has(cacheKey)) {
    const cacheData = await _internalMetadataPromiseCache.get(cacheKey);
    if (cacheData) return cacheData;
  }

  const client = getAxiosClientV2(dotYouClient, systemFileType);

  const promise = client
    .get(`${peerFileByIdV2(odinId, targetDrive.alias, fileId)}/header`)
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
      console.error('[odin-js:getFileHeaderBytesOverPeer]', error);
      throw error;
    });

  _internalMetadataPromiseCache.set(cacheKey, promise);

  return promise;
};

export const getContentFromHeaderOverPeer = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
    fileSystemType?: SystemFileType;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
) => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;

  const keyHeader = fileMetadata.isEncrypted
    ? await decryptKeyHeader(dotYouClient, sharedSecretEncryptedKeyHeader as EncryptedKeyHeader)
    : undefined;

  let decryptedJsonContent;
  if (includesJsonContent) {
    decryptedJsonContent = await decryptJsonContent(fileMetadata, keyHeader);
  } else {
    // When contentIsComplete but includesJsonContent == false the query before was done without including the content; So we just get and parse
    const fileHeader = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
      systemFileType: dsr.fileSystemType || systemFileType,
    });
    if (!fileHeader) return null;
    decryptedJsonContent = await decryptJsonContent(fileHeader.fileMetadata, keyHeader);
  }
  return tryJsonParse<T>(decryptedJsonContent, (ex) => {
    console.error(
      '[odin-js] getContentFromHeaderOrPayloadOverPeer: Error parsing JSON',
      ex && typeof ex === 'object' && 'stack' in ex ? ex.stack : ex,
      dsr.fileId,
      targetDrive
    );
  });
};

export const getContentFromHeaderOrPayloadOverPeer = async <T>(
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  dsr: {
    fileId: string;
    fileMetadata: FileMetadata;
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader;
    fileSystemType?: SystemFileType;
  },
  includesJsonContent: boolean,
  systemFileType?: SystemFileType
): Promise<T | null> => {
  const { fileId, fileMetadata, sharedSecretEncryptedKeyHeader } = dsr;
  const contentIsComplete =
    fileMetadata.payloads?.filter((payload) => payload.key === DEFAULT_PAYLOAD_KEY).length === 0;
  if (fileMetadata.isEncrypted && !sharedSecretEncryptedKeyHeader) return null;

  if (contentIsComplete) {
    return getContentFromHeaderOverPeer<T>(
      dotYouClient,
      odinId,
      targetDrive,
      dsr,
      includesJsonContent,
      systemFileType
    );
  } else {
    const payloadDescriptor = dsr.fileMetadata.payloads?.find(
      (payload) => payload.key === DEFAULT_PAYLOAD_KEY
    );

    return await getPayloadAsJsonOverPeer<T>(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      DEFAULT_PAYLOAD_KEY,
      {
        systemFileType: dsr.fileSystemType || systemFileType,
        lastModified: payloadDescriptor?.lastModified,
      }
    );
  }
};
