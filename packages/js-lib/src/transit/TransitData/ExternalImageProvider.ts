import { ApiType, DotYouClient } from '../../core/DotYouClient';
import {
  TargetDrive,
  SystemFileType,
  ThumbnailMeta,
  ImageSize,
  ImageContentType,
  tinyThumbSize,
} from '../../core/core';
import {
  getLargestThumbOfPayload,
  stringifyToQueryParams,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import {
  getFileHeaderBytesOverTransitByGlobalTransitId,
  getFileHeaderOverTransitByGlobalTransitId,
  getPayloadBytesOverTransitByGlobalTransitId,
  getThumbBytesOverTransitByGlobalTransitId,
} from '../transit';
import {
  getFileHeaderOverTransit,
  getPayloadBytesOverTransit,
  getThumbBytesOverTransit,
} from './File/TransitFileProvider';

export const getDecryptedThumbnailMetaOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  globalTransitId: string | undefined,
  fileKey: string
): Promise<ThumbnailMeta | undefined> => {
  return (
    globalTransitId
      ? getFileHeaderBytesOverTransitByGlobalTransitId(
          dotYouClient,
          odinId,
          targetDrive,
          globalTransitId
        )
      : getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId)
  ).then(async (header) => {
    if (!header?.fileMetadata.appData.previewThumbnail) return;

    const previewThumbnail = header.fileMetadata.appData.previewThumbnail;

    let url: string | undefined;
    const naturalSize = {
      width: previewThumbnail.pixelWidth,
      height: previewThumbnail.pixelHeight,
    };
    if (
      header.fileMetadata.payloads.filter((payload) => payload.contentType.startsWith('image'))
        .length > 1
    ) {
      url = await getDecryptedImageUrlOverTransit(
        dotYouClient,
        odinId,
        targetDrive,
        header.fileId || fileId,
        fileKey,
        { pixelHeight: tinyThumbSize.height, pixelWidth: tinyThumbSize.width },
        header.fileMetadata.isEncrypted
      );

      const correspondingPayload = header.fileMetadata.payloads.find(
        (payload) => payload.key === fileKey
      );
      const largestThumb = getLargestThumbOfPayload(correspondingPayload);
      naturalSize.width = largestThumb?.pixelWidth || naturalSize.width;
      naturalSize.height = largestThumb?.pixelHeight || naturalSize.height;
    } else {
      url = `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
    }
    return {
      naturalSize: naturalSize,
      sizes:
        header.fileMetadata.payloads.find((payload) => payload.key === fileKey)?.thumbnails ?? [],
      url: url,
      contentType: previewThumbnail.contentType as ImageContentType,
    };
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverTransitByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
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
    const meta = await getFileHeaderOverTransitByGlobalTransitId(
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
  return getDecryptedImageDataOverTransitByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
    key,
    size,
    systemFileType
  ).then((data) => {
    if (!data) return '';
    const url = `data:${data.contentType};base64,${uint8ArrayToBase64(
      new Uint8Array(data.content)
    )}`;
    return url;
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
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
    const meta = await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, {
      systemFileType,
    });
    if (!meta?.fileMetadata.isEncrypted) {
      return await getDirectImageUrl();
    }
  }

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageDataOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    key,
    size,
    systemFileType
  ).then((data) => {
    if (!data) return '';
    const url = `data:${data.contentType};base64,${uint8ArrayToBase64(
      new Uint8Array(data.content)
    )}`;
    return url;
  });
};

export const getDecryptedImageDataOverTransitByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  globalTransitId: string,
  key: string,
  size?: ImageSize,
  systemFileType?: SystemFileType
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: ImageContentType;
  content: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbData = await getThumbBytesOverTransitByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        globalTransitId,
        key,
        undefined,
        size.pixelWidth,
        size.pixelHeight,
        systemFileType
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

  const payloadData = await getPayloadBytesOverTransitByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    globalTransitId,
    key,
    {
      systemFileType,
    }
  );

  if (!payloadData) return null;

  return {
    contentType: payloadData.contentType as ImageContentType,
    content: payloadData.bytes,
  };
};

export const getDecryptedImageDataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  size?: ImageSize,
  systemFileType?: SystemFileType
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: ImageContentType;
  content: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbData = await getThumbBytesOverTransit(
        dotYouClient,
        odinId,
        targetDrive,
        fileId,
        key,
        undefined,
        size.pixelWidth,
        size.pixelHeight,
        systemFileType
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

  const payloadData = await getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    key,
    {
      systemFileType,
    }
  );

  if (!payloadData) return null;

  return {
    contentType: payloadData.contentType as ImageContentType,
    content: payloadData.bytes,
  };
};
