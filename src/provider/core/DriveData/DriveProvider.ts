import { ApiType, ProviderBase, ProviderOptions } from '../ProviderBase';
import { AesEncrypt } from '../AesEncrypt';
import { DataUtil } from '../DataUtil';
import {
  KeyHeader,
  DriveDefinition,
  TargetDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  GetModifiedResultOptions,
  QueryBatchResponse,
  QueryModifiedResponse,
  DriveSearchResult,
  EncryptedKeyHeader,
  FileMetadata,
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import { PagedResult, PagingOptions } from '../Types';
import {
  UploadFileDescriptor,
  UploadFileMetadata,
  UploadInstructionSet,
  UploadResult,
} from './DriveUploadTypes';

interface GetModifiedRequest {
  queryParams: FileQueryParams;
  resultOptions: GetModifiedResultOptions;
}

interface GetBatchRequest {
  queryParams: FileQueryParams;
  resultOptionsRequest: GetBatchQueryResultOptions;
}

interface GetFileRequest {
  targetDrive: TargetDrive;
  fileId: string;
}

const EmptyKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(0)),
  aesKey: new Uint8Array(Array(16).fill(0)),
};

const _internalMetadataCache = new Map<string, Promise<DriveSearchResult>>();

export class DriveProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  async GetDrives(params: PagingOptions): Promise<PagedResult<DriveDefinition>> {
    const client = this.createAxiosClient();

