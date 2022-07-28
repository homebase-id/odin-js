import { ProviderBase, ProviderOptions } from '../ProviderBase';
import { AesEncrypt } from '../AesEncrypt';
import { Guid } from 'guid-typescript';
import { DataUtil } from '../DataUtil';
import {
  EncryptedClientFileHeader,
  DriveSearchResult,
  UnencryptedFileHeader,
  EncryptedKeyHeader,
  KeyHeader,
  QueryParams,
  DriveDefinition,
  TargetDrive,
  FileQueryParams,
  GetBatchQueryResultOptions,
  GetRecentResultOptions,
  QueryBatchResponse,
  QueryRecentResponse,
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import { PagedResult, PagingOptions } from '../Types';

interface GetRecentRequest {
  QueryParams: FileQueryParams;
  ResultOptions: GetRecentResultOptions;
}

interface GetBatchRequest {
  QueryParams: FileQueryParams;
  ResultOptions: GetBatchQueryResultOptions;
}

const stringify = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

export default class DriveProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  async GetDrives(params: PagingOptions): Promise<PagedResult<DriveDefinition>> {
    const client = this.createAxiosClient();

    return client.get('drive/mgmt?' + stringify(params)).then((response) => {
      return response.data;
    });
  }

  //returns all drives for a given type
  async GetDrivesByType(
    type: Guid,
    pageNumber: number,
    pageSize: number
  ): Promise<PagedResult<DriveDefinition>> {
    const params = {
      type: type,
      pageNumber: pageNumber,
      pageSize: pageSize,
    };

    const client = this.createAxiosClient();
    return client.get('drive/metadata/type?' + stringify(params)).then((response) => {
      return response.data;
    });
  }

  async QueryRecent<TJsonContent>(
    params: FileQueryParams,
    ro?: GetRecentResultOptions
  ): Promise<QueryRecentResponse<TJsonContent>> {
    const client = this.createAxiosClient();

    if (!ro) {
      ro = {
        cursor: undefined,
        maxRecords: 10,
        includeMetadataHeader: true,
      };
    }

    params = this.fixQueryParams(params);

    const request: GetRecentRequest = {
      QueryParams: params,
      ResultOptions: ro,
    };

    return client
      .post<QueryRecentResponse<TJsonContent>>('/drive/query/recent?', request)
      .then((response) => {
        //remap
        // response.data.searchResults = response.data.searchResults.map(item => {
        //     let dsr: DriveSearchResult<TJsonContent> = {...item};
        //     dsr.jsonContent = ro.includeMetadataHeader ? JSON.parse(item.jsonContent) : null
        //     return dsr;
        // })

        return response.data;
      });
  }

  async QueryBatch<TJsonContent>(
    params: FileQueryParams,
    ro?: GetBatchQueryResultOptions
  ): Promise<QueryBatchResponse<TJsonContent>> {
    const client = this.createAxiosClient();

    if (!ro) {
      ro = {
        cursorState: '',
        maxRecords: 10,
        includeMetadataHeader: true,
      };
    }

    params = this.fixQueryParams(params);

    const request: GetBatchRequest = {
      QueryParams: params,
      ResultOptions: ro,
    };

    return client
      .post<QueryBatchResponse<TJsonContent>>('/drive/query/batch', request)
      .then((response) => {
        //remap
        // response.data.searchResults = response.data.searchResults.map(item => {
        //     let dsr: DriveSearchResult<TJsonContent> = {...item};
        //     dsr.jsonContent = ro.includeMetadataHeader ? JSON.parse(item.jsonContent) : null
        //     return dsr;
        // })

        return response.data;
      });
  }

  async GetFilesByTag<TJsonContent>(
    params: QueryParams
  ): Promise<PagedResult<DriveSearchResult<TJsonContent>>> {
    const client = this.createAxiosClient();
    return client.get('/drive/query/tag?' + stringify(params)).then((response) => {
      response.data.results = response.data.results.map((item: any) => {
        const dsr: DriveSearchResult<TJsonContent> = { ...item };
        dsr.jsonContent = params.includeMetadataHeader ? JSON.parse(item.jsonContent) : null;
        return dsr;
      });

      return response.data;
    });
  }

  async GetMetadata(targetDrive: TargetDrive, fileId: Guid): Promise<UnencryptedFileHeader> {
    const client = this.createAxiosClient();

    return client
      .get('/drive/files/header?' + this.getDriveQuerystring(targetDrive, fileId))
      .then((response) => {
        const header: EncryptedClientFileHeader = {
          encryptedKeyHeader: {
            encryptedAesKey: DataUtil.base64ToUint8Array(
              response.data.encryptedKeyHeader.encryptedAesKey
            ),
            iv: DataUtil.base64ToUint8Array(response.data.encryptedKeyHeader.iv),
            encryptionVersion: response.data.encryptedKeyHeader.encryptionVersion,
            type: response.data.encryptedKeyHeader.type,
          },
          fileMetadata: response.data.fileMetadata,
        };

        //no need to decrypt
        // if (!header.fileMetadata.payloadIsEncrypted) {
        //     let empty: number[] = new Array(16).fill(0);
        //     let kh: KeyHeader =
        //         {
        //             iv: new Uint8Array(empty),
        //             aesKey: new Uint8Array(empty)
        //         }
        //
        //     let result: UnencryptedFileHeader = {
        //         keyHeader: kh,
        //         metadata: header.fileMetadata
        //     };
        // }

        return this.decryptKeyHeader(header.encryptedKeyHeader).then((keyHeader) => {
          const result: UnencryptedFileHeader = {
            keyHeader: keyHeader,
            metadata: header.fileMetadata,
          };

          return result;
        });
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.log(error);
        throw error;
      });
  }

  //decrypts the payload and returns a JSON object
  async GetPayloadAsJson<T>(
    targetDrive: TargetDrive,
    fileId: Guid,
    keyHeader: KeyHeader
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
    fileId: Guid,
    keyHeader: KeyHeader
  ): Promise<ArrayBuffer> {
    const client = this.createAxiosClient();
    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
    };

    return client
      .get('/drive/files/payload?' + this.getDriveQuerystring(targetDrive, fileId), config)
      .then((response) => {
        const cipher = new Uint8Array(response.data);
        return this.DecryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return bytes;
        });
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.log(error);
        throw error;
      });
  }

  async GetPayloadAsStream(
    targetDrive: TargetDrive,
    fileId: Guid,
    keyHeader: KeyHeader
  ): Promise<any> {
    throw 'Not Implemented';
    // let client = this.createAxiosClient();
    // const config: AxiosRequestConfig = {
    //     responseType: "stream",
    // }
    //
    // return client.get("/drive/files/payload?" + this.getDriveQuerystring(targetDrive, fileId), config).then(response => {
    //     let cipher = new Uint8Array(response.data);
    //
    //     return this.DecryptUsingKeyHeader(cipher, keyHeader).then(bytes => {
    //         let json = DataUtil.byteArrayToString(bytes);
    //         let o = JSON.parse(json);
    //         return o;
    //         // return new FileStreamResult(payload, "application/octet-stream");
    //     });
    //
    // }).catch(error => {
    //     console.log(error);
    //     throw error;
    // });

    /*
        axios({
            url: 'http://api.dev/file-download', //your url
            method: 'GET',
            responseType: 'blob', // important
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'file.pdf'); //or any other extension
            document.body.appendChild(link);
            link.click();
        });

        * */
  }

  async EnsureDrive(
    targetDrive: TargetDrive,
    name: string,
    metadata: string,
    allowAnonymousReads: boolean
  ): Promise<boolean> {
    const drivePermissions = 0;
    //create the drive if it does not exist
    const client = this.createAxiosClient();

    //TODO: this will change when we move away from paging
    const allDrives = await this.GetDrives({ pageNumber: 1, pageSize: 1000 });

    const exists = allDrives.results.find(
      (d) =>
        Guid.parse(d.alias).equals(Guid.parse(targetDrive.alias)) &&
        Guid.parse(d.type).equals(Guid.parse(targetDrive.type))
    );

    if (exists) {
      return true;
    }

    const data = {
      metadata: metadata,
      name: name,
      allowAnonymousReads: allowAnonymousReads,
      drivePermissions: drivePermissions,
    };
    return client
      .post('/drive/mgmt/create?' + stringify(data), targetDrive)
      .then((response) => {
        if (response.status == 200) {
          return true;
        }

        return false;
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.log(error);
        throw error;
      });
  }

  async DeleteFile(targetDrive: TargetDrive, fileId: Guid): Promise<boolean | void> {
    const client = this.createAxiosClient();

    return client
      .delete('/drive/files?' + this.getDriveQuerystring(targetDrive, fileId))
      .then((response) => {
        if (response.status == 200) {
          return true;
        }

        if (response.status == 404) {
          return false;
        }

        return false;
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.log(error);
        throw error;
      });
  }

  async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
    return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
  }

  private getDriveQuerystring(targetDrive: TargetDrive, fileId: Guid): string {
    const qs = stringify({
      alias: targetDrive.alias,
      type: targetDrive.type,
      fileId: fileId,
    });

    return qs;
  }

  private async decryptKeyHeader(ekh: EncryptedKeyHeader): Promise<KeyHeader> {
    if (ekh.encryptionVersion != 1) {
      throw 'Encryption version ' + ekh.encryptionVersion + 'not supported';
    }

    const cipher = ekh.encryptedAesKey;
    const ss = this.getSharedSecret();
    if (!ss) {
      throw new Error('attempting to decrypt but missing the shared secret');
    }
    const combined = await AesEncrypt.CbcDecrypt(cipher, ekh.iv, ss);

    const kh: KeyHeader = {
      iv: new Uint8Array(combined.slice(0, 16)),
      aesKey: new Uint8Array(combined.slice(16, 32)),
    };

    return kh;
  }

  private fixQueryParams(params: FileQueryParams): FileQueryParams {
    //HACK; convert all strings to byte arrays as base64 values; this is for a test

    //HACK: until we decide where to handle byte arrays
    if (params.tagsMatchAtLeastOne)
      params.tagsMatchAtLeastOne = params.tagsMatchAtLeastOne.map((v) =>
        DataUtil.uint8ArrayToBase64(DataUtil.stringToUint8Array(v))
      );
    if (params.tagsMatchAll)
      params.tagsMatchAll = params.tagsMatchAll.map((v) =>
        DataUtil.uint8ArrayToBase64(DataUtil.stringToUint8Array(v))
      );
    if (params.sender)
      params.sender = params.sender.map((v) =>
        DataUtil.uint8ArrayToBase64(DataUtil.stringToUint8Array(v))
      );
    if (params.threadId)
      params.threadId = params.threadId.map((v) =>
        DataUtil.uint8ArrayToBase64(DataUtil.stringToUint8Array(v))
      );

    return params;
  }
}
