import { ProviderBase, ProviderOptions } from '../ProviderBase';
import {
  UploadFileMetadata,
  UploadFileDescriptor,
  UploadInstructionSet,
  UploadResult,
} from './TransitTypes';
import { AesEncrypt } from '../AesEncrypt';
import { DataUtil } from '../DataUtil';
import { EncryptedKeyHeader, KeyHeader } from '../DriveData/DriveTypes';

export default class TransitProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  async UploadUsingKeyHeader(
    keyHeader: KeyHeader,
    instructions: UploadInstructionSet,
    metadata: UploadFileMetadata,
    payload: Uint8Array,
    thumbnails?: { filename: string; payload: Uint8Array }[]
  ): Promise<UploadResult> {
    //HACK: switch to byte array
    if (metadata.appData.tags)
      metadata.appData.tags = metadata.appData.tags.map((v) =>
        DataUtil.uint8ArrayToBase64(DataUtil.stringToUint8Array(v))
      );

    const descriptor: UploadFileDescriptor = {
      encryptedKeyHeader: await this.EncryptKeyHeader(keyHeader, instructions.transferIv),
      fileMetadata: metadata,
    };

    const encryptedDescriptor = await this.encryptWithSharedSecret(
      descriptor,
      instructions.transferIv
    );
    const encryptedPayload = await this.encryptWithKeyheader(payload, keyHeader);

    const data = new FormData();
    data.append('instructions', this.toBlob(instructions));
    data.append('metaData', new Blob([encryptedDescriptor]));
    data.append('payload', new Blob([encryptedPayload]));

    if (thumbnails) {
      for (let i = 0; i < thumbnails.length; i++) {
        const thumb = thumbnails[i];
        const encryptedThumbnailBytes = await this.encryptWithKeyheader(thumb.payload, keyHeader);
        data.append('thumbnail', new Blob([encryptedThumbnailBytes]), thumb.filename);
      }
    }

    const client = this.createAxiosClient(true);
    const url = '/drive/files/upload';

    const config = {
      headers: {
        'content-type': 'multipart/form-data',
      },
    };

    return client
      .post(url, data, config)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.error(error);
        throw error;
      });
  }

  async Upload(
    instructions: UploadInstructionSet,
    metadata: UploadFileMetadata,
    payload: Uint8Array
  ): Promise<UploadResult> {
    const keyHeader = this.GenerateKeyHeader();
    return this.UploadUsingKeyHeader(keyHeader, instructions, metadata, payload);
  }

  private async encryptWithKeyheader(
    content: Uint8Array,
    keyHeader: KeyHeader
  ): Promise<Uint8Array> {
    const cipher = await AesEncrypt.CbcEncrypt(content, keyHeader.iv, keyHeader.aesKey);
    return cipher;
  }

  private async encryptWithSharedSecret(o: any, iv: Uint8Array): Promise<Uint8Array> {
    //encrypt metadata with shared secret
    const ss = this.getSharedSecret();
    const json = DataUtil.JsonStringify64(o);

    if (!ss) {
      throw new Error('attempting to decrypt but missing the shared secret');
    }

    const content = new TextEncoder().encode(json);
    const cipher = await AesEncrypt.CbcEncrypt(content, iv, ss);
    return cipher;
  }

  private toBlob(o: any): Blob {
    const json = DataUtil.JsonStringify64(o);
    const content = new TextEncoder().encode(json);
    return new Blob([content]);
  }

  //Uses the app shared secret to encrypt the specified keyheader
  async EncryptKeyHeader(
    keyHeader: KeyHeader,
    transferIv: Uint8Array
  ): Promise<EncryptedKeyHeader> {
    const ss = this.getSharedSecret();
    if (!ss) {
      throw new Error('attempting to decrypt but missing the shared secret');
    }
    const combined = [...Array.from(keyHeader.iv), ...Array.from(keyHeader.aesKey)];
    const cipher = await AesEncrypt.CbcEncrypt(new Uint8Array(combined), transferIv, ss);

    return {
      iv: transferIv,
      encryptedAesKey: cipher,
      encryptionVersion: 1,
      type: 11,
    };
  }

  GenerateKeyHeader(): KeyHeader {
    return {
      iv: this.Random16(),
      aesKey: this.Random16(),
    };
  }

  Random16(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(16));
  }
}
