import { createThumbnails, tinyThumbSize } from './Thumbs/ThumbnailProvider';
import {
  uint8ArrayToBase64,
  getNewId,
  jsonStringify64,
  stringifyToQueryParams,
  getRandom16ByteArray,
  getLargestThumbOfPayload,
} from '../../helpers/DataUtil';
import { ApiType, DotYouClient } from '../DotYouClient';
import { encryptUrl } from '../InterceptionEncryptionUtil';
import {
  TargetDrive,
  AccessControlList,
  SecurityGroupType,
  UploadInstructionSet,
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
import { DEFAULT_PAYLOAD_KEY } from '../DriveData/Upload/UploadHelpers';

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  imageData: Blob | File,
  fileMetadata?: ImageMetadata,
  uploadMeta?: MediaUploadMeta,
  thumbsToGenerate?: ThumbnailInstruction[],
  onUpdate?: (progress: number) => void
): Promise<ImageUploadResult | undefined> => {
  if (!targetDrive) throw 'Missing target drive';

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions,
  };

  const { tinyThumb, additionalThumbnails } = await createThumbnails(
    imageData,
    DEFAULT_PAYLOAD_KEY,
    thumbsToGenerate
  );

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
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      fileType: MediaConfig.MediaFileType,
      content: fileMetadata ? jsonStringify64(fileMetadata) : undefined,
      previewThumbnail: tinyThumb,
      userDate: uploadMeta?.userDate,
      archivalStatus: uploadMeta?.archivalStatus,
    },
    isEncrypted: encrypt,
    accessControlList: acl,
  };

  const result = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    [{ payload: imageData, key: DEFAULT_PAYLOAD_KEY }],
    additionalThumbnails,
    encrypt
  );
  if (!result) throw new Error(`Upload failed`);

  onUpdate?.(0.5);
  return {
    fileId: result.file.fileId,
    fileKey: DEFAULT_PAYLOAD_KEY,
    previewThumbnail: tinyThumb,
    type: 'image',
  };
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
  fileId: string,
  fileKey: string,
  systemFileType: SystemFileType | undefined
): Promise<ThumbnailMeta | undefined> => {
  return getFileHeader(dotYouClient, targetDrive, fileId, { systemFileType }).then(
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
        header.fileMetadata.payloads.filter((payload) => payload.contentType.startsWith('image'))
          .length > 1 ||
        !previewThumbnail
      ) {
        url = await getDecryptedImageUrl(
          dotYouClient,
          targetDrive,
          fileId,
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
        contentType: contentType,
        url: url,
      };
    }
  );
};

// Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
/**
 * @param isProbablyEncrypted {boolean} Hints wether or not we can expect the image to be encrypted, when true no direct url is returned instead the contents are fetched and decrypted depending on their metadata; This allows to skip a probably unneeded header call
 */
export const getDecryptedImageUrl = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  size?: ImageSize,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType,
  lastModified?: number
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
      ...(size ? { payloadKey: key } : { key: key }),
      lastModified,
    })}`;

    if (ss) return await encryptUrl(directUrl, ss);
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
    if (!meta?.fileMetadata.isEncrypted) return await getDirectImageUrl();
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageData(
    dotYouClient,
    targetDrive,
    fileId,
    key,
    size,
    systemFileType,
    lastModified
  ).then((data) => {
    if (!data) return '';
    const url = `data:${data.contentType};base64,${uint8ArrayToBase64(new Uint8Array(data.bytes))}`;

    return url;
  });
};

export const getDecryptedImageData = async (
  dotYouClient: DotYouClient,
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
  bytes: ArrayBuffer;
} | null> => {
  if (size) {
    try {
      const thumbBytes = await getThumbBytes(
        dotYouClient,
        targetDrive,
        fileId,
        key,
        size.pixelWidth,
        size.pixelHeight,
        { systemFileType, lastModified }
      );
      if (thumbBytes) return thumbBytes;
    } catch (ex) {
      // Failed to get thumb data, try to get payload data
    }
  }

  const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, key, {
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
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
): Promise<ImageMetadata | null> => {
  const fileHeader = await getFileHeader<ImageMetadata>(dotYouClient, targetDrive, fileId, {
    systemFileType,
  });
  if (!fileHeader) return null;

  return fileHeader.fileMetadata.appData.content;
};
