import { ApiType, DotYouClient } from '../../../core/DotYouClient';
import {
  ImageSize,
  SystemFileType,
  TargetDrive,
} from '../../../core/DriveData/File/DriveFileTypes';
import { uint8ArrayToBase64 } from '../../../helpers/DataUtil';
import { getAnonymousDirectImageUrl } from '../../../media/MediaProvider';
import {
  getFileHeaderOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
  getThumbBytesOverPeerByGlobalTransitId,
} from '../File/PeerFileByGlobalTransitProvider';
import {
  getFileHeaderOverPeer,
  getPayloadBytesOverPeer,
  getThumbBytesOverPeer,
} from '../File/PeerFileProvider';

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedMediaUrlOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  fileKey: string,
  isProbablyEncrypted?: boolean,
  lastModified?: number,
  options?: {
    size?: ImageSize; // Passing size will get a thumb, otherwise the payload
    systemFileType?: SystemFileType;
    fileSizeLimit?: number;
  }
): Promise<string> => {
  const { size, systemFileType, fileSizeLimit } = options || {};

  const getDirectImageUrl = (fileId: string) =>
    getAnonymousDirectImageUrl(
      odinId,
      targetDrive,
      fileId,
      fileKey,
      size,
      systemFileType,
      lastModified
    );

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  // Also apps can't handle a direct image url as that endpoint always expects to be authenticated,
  //   and the CAT is passed via a header that we can't set on a direct url
  if (!isProbablyEncrypted) {
    const meta = await getFileHeaderOverPeerByGlobalTransitId(
      dotYouClient,
      odinId,
      targetDrive,
      globalTransitId,
      {
        systemFileType,
      }
    );
    if (!meta?.fileMetadata.isEncrypted && meta?.fileId) {
      return await getDirectImageUrl(meta?.fileId);
    }
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  // We limit download to 10MB to avoid memory issues
  const getBytes = async () => {
    if (size) {
      try {
        const thumbBytes = await getThumbBytesOverPeerByGlobalTransitId(
          dotYouClient,
          odinId,
          targetDrive,
          globalTransitId,
          fileKey,
          size.pixelWidth,
          size.pixelHeight,
          { systemFileType, lastModified }
        );
        if (thumbBytes) return thumbBytes;
      } catch (ex) {
        // Failed to get thumb data, try to get payload data
      }
    }

    return await getPayloadBytesOverPeerByGlobalTransitId(
      dotYouClient,
      odinId,
      targetDrive,
      globalTransitId,
      fileKey,
      {
        systemFileType,
        chunkStart: fileSizeLimit ? 0 : undefined,
        chunkEnd: fileSizeLimit,
        lastModified,
      }
    );
  };

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getBytes().then((data) => {
    if (!data) return '';
    return `data:${data.contentType};base64,${uint8ArrayToBase64(new Uint8Array(data.bytes))}`;
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedMediaUrlOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  isProbablyEncrypted?: boolean,
  lastModified?: number,

  options?: {
    size?: ImageSize; // Passing size will get a thumb, otherwise the payload
    systemFileType?: SystemFileType;
    fileSizeLimit?: number;
  }
): Promise<string> => {
  const { size, systemFileType, fileSizeLimit } = options || {};
  const getDirectImageUrl = () =>
    getAnonymousDirectImageUrl(
      odinId,
      targetDrive,
      fileId,
      fileKey,
      size,
      systemFileType,
      lastModified
    );

  const ss = dotYouClient.getSharedSecret();

  // // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss || dotYouClient.getType() === ApiType.Guest) return await getDirectImageUrl();

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  if (!isProbablyEncrypted) {
    const meta = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
      systemFileType,
    });
    if (!meta?.fileMetadata.isEncrypted) return await getDirectImageUrl();
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  // We limit download to 10MB to avoid memory issues
  const getBytes = async () => {
    if (size) {
      try {
        const thumbBytes = await getThumbBytesOverPeer(
          dotYouClient,
          odinId,
          targetDrive,
          fileId,
          fileKey,
          size.pixelWidth,
          size.pixelHeight,
          { systemFileType, lastModified }
        );
        if (thumbBytes) return thumbBytes;
      } catch (ex) {
        // Failed to get thumb data, try to get payload data
      }
    }

    return await getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, fileKey, {
      systemFileType,
      chunkStart: fileSizeLimit ? 0 : undefined,
      chunkEnd: fileSizeLimit,
      lastModified,
    });
  };

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getBytes().then((data) => {
    if (!data) return '';
    return `data:${data.contentType};base64,${uint8ArrayToBase64(new Uint8Array(data.bytes))}`;
  });
};
