import { EmbeddedThumb, ImageContentType, ImageSize, TargetDrive } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  SecurityGroupType,
  SystemFileType,
  TransitOptions,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';

import { encryptUrl } from '../InterceptionEncryptionUtil';
import { DotYouClient } from '../DotYouClient';
import {
  deleteFile,
  getFileHeader,
  getPayloadBytes,
  getThumbBytes,
  uploadFile,
} from '../DriveData/DriveProvider';
import { getNewId, base64ToUint8Array, stringify, uint8ArrayToBase64 } from '../helpers/DataUtil';
import { ImageUploadResult, MediaConfig, ThumbnailMeta } from './MediaTypes';
import { createThumbnails } from './Thumbs/ThumbnailProvider';
import { getRandom16ByteArray } from '../DriveData/UploadHelpers';

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  imageData: Uint8Array | File,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    type?: ImageContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
  }
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
    uploadMeta?.type
  );

  const previewThumbnail: EmbeddedThumb = {
    pixelWidth: naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    pixelHeight: naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    contentType: tinyThumb.contentType,
    content: uint8ArrayToBase64(tinyThumb.payload),
  };

  const thumbsizes = additionalThumbnails.map((thumb) => {
    return {
      pixelHeight: thumb.pixelHeight,
      pixelWidth: thumb.pixelWidth,
      contentType: thumb.contentType,
    };
  });

  const metadata: UploadFileMetadata = {
    allowDistribution: uploadMeta?.allowDistribution || false,
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: MediaConfig.MediaFileType,
      jsonContent: null,
      previewThumbnail: previewThumbnail,
      additionalThumbnails: thumbsizes,
      userDate: uploadMeta?.userDate,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    imageData,
    additionalThumbnails,
    encrypt
  );

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
/**
 * @param isProbablyEncrypted {boolean} Hints wether or not we can expect the image to be encrypted, when true no direct url is returned instead the contents are fetched and decrypted depending on their metadata; This allows to skip a probably unneeded header call, but does require an createObjectUrl
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
    }?${stringify({
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
  if (!ss) {
    return await getDirectImageUrl();
  }

  // If the contents is probably encrypted, we don't bother fetching the header
  if (!isProbablyEncrypted) {
    const meta = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
    if (!meta.fileMetadata.payloadIsEncrypted) {
      return await getDirectImageUrl();
    }
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageData(dotYouClient, targetDrive, fileId, size, systemFileType).then(
    (data) => {
      const url = window.URL.createObjectURL(new Blob([data.content], { type: data.contentType }));
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
  content: ArrayBuffer;
}> => {
  const data = await (size
    ? getThumbBytes(
        dotYouClient,
        targetDrive,
        fileId,
        undefined,
        size.pixelWidth,
        size.pixelHeight,
        systemFileType
      )
    : getPayloadBytes(dotYouClient, targetDrive, fileId, undefined, systemFileType));

  return {
    contentType: data.contentType,
    content: data.bytes,
  };
};
