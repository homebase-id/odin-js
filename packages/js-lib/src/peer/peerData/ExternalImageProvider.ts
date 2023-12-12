import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { TargetDrive, SystemFileType, ImageSize, ImageContentType } from '../../core/core';
import {
  getLargestThumbOfPayload,
  stringifyToQueryParams,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import { ThumbnailMeta } from '../../media/MediaTypes';
import { tinyThumbSize } from '../../media/media';
import {
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getFileHeaderOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
  getThumbBytesOverPeerByGlobalTransitId,
} from '../peer';
import {
  getFileHeaderOverPeer,
  getPayloadBytesOverPeer,
  getThumbBytesOverPeer,
} from './File/PeerFileProvider';

export const getDecryptedThumbnailMetaOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  globalTransitId: string | undefined,
  fileKey: string,
  systemFileType: SystemFileType | undefined
): Promise<ThumbnailMeta | undefined> => {
  return (
    globalTransitId
      ? getFileHeaderBytesOverPeerByGlobalTransitId(
          dotYouClient,
          odinId,
          targetDrive,
          globalTransitId,
          {
            systemFileType,
          }
        )
      : getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, { systemFileType })
  ).then(async (header) => {
    if (!header) return;

    const previewThumbnail = header.fileMetadata.appData.previewThumbnail;

    let url: string | undefined;
    let contentType: ImageContentType | undefined =
      previewThumbnail?.contentType as ImageContentType;
    const naturalSize = {
      width: previewThumbnail?.pixelWidth || 0,
      height: previewThumbnail?.pixelHeight || 0,
    };
    if (
      header.fileMetadata.payloads.filter((payload) => payload.contentType.startsWith('image'))
        .length > 1 ||
      !previewThumbnail
    ) {
      url = await getDecryptedImageUrlOverPeer(
        dotYouClient,
        odinId,
        targetDrive,
        header.fileId || fileId,
        fileKey,
        { pixelHeight: tinyThumbSize.height, pixelWidth: tinyThumbSize.width },
        header.fileMetadata.isEncrypted,
        systemFileType,
        header.fileMetadata.updated
      );

      const correspondingPayload = header.fileMetadata.payloads.find(
        (payload) => payload.key === fileKey
      );
      const largestThumb = getLargestThumbOfPayload(correspondingPayload);
      naturalSize.width = largestThumb?.pixelWidth || naturalSize.width;
      naturalSize.height = largestThumb?.pixelHeight || naturalSize.height;
      if (largestThumb && 'contentType' in largestThumb)
        contentType = largestThumb.contentType as ImageContentType;
    } else {
      url = `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
    }
    return {
      naturalSize: naturalSize,
      sizes:
        header.fileMetadata.payloads.find((payload) => payload.key === fileKey)?.thumbnails ?? [],
      url: url,
      contentType: contentType,
    };
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType,
  lastModified?: number
): Promise<string> => {
  const getDirectImageUrl = async (fileId: string) => {
    return `https://${odinId}/api/guest/v1/drive/files/${
      size ? 'thumb' : 'payload'
    }?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      ...(size
        ? {
            width: size.pixelWidth,
            height: size.pixelHeight,
          }
        : {}),
      xfst: systemFileType || 'Standard',
      iac: true,
      ...(size ? { payloadKey: key } : { key: key }),
      lastModified,
    })}`;
  };

  // const ss = dotYouClient.getSharedSecret();

  // // If there is no shared secret, we wouldn't even be able to decrypt
  // TODO: if (!ss) return await getDirectImageUrl();

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  // Also apps can't handle a direct image url as that endpoint always expects to be authenticated,
  //   and the CAT is passed via a header that we can't set on a direct url
  if (!isProbablyEncrypted && dotYouClient.getType() !== ApiType.App) {
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
      return await getDirectImageUrl(meta.fileId);
    }
  }

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageDataOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
    key,
    size,
    systemFileType,
    lastModified
  ).then((data) => {
    if (!data) return '';
    const url = `data:${data.contentType};base64,${uint8ArrayToBase64(
      new Uint8Array(data.content)
    )}`;
    return url;
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType,
  lastModified?: number
): Promise<string> => {
  const getDirectImageUrl = async () => {
    return `https://${odinId}/api/guest/v1/drive/files/${
      size ? 'thumb' : 'payload'
    }?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      ...(size
        ? {
            width: size.pixelWidth,
            height: size.pixelHeight,
          }
        : {}),
      xfst: systemFileType || 'Standard',
      iac: true,
      ...(size ? { payloadKey: key } : { key: key }),
      lastModified,
    })}`;
  };

  const ss = dotYouClient.getSharedSecret();

  // // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss || dotYouClient.getType() === ApiType.Guest) return await getDirectImageUrl();

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  // Also apps can't handle a direct image url as that endpoint always expects to be authenticated,
  //   and the CAT is passed via a header that we can't set on a direct url
  if (!isProbablyEncrypted && dotYouClient.getType() !== ApiType.App) {
    const meta = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
      systemFileType,
    });
    if (!meta?.fileMetadata.isEncrypted) {
      return await getDirectImageUrl();
    }
  }

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageDataOverPeer(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    key,
    size,
    systemFileType,
    lastModified
  ).then((data) => {
    if (!data) return '';
    const url = `data:${data.contentType};base64,${uint8ArrayToBase64(
      new Uint8Array(data.content)
    )}`;
    return url;
  });
};

export const getDecryptedImageDataOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  size?: ImageSize,
  systemFileType?: SystemFileType,
  lastModified?: number
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: ImageContentType;
  content: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbData = await getThumbBytesOverPeerByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        globalTransitId,
        key,
        size.pixelWidth,
        size.pixelHeight,
        { systemFileType, lastModified }
      );
      if (thumbData)
        return {
          contentType: thumbData.contentType,
          content: thumbData.bytes,
        };
    } catch (ex) {
      // Failed to get thumb data, try to get payload data
    }
  }

  const payloadData = await getPayloadBytesOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
    key,
    {
      systemFileType,
      lastModified,
    }
  );

  if (!payloadData) return null;

  return {
    contentType: payloadData.contentType as ImageContentType,
    content: payloadData.bytes,
  };
};

export const getDecryptedImageDataOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  size?: ImageSize,
  systemFileType?: SystemFileType,
  lastModified?: number
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: ImageContentType;
  content: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbData = await getThumbBytesOverPeer(
        dotYouClient,
        odinId,
        targetDrive,
        fileId,
        key,
        size.pixelWidth,
        size.pixelHeight,
        { systemFileType, lastModified }
      );
      if (thumbData)
        return {
          contentType: thumbData.contentType,
          content: thumbData.bytes,
        };
    } catch (ex) {
      // Failed to get thumb data, try to get payload data
    }
  }

  const payloadData = await getPayloadBytesOverPeer(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    key,
    {
      systemFileType,
      lastModified,
    }
  );

  if (!payloadData) return null;

  return {
    contentType: payloadData.contentType as ImageContentType,
    content: payloadData.bytes,
  };
};
