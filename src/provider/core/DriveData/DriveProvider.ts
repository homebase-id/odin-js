import { ApiType, ProviderBase, ProviderOptions } from '../ProviderBase';
import { AesEncrypt } from '../AesEncrypt';
import { Guid } from 'guid-typescript';
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
} from './DriveTypes';
import { AxiosRequestConfig } from 'axios';
import { PagedResult, PagingOptions } from '../Types';

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
        return response.data;
      });
    }
  }

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

    params = this.fixQueryParams(params);

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
        cursorState: '',
        maxRecords: 10,
        includeMetadataHeader: true,
      };
    }

    params = this.fixQueryParams(params);

    const request: GetBatchRequest = {
      queryParams: params,
      resultOptionsRequest: ro,
    };

    return client.post<QueryBatchResponse>('/drive/query/batch', request).then((response) => {
      return response.data;
    });
  }

  // TODO: check if metadata is still encrypted by keyheader?
  async GetMetadata(targetDrive: TargetDrive, fileId: string): Promise<DriveSearchResult> {
    const client = this.createAxiosClient();

    const request: GetFileRequest = {
      targetDrive: targetDrive,
      fileId: fileId,
    };

    return client
      .post('/drive/files/header', request)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.error(error);
        throw error;
      });
  }

  //decrypts the payload and returns a JSON object
  async GetPayloadAsJson<T>(
    targetDrive: TargetDrive,
    fileId: string,
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
    fileId: string,
    keyHeader: KeyHeader
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
        const cipher = new Uint8Array(response.data);
        return this.DecryptUsingKeyHeader(cipher, keyHeader).then((bytes) => {
          return bytes;
        });
      })
      .catch((error) => {
        //TODO: Handle this - the file was not uploaded
        console.error(error);
        throw error;
      });
  }

  async GetPayloadAsStream(
    targetDrive: TargetDrive,
    fileId: Guid,
    keyHeader: KeyHeader
  ): Promise<any> {
    throw 'Not Implemented';
  }

  async DeleteFile(targetDrive: TargetDrive, fileId: string): Promise<boolean | void> {
    const client = this.createAxiosClient();

    const request = {
      targetDrive: targetDrive,
      fileId: fileId,
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
        //TODO: Handle this - the file was not uploaded
        console.error(error);
        throw error;
      });
  }

  async EnsureDrive(
    targetDrive: TargetDrive,
    name: string,
    metadata: string,
    allowAnonymousReads: boolean
  ): Promise<boolean> {
    //create the drive if it does not exist
    const client = this.createAxiosClient();

    //TODO: this will change when we move away from paging
    const allDrives = await this.GetDrives({ pageNumber: 1, pageSize: 1000 });

    const foundDrive = allDrives.results.find(
      (d) =>
        Guid.parse(d.alias).equals(Guid.parse(targetDrive.alias)) &&
        Guid.parse(d.type).equals(Guid.parse(targetDrive.type))
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
        //TODO: Handle this - the file was not uploaded
        console.error(error);
        throw error;
      });
  }

  async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
    return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
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
