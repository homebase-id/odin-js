import { ProviderBase, ProviderOptions } from '../ProviderBase';
import { DriveSearchResult, EmbeddedThumb, TargetDrive, ThumbSize } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  SecurityGroupType,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { fromBlob } from './Resizer/resize';
import { DataUtil } from '../DataUtil';
import { DriveProvider } from '../DriveData/DriveProvider';

interface MediaProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
}

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
}

const baseThumbSizes = [
  { quality: 100, width: 250, height: 250 },
  { quality: 100, width: 500, height: 500 },
  { quality: 100, width: 1000, height: 1000 },
];

export class MediaProvider extends ProviderBase {
  private _driveProvider: DriveProvider;

  constructor(options: MediaProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
  }

  async uploadImage(
    targetDrive: TargetDrive,
    tag: string | undefined | string[],
    acl: AccessControlList,
    imageBytes: Uint8Array,
    fileId?: string,
    type?: 'image/png' | 'image/jpeg' | 'image/tiff' | 'image/webp' | 'image/svg+xml' | string,
    uniqueId?: string
  ): Promise<string | null> {
    if (!targetDrive) {
      throw 'Missing target drive';
    }

    const encrypt = !(
      acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
      acl.requiredSecurityGroup === SecurityGroupType.Authenticated
    );

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId ?? null,
        drive: targetDrive,
      },
      transitOptions: null,
    };

    // Create a thumbnail that fits scaled into a 20 x 20 canvas
    const tinyThumb =
      type === 'image/svg+xml'
        ? await this.createVectorThumbnail(imageBytes)
        : await this.createImageThumbnail(imageBytes, 10, 20, 20);

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
            await this.createImageThumbnail(
              imageBytes,
              thumbSize.quality,
              thumbSize.width,
              thumbSize.height
            )
        )
      )),
    ];

    const metadata: UploadFileMetadata = {
      contentType: type ?? 'image/webp',
      appData: {
        tags: tag ? [...(Array.isArray(tag) ? tag : [tag])] : [],
        uniqueId: uniqueId,
        contentIsComplete: false,
        fileType: 0,
        jsonContent: null,
        previewThumbnail: {
          pixelWidth: tinyThumb.naturalSize.pixelWidth, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
          pixelHeight: tinyThumb.naturalSize.pixelHeight, // on the previewThumb we use the full pixelWidth & -height so the max size can be used
          contentType: tinyThumb.contentType,
          content: tinyThumb.content,
        },
        additionalThumbnails: additionalThumbnails.map((thumb) => {
          return {
            pixelHeight: thumb.pixelHeight,
            pixelWidth: thumb.pixelWidth,
            contentType: thumb.contentType,
          };
        }),
      },
      payloadIsEncrypted: encrypt,
      accessControlList: acl,
    };

    const result: UploadResult = await this._driveProvider.Upload(
      instructionSet,
      metadata,
      imageBytes,
      additionalThumbnails.map((thumb) => {
        return {
          payload: thumb.contentAsByteArray,
          filename: `${thumb.pixelWidth}x${thumb.pixelHeight}`,
        };
      }),
      encrypt
    );

    return result.file.fileId;
  }

  removeImage = async (imageFileId: string, targetDrive: TargetDrive) => {
    return this._driveProvider.DeleteFile(targetDrive, imageFileId);
  };

  async getDecryptedMetadata(targetDrive: TargetDrive, fileId: string): Promise<DriveSearchResult> {
    return await this._driveProvider.GetMetadata(targetDrive, fileId);
  }

  async getDecryptedThumbnailMeta(
    targetDrive: TargetDrive,
    fileId: string
  ): Promise<ThumbnailMeta | undefined> {
    //it seems these will be fine for images but for video and audio we must stream decrypt
    return this.getDecryptedMetadata(targetDrive, fileId).then((header) => {
      if (!header.fileMetadata.appData.previewThumbnail) {
        return;
      }

      const previewThumbnail = header.fileMetadata.appData.previewThumbnail;
      const buffer = DataUtil.base64ToUint8Array(previewThumbnail.content);
      const url = window.URL.createObjectURL(
        new Blob([buffer], { type: previewThumbnail.contentType })
      );

      return {
        naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
        sizes: header.fileMetadata.appData.additionalThumbnails ?? [],
        url: url,
      };
    });
  }

  // Retrieves an image/thumb, decrypts, then returns a url to be passed to an image control
  async getDecryptedImageUrl(
    targetDrive: TargetDrive,
    fileId: string,
    size?: ThumbSize
  ): Promise<string> {
    return this.getDecryptedImageData(targetDrive, fileId, size).then((data) => {
      const url = window.URL.createObjectURL(new Blob([data.content], { type: data.contentType }));
      return url;
    });
  }

  async getDecryptedImageData(
    targetDrive: TargetDrive,
    fileId: string,
    size?: ThumbSize
  ): Promise<{
    pixelHeight: number;
    pixelWidth: number;
    contentType: string;
    content: ArrayBuffer;
  }> {
    const header = await this._driveProvider.GetMetadata(targetDrive, fileId);
    const keyHeader = header.fileMetadata.payloadIsEncrypted
      ? await this._driveProvider.DecryptKeyHeader(header.sharedSecretEncryptedKeyHeader)
      : undefined;

    const bytesPromise = size
      ? this._driveProvider.GetThumbBytes(
          targetDrive,
          fileId,
          keyHeader,
          size.pixelWidth,
          size.pixelHeight
        )
      : this._driveProvider.GetPayloadBytes(targetDrive, fileId, keyHeader);

    return {
      pixelHeight: header.fileMetadata.appData.previewThumbnail?.pixelHeight ?? 0,
      pixelWidth: header.fileMetadata.appData.previewThumbnail?.pixelWidth ?? 0,
      contentType: header.fileMetadata.appData.previewThumbnail?.contentType ?? '',
      content: await bytesPromise,
    };
  }

  private async createVectorThumbnail(imageBytes: Uint8Array) {
    return {
      naturalSize: {
        pixelWidth: 50,
        pixelHeight: 50,
      },
      pixelWidth: 50,
      pixelHeight: 50,
      contentAsByteArray: imageBytes,
      content: DataUtil.uint8ArrayToBase64(imageBytes),
      contentType: `image/svg+xml`,
    };
  }

  private async createImageThumbnail(
    imageBytes: Uint8Array,
    quality: number,
    maxWidth: number,
    maxHeight: number,
    format: 'webp' | 'png' | 'bmp' | 'jpeg' | 'gif' = 'webp'
  ): Promise<ThumbnailFile> {
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
          content: DataUtil.uint8ArrayToBase64(contentByteArray),
          contentType: `image/${format}`,
        };
      });
    });
  }
}
