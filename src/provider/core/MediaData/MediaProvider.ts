import { Guid } from 'guid-typescript';
import { ProviderBase, ProviderOptions } from '../ProviderBase';
import { KeyHeader, TargetDrive } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from '../TransitData/TransitTypes';
import { fromBlob } from './Resizer/resize';
import { DataUtil } from '../DataUtil';
import { DriveProvider } from '../DriveData/DriveProvider';
import TransitProvider from '../TransitData/TransitProvider';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

interface MediaProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
}

type ThumbnailMeta = { naturalSize: { width: number; height: number }; url: string };

export default class MediaProvider extends ProviderBase {
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;

  constructor(options: MediaProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });
    this._driveProvider = options.driveProvider;
    this._transitProvider = options.transitProvider;
  }

  //gets the data available for the specified attribute if available
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
      transferIv: this._transitProvider.Random16(),
      storageOptions: {
        overwriteFileId: fileId ?? null,
        drive: targetDrive,
      },
      transitOptions: null,
    };

    // console.log("full size:", MediaProvider.formatSizeString(imageBytes.byteLength));

    // TODO Can be decreased even further, review which size gives optimal blurred preloader
    // Create a thumbnail that fits scaled into a 300 x 300 canvas
    const thumbnailDataMaxW = await this.createImageThumbnail(imageBytes, 10, 300, 'auto');
    const thumbnailDataMaxH = await this.createImageThumbnail(imageBytes, 10, 'auto', 300);
    const thumbnailData =
      thumbnailDataMaxW.byteArray > thumbnailDataMaxH.byteArray
        ? thumbnailDataMaxH
        : thumbnailDataMaxW;
    // console.log("thumbnail:", MediaProvider.formatSizeString(thumbnailBytes.byteLength));

    const thumbnailJson = DataUtil.JsonStringify64(thumbnailData);

    const metadata: UploadFileMetadata = {
      contentType: 'application/json',
      appData: {
        tags: [tag ?? Guid.createEmpty().toString()],
        contentIsComplete: false,
        fileType: 0,
        jsonContent: thumbnailJson,
      },
      payloadIsEncrypted: false,
      accessControlList: acl,
    };

    const result: UploadResult = await this._transitProvider.UploadUsingKeyHeader(
      FixedKeyHeader,
      instructionSet,
      metadata,
      imageBytes
    );

    return result.file.fileId;
  }

  removeImage = async (imageFileId: string, targetDrive: TargetDrive) => {
    return this._driveProvider.DeleteFile(targetDrive, imageFileId);
  };

  async getDecryptedThumbnailMeta(
    targetDrive: TargetDrive,
    fileId: string
  ): Promise<ThumbnailMeta> {
    //it seems these will be fine for images but for video and audio we must stream decrypt
    return this._driveProvider.GetMetadata(targetDrive, fileId).then((header) => {
      const thumbnail = JSON.parse(header.fileMetadata.appData.jsonContent);
      const buffer = DataUtil.base64ToUint8Array(thumbnail.byteArray);
      const url = window.URL.createObjectURL(new Blob([buffer]));
      return { naturalSize: thumbnail.naturalSize, url: url };
    });
  }

  //retrieves an image, decrypts, then returns a url to be passed to an image control
  async getDecryptedImageUrl(targetDrive: TargetDrive, fileId: string): Promise<string> {
    //it seems these will be fine for images but for video and audio we must stream decrypt

    return this._driveProvider
      .GetPayloadBytes(targetDrive, fileId, FixedKeyHeader)
      .then((buffer) => {
        const url = window.URL.createObjectURL(new Blob([buffer]));
        return url;
      });
  }

  private async createImageThumbnail(
    imageBytes: Uint8Array,
    quality = 80,
    width: number | 'auto' = 0,
    height: number | 'auto' = 0
  ): Promise<{ naturalSize: { width: number; height: number }; byteArray: Uint8Array }> {
    // output width. 0 will keep its original width and 'auto' will calculate its scale from height.
    // output height. 0 will keep its original height and 'auto' will calculate its scale from width.
    // file format: png, jpeg, bmp, gif, webp. If null, original format will be used.
    const format = 'webp';

    const blob: Blob = new Blob([imageBytes], {});

    return fromBlob(blob, quality, width, height, format).then((resizedData) => {
      return resizedData.blob.arrayBuffer().then((buffer) => {
        return { naturalSize: resizedData.naturalSize, byteArray: new Uint8Array(buffer) };
      });
    });
  }

  private static formatSizeString(x: string) {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let l = 0,
      n = parseInt(x, 10) || 0;
    while (n >= 1024 && ++l) {
      n = n / 1024;
    }
    return n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l];
  }
}
