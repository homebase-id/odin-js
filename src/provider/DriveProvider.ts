import { ProviderBase, ProviderOptions } from './ProviderBase';
import { AesEncrypt } from './AesEncrypt';
import { Guid } from 'guid-typescript';
import { DataUtil } from './DataUtil';
import {
  EncryptedClientFileHeader,
  DriveSearchResult,
  UnencryptedFileHeader,
  EncryptedKeyHeader,
  KeyHeader,
  QueryParams,
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import { PagedResult } from './Types';

const stringifyObjectToUrlParams = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

class DriveProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  // async GetFiles( params:QueryParams): Promise<any> {
  //
  //     let client = this.createAxiosClient();
  //     let qs = stringifyObjectToUrlParams(params, {skipNull:true})
  //     return client.get("/drive/query/find?" + qs).then(results => {
  //         console.log(results.data);
  //         return results.data;
  //     });
  // }

  async GetFilesByTag<TJsonContent>(
    params: QueryParams
  ): Promise<PagedResult<DriveSearchResult<TJsonContent>>> {
    let client = this.createAxiosClient();
    return client.get('/drive/query/tag?' + stringifyObjectToUrlParams(params)).then((response) => {
      response.data.results = response.data.results.map((item: any) => {
        // let s: DriveSearchResult<TJsonContent> = {
        //     fileId: d.fileId,
        //     tags: d.tags,
        //     fileType: d.fileType,
        //     contentIsComplete: d.contentIsComplete,
        //     payloadIsEncrypted: boolean,
        //     createdTimestamp: d.createdTimestamp,
        //     senderDotYouId: d.senderDotYouId,
        //     lastUpdatedTimestamp: d.lastUpdatedTimestamp,
        //     payloadSize: number,
        //     payloadTooLarge: boolean,
        //     payloadContent: string
        // }

        let dsr: DriveSearchResult<TJsonContent> = { ...item };
        dsr.jsonContent = params.includeMetadataHeader ? JSON.parse(item.jsonContent) : null;
        return dsr;
      });

      return response.data;
    });
  }

  // async GetFilesByType<TJsonContent>( params: QueryParams): Promise<PagedResult<SearchResult<TJsonContent>>> {
  //     let client = this.createAxiosClient();
  //     return client.get("/drive/query/fileType?" + stringifyObjectToUrlParams(params)).then(response => {
  //         response.data.results = response.data.results.map(d => {
  //             let s: SearchResult<TJsonContent> = {
  //                 fileId: d.fileId,
  //                 createdTimestamp: d.createdTimestamp,
  //                 lastUpdatedTimestamp: d.lastUpdatedTimestamp,
  //                 fileType: d.fileType,
  //                 tags: d.tags,
  //                 contentIsComplete: d.contentIsComplete,
  //                 jsonContent: params.includeContent ? JSON.parse(d.jsonContent) : null
  //             }
  //
  //             return s;
  //         })
  //
  //         return response.data;
  //     })
  // }

  async GetMetadata(driveIdentifier: Guid, fileId: Guid): Promise<UnencryptedFileHeader> {
    let client = this.createAxiosClient();

    return client
      .get('/drive/files/metadata?' + this.getDriveQuerystring(driveIdentifier, fileId))
      .then((response) => {
        let header: EncryptedClientFileHeader = {
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

        //decrypt to key header
        return this.decryptKeyHeader(header.encryptedKeyHeader).then((keyHeader) => {
          //TODO: decrypt the file metadata

          let result: UnencryptedFileHeader = {
            keyHeader: keyHeader,
            metadata: null,
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
  async GetPayloadAsJson<T>(driveIdentifier: Guid, fileId: Guid, keyHeader: KeyHeader): Promise<T> {
    return this.GetPayloadBytes(driveIdentifier, fileId, keyHeader).then((bytes) => {
      let json = DataUtil.byteArrayToString(new Uint8Array(bytes));
      let o = JSON.parse(json);
      return o;
    });
  }

  async GetPayloadBytes(
    driveIdentifier: Guid,
    fileId: Guid,
    keyHeader: KeyHeader
  ): Promise<ArrayBuffer> {
    let client = this.createAxiosClient();
    const config: AxiosRequestConfig = {
      responseType: 'arraybuffer',
    };

    return client
      .get('/drive/files/payload?' + this.getDriveQuerystring(driveIdentifier, fileId), config)
      .then((response) => {
        let cipher = new Uint8Array(response.data);
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
    driveIdentifier: Guid,
    fileId: Guid,
    keyHeader: KeyHeader
  ): Promise<any> {
    throw 'Not Implemented';
    // let client = this.createAxiosClient();
    // const config: AxiosRequestConfig = {
    //     responseType: "stream",
    // }
    //
    // return client.get("/drive/files/payload?" + this.getDriveQuerystring(driveIdentifier, fileId), config).then(response => {
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

  async DeleteFile(driveIdentifier: Guid, fileId: Guid): Promise<boolean | void> {
    let client = this.createAxiosClient();

    return client
      .delete('/drive/files?' + this.getDriveQuerystring(driveIdentifier, fileId))
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

  private getDriveQuerystring(driveIdentifier: Guid, fileId: Guid): string {
    let qs = stringifyObjectToUrlParams({
      driveIdentifier: driveIdentifier,
      fileId: fileId,
    });

    return qs;
  }

  private async decryptKeyHeader(ekh: EncryptedKeyHeader): Promise<KeyHeader> {
    if (ekh.encryptionVersion != 1) {
      throw 'Encryption version ' + ekh.encryptionVersion + 'not supported';
    }

    let cipher = ekh.encryptedAesKey;

    const sharedSecret = this.getSharedSecret();
    if (!sharedSecret) {
      throw new Error('Shared Secret Missing from DriveProvider Options');
    }
    let combined = await AesEncrypt.CbcDecrypt(cipher, ekh.iv, sharedSecret);

    let kh: KeyHeader = {
      iv: new Uint8Array(combined.slice(0, 16)),
      aesKey: new Uint8Array(combined.slice(16, 32)),
    };

    return kh;
  }
}

export function createDriveProvider(options: ProviderOptions) {
  return new DriveProvider(options);
}
