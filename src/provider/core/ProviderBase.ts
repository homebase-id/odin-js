import axios from 'axios';
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

    client.interceptors.request.use(
      async function (request) {
        //TODO: consider handling this on GET requests too?
        if (request.method?.toUpperCase() !== 'POST') {
          return request;
        }

        if (!ss) {
          // console.warn(
          //   'Attempted to encrypt with shared secret, but it was missing on ProviderBase'
          // );
          return request;
        }

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

    client.interceptors.response.use(
      async function (response) {
        //response.headers["content-type"].toLowerCase() == "encrypted/json";
        const encryptedPayload = response.data;

        if (!encryptedPayload.iv && encryptedPayload.Iv) {
          encryptedPayload.iv = encryptedPayload.Iv;
        }

        if (!encryptedPayload.data && encryptedPayload.Data) {
          encryptedPayload.data = encryptedPayload.Data;
        }

        //TODO: determine if we should expect the payload to be encrypted or not
        if (encryptedPayload && encryptedPayload.data && encryptedPayload.iv) {
          if (!ss) {
            // console.warn(
            //   'Attempted to decrypt with shared secret, but it was missing on ProviderBase'
            // );
            return response;
          }

          const iv = DataUtil.base64ToUint8Array(response.data.iv);
          const encryptedBytes = DataUtil.base64ToUint8Array(response.data.data);
          const bytes = await AesEncrypt.CbcDecrypt(encryptedBytes, iv, ss);
          const json = DataUtil.byteArrayToString(bytes);
          if (json) {
            response.data = JSON.parse(json);
          }
        }
        return response;
      },
      async function (error) {
        if (error.response.data) {
          const encryptedPayload = error.response.data;

          if (!encryptedPayload.iv && encryptedPayload.Iv) {
            encryptedPayload.iv = encryptedPayload.Iv;
          }

          if (!encryptedPayload.data && encryptedPayload.Data) {
            encryptedPayload.data = encryptedPayload.Data;
          }

          //TODO: determine if we should expect the payload to be encrypted or not
          if (encryptedPayload && encryptedPayload.data && encryptedPayload.iv) {
            if (!ss) {
              throw new Error(
                'Attempted to decrypt with shared secret, but it was missing on ProviderBase'
              );
            }

            const iv = DataUtil.base64ToUint8Array(encryptedPayload.iv);
            const encryptedBytes = DataUtil.base64ToUint8Array(encryptedPayload.data);
            const bytes = await AesEncrypt.CbcDecrypt(encryptedBytes, iv, ss);
            const json = DataUtil.byteArrayToString(bytes);
            console.error(JSON.parse(json));
          }
        }

        return Promise.reject(error);
      }
    );

    return client;
  }
}
