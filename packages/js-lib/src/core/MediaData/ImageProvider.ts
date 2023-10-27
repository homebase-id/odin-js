import { createThumbnails } from './Thumbs/ThumbnailProvider';
import { decryptKeyHeader, decryptJsonContent } from '../DriveData/SecurityHelpers';
import {
  uint8ArrayToBase64,
  getNewId,
  jsonStringify64,
  base64ToUint8Array,
  stringifyToQueryParams,
  getRandom16ByteArray,
} from '../../helpers/DataUtil';
import { ApiType, DotYouClient } from '../DotYouClient';
import { encryptUrl } from '../InterceptionEncryptionUtil';
import {
  TargetDrive,
  AccessControlList,
  SecurityGroupType,
  UploadInstructionSet,
  EmbeddedThumb,
  getFileHeader,
  UploadFileMetadata,
  uploadFile,
  deleteFile,
  ImageSize,
  SystemFileType,
  ImageContentType,
  getThumbBytes,
  getPayloadBytes,
} from '../core';
import {
  ImageMetadata,
  MediaUploadMeta,
  ThumbnailInstruction,
  ImageUploadResult,
  MediaConfig,
  ThumbnailMeta,
} from './MediaTypes';

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  imageData: Uint8Array | File,
  fileMetadata?: ImageMetadata,
  uploadMeta?: MediaUploadMeta,
  thumbsToGenerate?: ThumbnailInstruction[],
  onUpdate?: (progress: number) => void
): Promise<ImageUploadResult | undefined> => {
  if (!targetDrive) {
    throw 'Missing target drive';
  }

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId ?? null,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions || null,
  };

  const { naturalSize, tinyThumb, additionalThumbnails } = await createThumbnails(
    imageData instanceof File ? new Uint8Array(await imageData.arrayBuffer()) : imageData,
    uploadMeta?.type,
    thumbsToGenerate
  );

  const previewThumbnail: EmbeddedThumb = {
    pixelWidth: naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    pixelHeight: naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    contentType: tinyThumb.contentType,
    content: uint8ArrayToBase64(tinyThumb.payload),
  };

  const additionalThumbs = additionalThumbnails.map((thumb) => {
    return {
      pixelHeight: thumb.pixelHeight,
      pixelWidth: thumb.pixelWidth,
      contentType: thumb.contentType,
    };
  });

  onUpdate?.(0.5);

  // Updating images in place is a rare thing, but if it happens there is often no versionTag, so we need to fetch it first
  let versionTag = uploadMeta?.versionTag;
  if (!versionTag && uploadMeta?.fileId) {
    versionTag = await getFileHeader(dotYouClient, targetDrive, uploadMeta.fileId).then(
      (header) => header?.fileMetadata.versionTag
    );
  }

  const metadata: UploadFileMetadata = {
    versionTag: versionTag,
    allowDistribution: uploadMeta?.allowDistribution || false,
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: MediaConfig.MediaFileType,
      jsonContent: fileMetadata ? jsonStringify64(fileMetadata) : null,
      previewThumbnail: previewThumbnail,
      additionalThumbnails: additionalThumbs,
      userDate: uploadMeta?.userDate,
      archivalStatus: uploadMeta?.archivalStatus,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    imageData,
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  onUpdate?.(0.5);
  return { fileId: result.file.fileId, previewThumbnail, type: 'image' };
};

export const removeImage = async (
  dotYouClient: DotYouClient,
  imageFileId: string,
  targetDrive: TargetDrive
) => {
  return deleteFile(dotYouClient, targetDrive, imageFileId);
};

export const getDecryptedThumbnailMeta = (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ThumbnailMeta | undefined> => {
  //it seems these will be fine for images but for video and audio we must stream decrypt
  return getFileHeader(dotYouClient, targetDrive, fileId).then((header) => {
    if (!header || !header.fileMetadata.appData.previewThumbnail) {
      return;
    }

    const previewThumbnail = header.fileMetadata.appData.previewThumbnail;
    const bytes = base64ToUint8Array(previewThumbnail.content);
    const url = `data:${previewThumbnail.contentType};base64,${uint8ArrayToBase64(bytes)}`;

    return {
      naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
      sizes: header.fileMetadata.appData.additionalThumbnails ?? [],
      url: url,
    };
  });
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
/**
 * @param isProbablyEncrypted {boolean} Hints wether or not we can expect the image to be encrypted, when true no direct url is returned instead the contents are fetched and decrypted depending on their metadata; This allows to skip a probably unneeded header call
 */
export const getDecryptedImageUrl = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<string> => {
  const getDirectImageUrl = async () => {
    const directUrl = `${dotYouClient.getEndpoint()}/drive/files/${
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
    })}`;

    if (ss) {
      return await encryptUrl(directUrl, ss);
    }

    return directUrl;
  };

  const ss = dotYouClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) return await getDirectImageUrl();

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  // Also apps can't handle a direct image url as that endpoint always expects to be authenticated,
  //   and the CAT is passed via a header that we can't set on a direct url
  if (!isProbablyEncrypted && dotYouClient.getType() !== ApiType.App) {
    const meta = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
    if (!meta?.fileMetadata.payloadIsEncrypted) {
      return await getDirectImageUrl();
    }
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageData(dotYouClient, targetDrive, fileId, size, systemFileType).then(
    (data) => {
      if (!data) return '';
      const url = `data:${data.contentType};base64,${uint8ArrayToBase64(
        new Uint8Array(data.bytes)
      )}`;

      return url;
    }
  );
};

export const getDecryptedImageData = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  size?: ImageSize,
  systemFileType?: SystemFileType
): Promise<{
  pixelHeight?: number;
  pixelWidth?: number;
  contentType: ImageContentType;
  bytes: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbBytes = await getThumbBytes(
        dotYouClient,
        targetDrive,
        fileId,
        size.pixelWidth,
        size.pixelHeight,
        { systemFileType }
      );
      if (thumbBytes) return thumbBytes;
    } catch (ex) {
      // Failed to get thumb data, try to get payload data
    }
  }

  const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, { systemFileType });
  if (!payload) return null;
  return {
    bytes: payload.bytes,
    contentType: payload.contentType as ImageContentType,
  };
};

export const getDecryptedImageMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType });
  if (!fileHeader) return null;

  return fileHeader.fileMetadata.appData.jsonContent;
};
