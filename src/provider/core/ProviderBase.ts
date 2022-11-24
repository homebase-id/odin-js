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

        isDebug && console.debug('request', request.url, { ...request });

        //const iv = window.crypto.getRandomValues(new Uint8Array(16));

        const iv = new Uint8Array(16);
        iv[0] = 13;
        iv[1] = 33;
        iv[2] = 77;
        iv[3] = 889;
        iv[4] = 33;
        iv[5] = 7;
        iv[6] = 89;
        iv[7] = 66;
        iv[8] = 22;
        iv[9] = 55;
        iv[10] = 77;
        iv[11] = 45;
        iv[12] = 86;
        iv[13] = 11;
        iv[14] = 88;
        iv[15] = 101;
        
        if (request.method?.toUpperCase() == 'POST') {
          const json = DataUtil.JsonStringify64(request.data);
          const bytes = DataUtil.stringToUint8Array(json);

          const encryptedBytes = await AesEncrypt.CbcEncrypt(bytes, iv, ss);
          const payload: SharedSecretEncryptedPayload = {
            iv: DataUtil.uint8ArrayToBase64(iv),
            data: DataUtil.uint8ArrayToBase64(encryptedBytes),
          };

          request.data = payload;
        } else {
          const parts = (request.url ?? '').split('?');
          const querystring = parts.length == 2 ? parts[1] : '';

          const bytes = DataUtil.stringToUint8Array(querystring);

          const encryptedBytes = await AesEncrypt.CbcEncrypt(bytes, iv, ss);
          const payload: SharedSecretEncryptedPayload = {
            iv: DataUtil.uint8ArrayToBase64(iv),
            data: DataUtil.uint8ArrayToBase64(encryptedBytes),
          };

          const encryptedPayload = encodeURIComponent(DataUtil.JsonStringify64(payload));
          request.url = parts[0] + '?ss=' + encryptedPayload;
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
