import { DotYouClient } from '../../../core/DotYouClient';
import { TargetDrive, SystemFileType, ImageSize, ImageContentType } from '../../../core/core';
import { getLargestThumbOfPayload } from '../../../helpers/DataUtil';
import { ThumbnailMeta } from '../../../media/MediaTypes';
import { tinyThumbSize } from '../../../media/media';
import {
  getFileHeaderBytesOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
  getThumbBytesOverPeerByGlobalTransitId,
} from '../../peer';
import {
  getFileHeaderOverPeer,
  getPayloadBytesOverPeer,
  getThumbBytesOverPeer,
} from '../File/PeerFileProvider';
import {
  getDecryptedMediaUrlOverPeerByGlobalTransitId,
  getDecryptedMediaUrlOverPeer,
} from './ExternalMediaProvider';

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
      (header.fileMetadata.payloads &&
        header.fileMetadata.payloads.filter((payload) => payload.contentType.startsWith('image'))
          .length > 1) ||
      !previewThumbnail
    ) {
      url = await getDecryptedImageUrlOverPeer(
        dotYouClient,
        odinId,
        targetDrive,
        header.fileId || fileId,
        fileKey,
        header.fileMetadata.isEncrypted,
        header.fileMetadata.updated,
        {
          size: { pixelHeight: tinyThumbSize.maxPixelDimension, pixelWidth: tinyThumbSize.maxPixelDimension },
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
        header.fileMetadata.payloads?.find((payload) => payload.key === fileKey)?.thumbnails ?? [],
      url: url,
      contentType: contentType,
    };
  });
};

export const getDecryptedImageUrlOverPeerByGlobalTransitId =
  getDecryptedMediaUrlOverPeerByGlobalTransitId;
export const getDecryptedImageUrlOverPeer = getDecryptedMediaUrlOverPeer;

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
    } catch {
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
    } catch {
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
