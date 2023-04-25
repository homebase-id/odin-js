import { base64ToUint8Array, stringify } from '../../core/helpers/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import {
  TargetDrive,
  DriveSearchResult,
  ImageContentType,
  ImageSize,
} from '../../core/DriveData/DriveTypes';
import { SystemFileType } from '../../core/DriveData/DriveUploadTypes';
import { ThumbnailMeta } from '../../core/MediaData/MediaTypes';
import {
  getFileHeaderOverTransit,
  getThumbBytesOverTransit,
  getPayloadBytesOverTransit,
} from './TransitProvider';

export const getDecryptedMetadataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<DriveSearchResult> => {
  return await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId, systemFileType);
};

export const getDecryptedThumbnailMetaOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<ThumbnailMeta | undefined> => {
  //it seems these will be fine for images but for video and audio we must stream decrypt
  return getDecryptedMetadataOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    systemFileType
  ).then((header) => {
    if (!header.fileMetadata.appData.previewThumbnail) {
      return;
    }

    const previewThumbnail = header.fileMetadata.appData.previewThumbnail;
    const buffer = base64ToUint8Array(previewThumbnail.content);
    const url = window.URL.createObjectURL(
      new Blob([buffer], { type: previewThumbnail.contentType })
    );

    return {
      naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
      sizes: header.fileMetadata.appData.additionalThumbnails ?? [],
      url: url,
    };
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  systemFileType?: SystemFileType
): Promise<string> => {
  const meta = await getDecryptedMetadataOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    systemFileType
  );
  if (!meta.fileMetadata.payloadIsEncrypted && size) {
    // Build get url:
    return `https://${odinId}/api/youauth/v1/drive/files/${size ? 'thumb' : 'payload'}?${stringify({
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
  }

  // Fallback with download over transit
  return getDecryptedImageDataOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    size,
    systemFileType
  ).then((data) => {
    const url = window.URL.createObjectURL(new Blob([data.content], { type: data.contentType }));
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
}> => {
  const data = await (size
    ? getThumbBytesOverTransit(
        dotYouClient,
        odinId,
        targetDrive,
        fileId,
        undefined,
        size.pixelWidth,
        size.pixelHeight,
        systemFileType
      )
    : getPayloadBytesOverTransit(
        dotYouClient,
        odinId,
        targetDrive,
        fileId,
        undefined,
        systemFileType
      ));

  return {
    contentType: data.contentType,
    content: data.bytes,
  };
};
