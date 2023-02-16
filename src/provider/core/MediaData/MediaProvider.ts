import {
  DriveSearchResult,
  EmbeddedThumb,
  TargetDrive,
  ThumbnailFileTypes,
  ThumbSize,
} from '../DriveData/DriveTypes';
import {
  AccessControlList,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { fromBlob } from './Resizer/resize';

import { encryptUrl } from '../InterceptionEncryptionUtil';
import { DotYouClient } from '../DotYouClient';
import {
  deleteFile,
  getFileHeader,
  getPayloadBytes,
  getThumbBytes,
  getRandom16ByteArray,
  uploadFile,
} from '../DriveData/DriveProvider';
import { getNewId, base64ToUint8Array, stringify, uint8ArrayToBase64 } from '../DataUtil';

type ThumbnailMeta = {
  naturalSize: { width: number; height: number };
  sizes?: ThumbSize[];
  url: string;
};

interface ThumbnailFile extends EmbeddedThumb {
  naturalSize: {
    pixelWidth: number;
    pixelHeight: number;
  };
  contentAsByteArray: Uint8Array;
  contentType: ThumbnailFileTypes;
}

export interface ImageUploadResult {
  fileId: string;
  previewThumbnail: EmbeddedThumb;
}

const baseThumbSizes = [
  { quality: 100, width: 250, height: 250 },
  { quality: 100, width: 500, height: 500 },
  { quality: 100, width: 1000, height: 1000 },
  { quality: 100, width: 2000, height: 2000 },
];

export const uploadImage = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  tag: string | undefined | string[],
  acl: AccessControlList,
  imageBytes: Uint8Array,
  fileId?: string,
  type?: 'image/png' | 'image/jpeg' | 'image/tiff' | 'image/webp' | 'image/svg+xml' | string,
  uniqueId?: string
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
      overwriteFileId: fileId ?? null,
      drive: targetDrive,
    },
    transitOptions: null,
  };

  // Create a thumbnail that fits scaled into a 20 x 20 canvas
  const tinyThumb =
    type === 'image/svg+xml'
      ? createVectorThumbnail(imageBytes)
      : await createImageThumbnail(imageBytes, 10, 20, 20);

  const applicableThumbSizes = baseThumbSizes.reduce((currArray, thumbSize) => {
    if (
      (tinyThumb.naturalSize.pixelWidth < thumbSize.width &&
        tinyThumb.naturalSize.pixelHeight < thumbSize.height) ||
      tinyThumb.contentType === 'image/svg+xml'
    ) {
      return currArray;
    } else {
      return [...currArray, thumbSize];
    }
  }, [] as { quality: number; width: number; height: number }[]);

  // Create additionalThumbnails
  const additionalThumbnails: ThumbnailFile[] = [
    tinyThumb,
    ...(await Promise.all(
      applicableThumbSizes.map(
        async (thumbSize) =>
          await createImageThumbnail(
            imageBytes,
            thumbSize.quality,
            thumbSize.width,
            thumbSize.height
          )
      )
    )),
  ];

  const previewThumbnail: EmbeddedThumb = {
    pixelWidth: tinyThumb.naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    pixelHeight: tinyThumb.naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
    contentType: tinyThumb.contentType,
    content: tinyThumb.content,
  };

  const thumbsizes = additionalThumbnails.map((thumb) => {
    return {
      pixelHeight: thumb.pixelHeight,
      pixelWidth: thumb.pixelWidth,
      contentType: thumb.contentType,
    };
  });

  const metadata: UploadFileMetadata = {
    allowDistribution: false,
    contentType: type ?? 'image/webp',
    appData: {
      tags: tag ? [...(Array.isArray(tag) ? tag : [tag])] : [],
      uniqueId: uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: 0,
      jsonContent: null,
      previewThumbnail: previewThumbnail,
      additionalThumbnails: thumbsizes,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    imageBytes,
    additionalThumbnails.map((thumb) => {
      return {
        payload: thumb.contentAsByteArray,
        filename: `${thumb.pixelWidth}x${thumb.pixelHeight}`,
        contentType: thumb.contentType,
      };
    }),
    encrypt
  );

  return { fileId: result.file.fileId, previewThumbnail };
};

export const removeImage = async (
  dotYouClient: DotYouClient,
  imageFileId: string,
  targetDrive: TargetDrive
) => {
  return deleteFile(dotYouClient, targetDrive, imageFileId);
};

export const getDecryptedMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<DriveSearchResult> => {
  return await getFileHeader(dotYouClient, targetDrive, fileId);
};

export const getDecryptedThumbnailMeta = (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ThumbnailMeta | undefined> => {
  //it seems these will be fine for images but for video and audio we must stream decrypt
  return getDecryptedMetadata(dotYouClient, targetDrive, fileId).then((header) => {
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
  size?: ThumbSize,
  isProbablyEncrypted?: boolean
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
    const meta = await getDecryptedMetadata(dotYouClient, targetDrive, fileId);
    if (!meta.fileMetadata.payloadIsEncrypted) {
      return await getDirectImageUrl();
    }
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getDecryptedImageData(dotYouClient, targetDrive, fileId, size).then((data) => {
    const url = window.URL.createObjectURL(new Blob([data.content], { type: data.contentType }));
    return url;
  });
};

export const getDecryptedImageData = async (
  dotYouClient: DotYouClient,
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
    ? getThumbBytes(dotYouClient, targetDrive, fileId, undefined, size.pixelWidth, size.pixelHeight)
    : getPayloadBytes(dotYouClient, targetDrive, fileId, undefined));

  return {
    contentType: data.contentType,
    content: data.bytes,
  };
};

const createVectorThumbnail = (imageBytes: Uint8Array): ThumbnailFile => {
  return {
    naturalSize: {
      pixelWidth: 50,
      pixelHeight: 50,
    },
    pixelWidth: 50,
    pixelHeight: 50,
    contentAsByteArray: imageBytes,
    content: uint8ArrayToBase64(imageBytes),
    contentType: `image/svg+xml`,
  };
};

const createImageThumbnail = async (
  imageBytes: Uint8Array,
  quality: number,
  maxWidth: number,
  maxHeight: number,
  format: 'webp' | 'png' | 'bmp' | 'jpeg' | 'gif' = 'webp'
): Promise<ThumbnailFile> => {
  const blob: Blob = new Blob([imageBytes], {});

  return fromBlob(blob, quality, maxWidth, maxHeight, format).then((resizedData) => {
    return resizedData.blob.arrayBuffer().then((buffer) => {
      const contentByteArray = new Uint8Array(buffer);

      return {
        naturalSize: {
          pixelWidth: resizedData.naturalSize.width,
          pixelHeight: resizedData.naturalSize.height,
        },
        pixelWidth: resizedData.size.width,
        pixelHeight: resizedData.size.height,
        contentAsByteArray: contentByteArray,
        content: uint8ArrayToBase64(contentByteArray),
        contentType: `image/${format}`,
      };
    });
  });
};
