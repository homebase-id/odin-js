import { OdinClient } from '../../../core/OdinClient';
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
  odinClient: OdinClient,
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
        odinClient,
        odinId,
        targetDrive,
        globalTransitId,
        {
          systemFileType,
        }
      )
      : getFileHeaderOverPeer(odinClient, odinId, targetDrive, fileId, { systemFileType })
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
        odinClient,
        odinId,
        targetDrive,
        header.fileId || fileId,
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
  odinClient: OdinClient,
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
        odinClient,
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
    odinClient,
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
  odinClient: OdinClient,
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
        odinClient,
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
    odinClient,
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
