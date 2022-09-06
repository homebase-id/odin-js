import { ProviderBase, ProviderOptions } from '../ProviderBase';
import { EmbeddedThumb, KeyHeader, TargetDrive, ThumbSize } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../DriveData/DriveUploadTypes';
import { fromBlob } from './Resizer/resize';
import { DataUtil } from '../DataUtil';
import { DriveProvider } from '../DriveData/DriveProvider';
import { nanoid } from 'nanoid';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

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

export default class MediaProvider extends ProviderBase {
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
    tag: string | undefined,
    acl: AccessControlList,
    imageBytes: Uint8Array,
    fileId?: string
  ): Promise<string | null> {
    if (!targetDrive) {
      throw 'Missing target drive';
    }

    const instructionSet: UploadInstructionSet = {
      transferIv: this._driveProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId ?? null,
        drive: targetDrive,
      },
      transitOptions: null,
    };

    // Create a thumbnail that fits scaled into a 20 x 20 canvas
    const tinyThumb = await this.createImageThumbnail(imageBytes, 10, 20, 20);

    const applicableThumbSizes = baseThumbSizes.reduce((currArray, thumbSize) => {
      if (
        tinyThumb.naturalSize.pixelWidth < thumbSize.width &&
        tinyThumb.naturalSize.pixelHeight < thumbSize.height
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
      contentType: 'application/json',
      appData: {
        tags: [tag ?? DataUtil.toByteArrayId(nanoid())],
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
      payloadIsEncrypted: false,
      accessControlList: acl,
    };

    // TODO: do something with the additionathumb content, how to pass it along??
    const result: UploadResult = await this._driveProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      imageBytes,
      additionalThumbnails.map((thumb) => {
        return {
          payload: thumb.contentAsByteArray,
          filename: `${thumb.pixelWidth}x${thumb.pixelHeight}`,
        };
      })
    );

    return result.file.fileId;
  }

  removeImage = async (imageFileId: string, targetDrive: TargetDrive) => {
    return this._driveProvider.DeleteFile(targetDrive, imageFileId);
  };

  async getDecryptedThumbnailMeta(
    targetDrive: TargetDrive,
    fileId: string
  ): Promise<ThumbnailMeta | undefined> {
    //it seems these will be fine for images but for video and audio we must stream decrypt
    return this._driveProvider.GetMetadata(targetDrive, fileId).then((header) => {
      if (!header.fileMetadata.appData.previewThumbnail) {
        return;
      }

      const previewThumbnail = header.fileMetadata.appData.previewThumbnail;
      const buffer = DataUtil.base64ToUint8Array(previewThumbnail.content);
      const url = window.URL.createObjectURL(new Blob([buffer]));

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
    const getBytes = size
      ? this._driveProvider.GetThumbBytes(
          targetDrive,
          fileId,
          FixedKeyHeader,
          size.pixelWidth,
          size.pixelHeight
        )
      : this._driveProvider.GetPayloadBytes(targetDrive, fileId, FixedKeyHeader);

    return getBytes.then((buffer) => {
      const url = window.URL.createObjectURL(new Blob([buffer]));
      return url;
    });
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
