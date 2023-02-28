import { base64ToUint8Array, stringify } from '../../core/DataUtil';
import { DotYouClient } from '../../core/DotYouClient';
import { ThumbSize, TargetDrive, DriveSearchResult } from '../../core/DriveData/DriveTypes';
import {
  getFileHeaderOverTransit,
  getThumbBytesOverTransit,
  getPayloadBytesOverTransit,
} from '../../core/TransitData/TransitProvider';

export type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ThumbSize[];
  url: string;
};

export const getDecryptedMetadataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string
): Promise<DriveSearchResult> => {
  return await getFileHeaderOverTransit(dotYouClient, odinId, targetDrive, fileId);
};

export const getDecryptedThumbnailMetaOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ThumbnailMeta | undefined> => {
  //it seems these will be fine for images but for video and audio we must stream decrypt
  return getDecryptedMetadataOverTransit(dotYouClient, odinId, targetDrive, fileId).then(
    (header) => {
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
    }
  );
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
export const getDecryptedImageUrlOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ThumbSize
): Promise<string> => {
  const meta = await getDecryptedMetadataOverTransit(dotYouClient, odinId, targetDrive, fileId);
  if (!meta.fileMetadata.payloadIsEncrypted && size) {
    // Build get url:
    return `https://${odinId}/api/youauth/v1/drive/files/thumb?${stringify({
      ...targetDrive,
      fileId,
      width: size.pixelWidth,
      height: size.pixelHeight,
    })}`;
  }

  // Fallback with download over transit
  return getDecryptedImageDataOverTransit(dotYouClient, odinId, targetDrive, fileId, size).then(
    (data) => {
      const url = window.URL.createObjectURL(new Blob([data.content], { type: data.contentType }));
      return url;
    }
  );
};

export const getDecryptedImageDataOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ThumbSize
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: string;
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
        size.pixelHeight
      )
    : getPayloadBytesOverTransit(dotYouClient, odinId, targetDrive, fileId));

  return {
    contentType: data.contentType,
    content: data.bytes,
  };
};
