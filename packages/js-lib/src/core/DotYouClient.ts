import axios, { AxiosError } from 'axios';
import { decryptData, encryptData, encryptUrl } from './InterceptionEncryptionUtil';
import { jsonStringify64 } from '../helpers/helpers';

export enum ApiType {
  Owner,
  App,
  YouAuth,
}

export interface BaseProviderOptions {
  api: ApiType;
  sharedSecret?: Uint8Array;
  identity?: string;
  headers?: Record<string, string>;
}

const getRandomIv = () => window.crypto.getRandomValues(new Uint8Array(16));

interface createAxiosClientOptions {
  overrideEncryption?: boolean;
  headers?: Record<string, string>;
}

export class BaseDotYouClient {
  private _options: BaseProviderOptions;

  constructor(options: BaseProviderOptions) {
    this._options = options;
  }

  getSharedSecret(): Uint8Array | undefined {
    return this._options?.sharedSecret;
  }

  getType(): ApiType {
    return this._options.api;
  }

  getIdentity(): string {
    return this._options.identity ?? window.location.hostname;
  }

  getRoot(): string {
    // return `https://api.${this.getIdentity()}`;
    return `https://${this.getIdentity()}`;
  }

  //Returns the endpoint for the identity
  getEndpoint(): string {
    let endpoint = ``;
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
  createAxiosClient(options?: createAxiosClientOptions) {
    const client = axios.create({
      baseURL: this.getEndpoint(),
      withCredentials: true,
      headers: { ...this._options.headers, ...options?.headers },
    });

    if (options?.overrideEncryption) return client;

    // Encryption/Decryption on requests and responses
    const ss = this.getSharedSecret();
    const isDebug = localStorage.getItem('debug') === '1';

    client.interceptors.request.use(
      async function (request) {
        if (!ss) {
          return request;
        }

        isDebug && console.debug('request', request.url, { ...request });

        if (request.method?.toUpperCase() == 'POST') {
          const json = jsonStringify64(request.data);
          const payload = await encryptData(json, getRandomIv(), ss);

          request.data = payload;
        } else {
          request.url = await encryptUrl(request.url ?? '', ss);
        }

        return request;
      },
      function (error) {
        return Promise.reject(error);
      }
    );

    client.interceptors.response.use(
      async function (response) {
        if (response.status == 204) {
          response.data = null;
          return response;
        }

        const encryptedPayload = response.data;

        if (encryptedPayload && encryptedPayload.data && encryptedPayload.iv && ss) {
          response.data = await decryptData(encryptedPayload.data, encryptedPayload.iv, ss);
          isDebug && console.debug('response', response.config?.url, response);
        }

        return response;
      },
      async function (error) {
        if (error?.response?.data?.data && ss) {
          console.error(
            '[DotYouCore-js]',
            await decryptData(error.response.data.data, error.response.data.iv, ss)
          );
        } else {
          console.error('[DotYouCore-js:responseInterception]', error);
        }

        return Promise.reject(error);
      }
    );

    return client;
  }

  handleErrorResponse(error: AxiosError): undefined {
    throw error;
  }
}

export interface ProviderOptions extends BaseProviderOptions {
  api: ApiType.App | ApiType.YouAuth;
}

export class DotYouClient extends BaseDotYouClient {
  constructor(options: ProviderOptions) {
    super({ ...options });
  }
}
