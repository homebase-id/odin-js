import { ApiType, DotYouClient } from '../../core/DotYouClient';
import {
  TargetDrive,
  SystemFileType,
  ThumbnailMeta,
  ImageSize,
  ImageContentType,
} from '../../core/core';
import { base64ToUint8Array, stringify, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import {
  getFileHeaderOverTransit,
  getThumbBytesOverTransit,
  getPayloadBytesOverTransit,
} from './TransitProvider';

export const getDecryptedThumbnailMetaOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<ThumbnailMeta | undefined> => {
  //it seems these will be fine for images but for video and audio we must stream decrypt
  return getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, systemFileType).then(
    (header) => {
      if (!header.fileMetadata.appData.previewThumbnail) {
        return;
      }

      const previewThumbnail = header.fileMetadata.appData.previewThumbnail;
      const bytes = base64ToUint8Array(previewThumbnail.content);
      const url = `data:${previewThumbnail.contentType};base64,${uint8ArrayToBase64(bytes)}`;

      return {
        naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
        sizes: header.fileMetadata.appData.additionalThumbnails ?? [],
        url: url,
        contentType: previewThumbnail.contentType,
      };
    }
  );
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<string> => {
  const getDirectImageUrl = async () => {
    return `https://${odinId}/api/guest/v1/drive/files/${size ? 'thumb' : 'payload'}?${stringify({
      ...targetDrive,
      fileId,
      ...(size
        ? {
            width: size.pixelWidth,
            height: size.pixelHeight,
          }
        : {}),
      xfst: systemFileType || 'Standard',
    })}`;
  };

  // Shortcut for apps that wouldn't be able to fetch anything over transit
  // TODO: Change to have apps do fetch something over transit (When the BE allows it)
  if (isProbablyEncrypted === false && dotYouClient.getType() === ApiType.App)
    return getDirectImageUrl();

  // If the contents is probably encrypted, we don't bother fetching the header
  if (!isProbablyEncrypted) {
    const meta = await getFileHeaderOverTransit(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      systemFileType
    );

    if (!meta.fileMetadata.payloadIsEncrypted) getDirectImageUrl();
  }

  // Direct download over transit of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageDataOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
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

export const getDecryptedImageDataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
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
    undefined,
    systemFileType
  );

  if (!payloadData) return null;

  return {
    contentType: payloadData.contentType,
    content: payloadData.bytes,
  };
};