    return client.post('drive/mgmt', params).then((response) => {
      return response.data;
    });
  }

  /// Drive methods:
  //returns all drives for a given type
  async GetDrivesByType(
    type: string,
    pageNumber: number,
    pageSize: number
  ): Promise<PagedResult<DriveDefinition>> {
    const params = {
      driveType: type,
      pageNumber: pageNumber,
      pageSize: pageSize,
    };

    if (this.getType() === ApiType.Owner) {
      // Post needed
      const client = this.createAxiosClient();
      return client.post('drive/mgmt/type', params).then((response) => {
        return response.data;
      });
    } else {
      const client = this.createAxiosClient();
      return client.get('drive/metadata/type?' + DataUtil.stringify(params)).then((response) => {
        return {
          ...response.data,
          results: response?.data?.results?.map((result: { targetDrive: any }) => {
            return { ...result, targetDriveInfo: result.targetDrive };
          }),
        };
      });
    }
  }

  async EnsureDrive(
    targetDrive: TargetDrive,
    name: string,
    metadata: string,
    allowAnonymousReads: boolean
  ): Promise<boolean> {
    //create the drive if it does not exist
    const client = this.createAxiosClient();
    const allDrives = await this.GetDrives({ pageNumber: 1, pageSize: 1000 });

    const foundDrive = allDrives.results.find(
      (d) =>
        d.targetDriveInfo.alias == targetDrive.alias && d.targetDriveInfo.type == targetDrive.type
    );

    if (foundDrive) {
      return true;
    }

    const data = {
      name: name,
      targetDrive: targetDrive,
      metadata: metadata,
      allowAnonymousReads: allowAnonymousReads,
    };

    return client
      .post('/drive/mgmt/create', data)
      .then((response) => {
        if (response.status === 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  }

  /// Query methods:
  async QueryModified(
    params: FileQueryParams,
    ro?: GetModifiedResultOptions
  ): Promise<QueryModifiedResponse> {
    const client = this.createAxiosClient();

    if (!ro) {
      ro = {
        cursor: undefined,
        maxRecords: 10,
        includeJsonContent: true,
        excludePreviewThumbnail: false,
      };
    }

    const request: GetModifiedRequest = {
      queryParams: params,
      resultOptions: ro,
    };

    return client.post<QueryModifiedResponse>('/drive/query/modified', request).then((response) => {
      return response.data;
    });
  }

  async QueryBatch(
    params: FileQueryParams,
    ro?: GetBatchQueryResultOptions
  ): Promise<QueryBatchResponse> {
    const client = this.createAxiosClient();

    if (!ro) {
      ro = {
        cursorState: undefined,
        maxRecords: 10,
        includeMetadataHeader: true,
      };
    }

    const request: GetBatchRequest = {
      queryParams: params,
      resultOptionsRequest: ro,
    };

    return client.post<QueryBatchResponse>('/drive/query/batch', request).then((response) => {
      return response.data;
    });
  }

  /// Get methods:

  async GetMetadata(targetDrive: TargetDrive, fileId: string): Promise<DriveSearchResult> {
    const cacheKey = `${targetDrive.alias}-${targetDrive.type}+${fileId}`;
    if (_internalMetadataCache.has(cacheKey)) {
      const cacheEntry = await _internalMetadataCache.get(cacheKey);
      if (cacheEntry) return cacheEntry;
    }

    const client = this.createAxiosClient();

    const request: GetFileRequest = {
      targetDrive: targetDrive,
      fileId: fileId,
    };

    const promise = client
      .post('/drive/files/header', request)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });

    _internalMetadataCache.set(cacheKey, promise);

    return promise;
  }

  async GetPayloadAsJson<T>(
    targetDrive: TargetDrive,
    fileId: string,
    keyHeader: KeyHeader | undefined
  ): Promise<T> {
    return this.GetPayloadBytes(targetDrive, fileId, keyHeader).then((bytes) => {
      const json = DataUtil.byteArrayToString(new Uint8Array(bytes));
      try {
        const o = JSON.parse(json);
        return o;
      } catch (ex) {
        console.warn('base JSON.parse failed');
        const replaceAll = (str: string, find: string, replace: string) => {
          return str.replace(new RegExp(find, 'g'), replace);
        };

        const jsonWithRemovedQuote = replaceAll(json, '\u0019', '');
        const jsonWithRemovedEmDash = replaceAll(jsonWithRemovedQuote, '\u0014', '');

        const o = JSON.parse(jsonWithRemovedEmDash);

        console.warn('... but we fixed it');
        return o;
      }
    });
  }

  async GetPayloadBytes(
    targetDrive: TargetDrive,
    fileId: string,
    keyHeader: KeyHeader | undefined
  ): Promise<ArrayBuffer> {
    const client = this.createAxiosClient();
    const request: GetFileRequest = {
      targetDrive: targetDrive,
      fileId: fileId,
    };
    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
    };

    return client
      .post('/drive/files/payload', request, config)
      .then((response) => {
        if (keyHeader) {
          const cipher = new Uint8Array(response.data);
          return this.DecryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
            return bytes;
          });
        } else {
          return new Uint8Array(response.data);
        }
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  }

  async GetThumbBytes(
    targetDrive: TargetDrive,
    fileId: string,
    keyHeader: KeyHeader | undefined,
    width: number,
    height: number
  ): Promise<ArrayBuffer> {
    const client = this.createAxiosClient();
    const request: GetFileRequest = {
      targetDrive: targetDrive,
      fileId: fileId,
    };
    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
    };

    return client
      .post('/drive/files/thumb', { file: request, width: width, height: height }, config)
      .then((response) => {
        if (keyHeader) {
          const cipher = new Uint8Array(response.data);
          return this.DecryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
            return bytes;
          });
        } else {
          return new Uint8Array(response.data);
        }
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  }

  public async DecryptJsonContent<T>(
    fileMetaData: FileMetadata,
    keyheader: KeyHeader | undefined
  ): Promise<T> {
    if (keyheader) {
      try {
        const cipher = DataUtil.base64ToUint8Array(fileMetaData.appData.jsonContent);
        const json = DataUtil.byteArrayToString(
          await this.DecryptUsingKeyHeader(cipher, keyheader)
        );

        return JSON.parse(json);
      } catch (err) {
        console.error(
          '[DotYouCore-js]',
          'Json Content Decryption failed. Trying to only parse JSON'
        );
      }
    }

    return JSON.parse(fileMetaData.appData.jsonContent);
  }

  // async GetPayloadAsStream(
  //   targetDrive: TargetDrive,
  //   fileId: Guid,
  //   keyHeader: KeyHeader
  // ): Promise<any> {
  //   throw 'Not Implemented';
  // }

  /// Delete methods:

  async DeleteFile(
    targetDrive: TargetDrive,
    fileId: string,
    deleteLinkedFiles?: boolean,
    recipients?: string[]
  ): Promise<boolean | void> {
    const client = this.createAxiosClient();

    const request = {
      file: {
        targetDrive: targetDrive,
        fileId: fileId,
      },
      deleteLinkedFiles: deleteLinkedFiles ?? true,
      recipients: recipients,
    };

    return client
      .post('/drive/files/delete', request)
      .then((response) => {
        if (response.status === 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  }

  /// Upload methods:

  async UploadUsingKeyHeader(
    keyHeader: KeyHeader | undefined,
    instructions: UploadInstructionSet,
    metadata: UploadFileMetadata,
    payload: Uint8Array,
    thumbnails?: { filename: string; payload: Uint8Array }[]
  ): Promise<UploadResult> {
    const encryptedMetaData = keyHeader
      ? {
          ...metadata,
          appData: {
            ...metadata.appData,
            jsonContent: metadata.appData.jsonContent
              ? DataUtil.uint8ArrayToBase64(
                  await this.encryptWithKeyheader(
                    DataUtil.stringToUint8Array(metadata.appData.jsonContent),
                    keyHeader
                  )
                )
              : null,
          },
        }
      : metadata;

    const descriptor: UploadFileDescriptor = {
      encryptedKeyHeader: await this.EncryptKeyHeader(
        keyHeader ?? EmptyKeyHeader,
        instructions.transferIv
      ),
      fileMetadata: encryptedMetaData,
    };

    const encryptedDescriptor = await this.encryptWithSharedSecret(
      descriptor,
      instructions.transferIv
    );
    const encryptedPayload = keyHeader
      ? await this.encryptWithKeyheader(payload, keyHeader)
      : payload;

    const data = new FormData();
    data.append('instructions', this.toBlob(instructions));
    data.append('metaData', new Blob([encryptedDescriptor]));
    data.append('payload', new Blob([encryptedPayload]));

    if (thumbnails) {
      for (let i = 0; i < thumbnails.length; i++) {
        const thumb = thumbnails[i];
        const thumbnailBytes = keyHeader
          ? await this.encryptWithKeyheader(thumb.payload, keyHeader)
          : thumb.payload;
        data.append('thumbnail', new Blob([thumbnailBytes]), thumb.filename);
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
        console.error('[DotYouCore-js]', error);
        throw error;
      });
  }

  async Upload(
    instructions: UploadInstructionSet,
    metadata: UploadFileMetadata,
    payload: Uint8Array,
    thumbnails?: { filename: string; payload: Uint8Array }[],
    encrypt = true
  ): Promise<UploadResult> {
    const keyHeader = encrypt ? this.GenerateKeyHeader() : undefined;
    return this.UploadUsingKeyHeader(keyHeader, instructions, metadata, payload, thumbnails);
  }

  /// Upload helpers:

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

  /// Helper methods:
  async GetPayload<T>(
    targetDrive: TargetDrive,
    fileId: string,
    fileMetadata: FileMetadata,
    sharedSecretEncryptedKeyHeader: EncryptedKeyHeader,
    includesJsonContent: boolean
  ): Promise<T> {
    const keyheader = fileMetadata.payloadIsEncrypted
      ? await this.DecryptKeyHeader(sharedSecretEncryptedKeyHeader)
      : undefined;

    if (fileMetadata.appData.contentIsComplete && includesJsonContent) {
      return await this.DecryptJsonContent<T>(fileMetadata, keyheader);
    } else {
      return await this.GetPayloadAsJson<T>(targetDrive, fileId, keyheader);
    }
  }

  async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
    return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
  }

  async DecryptKeyHeader(encryptedKeyHeader: EncryptedKeyHeader): Promise<KeyHeader> {
    const ss = this.getSharedSecret();
    if (!ss) {
      throw new Error('attempting to decrypt but missing the shared secret');
    }

    // Check if used params aren't still base64 encoded if so parse to bytearrays
    let encryptedAesKey = encryptedKeyHeader.encryptedAesKey;
    if (typeof encryptedKeyHeader.encryptedAesKey === 'string') {
      encryptedAesKey = DataUtil.base64ToUint8Array(encryptedKeyHeader.encryptedAesKey);
    }

    let receivedIv = encryptedKeyHeader.iv;
    if (typeof encryptedKeyHeader.iv === 'string') {
      receivedIv = DataUtil.base64ToUint8Array(encryptedKeyHeader.iv);
    }

    const bytes = await AesEncrypt.CbcDecrypt(encryptedAesKey, receivedIv, ss);
    const iv = bytes.subarray(0, 16);
    const aesKey = bytes.subarray(16);

    return {
      aesKey: aesKey,
      iv: iv,
    };
  }

  async EncryptKeyHeader(
    keyHeader: KeyHeader,
    transferIv: Uint8Array
  ): Promise<EncryptedKeyHeader> {
    const ss = this.getSharedSecret();
    if (!ss) {
      throw new Error('attempting to encrypt but missing the shared secret');
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
