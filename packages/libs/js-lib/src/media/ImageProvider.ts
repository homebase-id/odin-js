import { tinyThumbSize } from './Thumbs/ThumbnailProvider';
import { getLargestThumbOfPayload } from '../helpers/DataUtil';
import { OdinClient } from '../core/OdinClient';
import {
  TargetDrive,
  getFileHeader,
  ImageSize,
  SystemFileType,
  ImageContentType,
  getThumbBytes,
  getPayloadBytes,
} from '../core/core';
import { ImageMetadata, ThumbnailMeta } from './MediaTypes';
import { getDecryptedMediaUrl } from './MediaProvider';

export const getDecryptedThumbnailMeta = (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  systemFileType: SystemFileType | undefined
): Promise<ThumbnailMeta | undefined> => {
  return getFileHeader(odinClient, targetDrive, fileId, { systemFileType }).then(
    async (header) => {
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
        (header.fileMetadata.payloads &&
          header.fileMetadata.payloads.filter((payload) => payload.contentType.startsWith('image'))
            .length > 1) ||
        !previewThumbnail
      ) {
        url = await getDecryptedImageUrl(
          odinClient,
          targetDrive,
          fileId,
          fileKey,
          header.fileMetadata.isEncrypted,
          header.fileMetadata.updated,
          {
            size: { pixelHeight: tinyThumbSize.height, pixelWidth: tinyThumbSize.width },
            systemFileType,
          }
        );

        const correspondingPayload = header.fileMetadata.payloads?.find(
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
          header.fileMetadata.payloads?.find((payload) => payload.key === fileKey)?.thumbnails ??
          [],
        contentType: contentType,
        url: url,
      };
    }
  );
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrl = getDecryptedMediaUrl;
export const getDecryptedImageData = async (
  odinClient: OdinClient,
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
  bytes: Uint8Array;
} | null> => {
  if (size) {
    try {
      const thumbBytes = await getThumbBytes(
        odinClient,
        targetDrive,
        fileId,
        key,
        size.pixelWidth,
        size.pixelHeight,
        { systemFileType, lastModified }
      );
      if (thumbBytes) return thumbBytes;
    } catch {
      // Failed to get thumb data, try to get payload data
    }
  }

  const payload = await getPayloadBytes(odinClient, targetDrive, fileId, key, {
    systemFileType,
    lastModified,
  });
  if (!payload) return null;
  return {
    bytes: payload.bytes,
    contentType: payload.contentType as ImageContentType,
  };
};

export const getDecryptedImageMetadata = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<ImageMetadata | null> => {
  const fileHeader = await getFileHeader<ImageMetadata>(odinClient, targetDrive, fileId, {
    systemFileType,
  });
  if (!fileHeader) return null;

  return fileHeader.fileMetadata.appData.content;
};
