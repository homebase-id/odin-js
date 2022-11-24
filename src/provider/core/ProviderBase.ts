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
  root?: string;
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

  protected getRoot(): string {
    return 'https://' + (this._options.root ?? window.location.hostname);
  }

  //Returns the endpoint for the identity
  protected getEndpoint(): string {
    let endpoint = '';
    switch (this._options?.api) {
      case ApiType.Owner:
        endpoint = '/api/owner/v1';
        break;

      case ApiType.App:
        endpoint = '/api/apps/v1';
        break;

      case ApiType.YouAuth:
        endpoint = '/api/youauth/v1';
        break;
    }

    return this.getRoot() + endpoint;
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

        if (!ss) {
          return request;
        }

        isDebug && console.debug('request', request.url, {...request});

        const iv = window.crypto.getRandomValues(new Uint8Array(16));
        const json = DataUtil.JsonStringify64(request.data);
        const bytes = DataUtil.stringToUint8Array(json);

        const encryptedBytes = await AesEncrypt.CbcEncrypt(bytes, iv, ss);
        const payload: SharedSecretEncryptedPayload = {
          iv: DataUtil.uint8ArrayToBase64(iv),
          data: DataUtil.uint8ArrayToBase64(encryptedBytes),
        };

        if (request.method?.toUpperCase() == 'POST') {
          request.data = payload;
        } else {

          request.data = undefined;

          const encryptedPayload = DataUtil.JsonStringify64(payload);
          //TODO: detect if there's already a query string
          let prefix = "?";
          request.url += prefix + "ss=" + encryptedPayload;
          return request;
        }

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
        try {
          const iv = DataUtil.base64ToUint8Array(response.data.iv);
          const encryptedBytes = DataUtil.base64ToUint8Array(response.data.data);
          const bytes = await AesEncrypt.CbcDecrypt(encryptedBytes, iv, ss);
          const json = DataUtil.byteArrayToString(bytes);
          response.data = JSON.parse(json);
        } catch (ex) {
          response.data = undefined;
        }
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
        console.error('[DotYouCore-js]', await decryptResponse(error.response));

        return Promise.reject(error);
      }
    );

    return client;
  }
}
