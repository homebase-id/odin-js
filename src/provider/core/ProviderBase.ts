import axios, { AxiosResponse } from 'axios';
import { AesEncrypt } from './AesEncrypt';
import { DataUtil } from './DataUtil';

export enum ApiType {
  Owner,
  App,
  YouAuth,
}

interface SharedSecretEncryptedPayload {
  iv: string;
  data: string;
}

export interface ProviderOptions {
  api: ApiType;
  sharedSecret?: Uint8Array;
}

export class ProviderBase {
  private _options: ProviderOptions;

  constructor(options: ProviderOptions) {
    this._options = options;
  }

  protected getSharedSecret(): Uint8Array | undefined {
    return this._options?.sharedSecret;
  }

  protected getType(): ApiType {
    return this._options.api;
  }

  //Returns the endpoint for the identity
  protected getEndpoint(): string {
    let root = '';
    switch (this._options?.api) {
      case ApiType.Owner:
        root = '/api/owner/v1';
        break;

      case ApiType.App:
        root = '/api/apps/v1';
        break;

      case ApiType.YouAuth:
        root = '/api/youauth/v1';
        break;
    }

    return 'https://' + window.location.hostname + root;
  }

  //Gets an Axios client configured with token info
  protected createAxiosClient(overrideEncryption?: boolean) {
    const client = axios.create({
      baseURL: this.getEndpoint(),
      withCredentials: true,
      headers: {},
    });

    if (overrideEncryption) {
      return client;
    }

    const ss = this.getSharedSecret();
    const isDebug = localStorage.getItem('debug') === '1';

    client.interceptors.request.use(
      async function (request) {
        //TODO: consider handling this on GET requests too?
        if (request.method?.toUpperCase() != 'POST' || !ss) {
          return request;
        }

        isDebug && console.debug('request', request.url, { ...request });

        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const json = DataUtil.JsonStringify64(request.data);
        const bytes = DataUtil.stringToUint8Array(json);

        const encryptedBytes = await AesEncrypt.CbcEncrypt(bytes, iv, ss);
        const payload: SharedSecretEncryptedPayload = {
          iv: DataUtil.uint8ArrayToBase64(iv),
          data: DataUtil.uint8ArrayToBase64(encryptedBytes),
        };

        request.data = payload;

        return request;
      },
      function (error) {
        return Promise.reject(error);
      }
    );

    const decryptResponse = async (response: AxiosResponse<any, any>) => {
      const encryptedPayload = response.data;

      //TODO: determine if we should expect the payload to be encrypted or not
      if (encryptedPayload && encryptedPayload.data && encryptedPayload.iv && ss) {
        const iv = DataUtil.base64ToUint8Array(response.data.iv);
        const encryptedBytes = DataUtil.base64ToUint8Array(response.data.data);
        const bytes = await AesEncrypt.CbcDecrypt(encryptedBytes, iv, ss);
        const json = DataUtil.byteArrayToString(bytes);
        response.data = JSON.parse(json);

        isDebug && console.debug('response', response.config?.url, response);
      }

      return response;
    };

    client.interceptors.response.use(
      async function (response) {
        if (response.status == 204) {
          response.data = null;
          return response;
        }

        return await decryptResponse(response);
      },
      async function (error) {
        console.error(await decryptResponse(error.response));

        return Promise.reject(error);
      }
    );

    return client;
  }
}
