import axios, { AxiosError } from 'axios';
import { decryptData, encryptData, encryptUrl } from './InterceptionEncryptionUtil';
import { SystemFileType } from './DriveData/File/DriveFileTypes';
import { hasDebugFlag, isLocalStorageAvailable } from '../helpers/BrowserUtil';
import { jsonStringify64 } from '../helpers/DataUtil';

export enum ApiType {
  Owner,
  App,
  Guest,
}

export interface BaseProviderOptions {
  api: ApiType;
  sharedSecret?: Uint8Array;
  hostIdentity: string;
  loggedInIdentity?: string;
  headers?: Record<string, string>;
}

const getRandomIv = () => crypto.getRandomValues(new Uint8Array(16));

interface createAxiosClientOptions {
  overrideEncryption?: boolean;
  headers?: Record<string, string>;
  systemFileType?: SystemFileType;
}

export class BaseOdinClient {
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

  // Gets the identity to where the client is pointing to
  getHostIdentity(): string {
    return (
      this._options?.hostIdentity ||
      (typeof window.location !== 'undefined' ? window.location.hostname : '')
    );
  }

  getLoggedInIdentity(): string | undefined {
    return (
      this._options?.loggedInIdentity ||
      (this.getType() === ApiType.Owner || this.getType() === ApiType.App
        ? this.getHostIdentity()
        : undefined)
    );
  }

  isOwner(): boolean {
    return (
      this._options &&
      this.isAuthenticated() &&
      this.getLoggedInIdentity() === this.getHostIdentity()
    );
  }

  isAuthenticated(): boolean {
    return this._options && !!this.getSharedSecret();
  }

  getRoot(): string {
    return `https://${this.getHostIdentity()}`;
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

      case ApiType.Guest:
        endpoint = '/api/guest/v1';
        break;
    }

    return this.getRoot() + endpoint;
  }

  getHeaders(): Record<string, string> {
    return this._options.headers || {};
  }

  //Gets an Axios client configured with token info
  createAxiosClient(options?: createAxiosClientOptions) {
    const isDebug = hasDebugFlag();
    const client = axios.create({
      baseURL: this.getEndpoint(),
      withCredentials: isLocalStorageAvailable(),
      headers: {
        'X-ODIN-FILE-SYSTEM-TYPE': options?.systemFileType || 'Standard',
        ...this._options.headers,
        ...options?.headers,
      },
    });

    if (options?.overrideEncryption) return client;

    // Encryption/Decryption on requests and responses
    const ss = this.getSharedSecret();

    client.interceptors.request.use(
      async function (request) {
        if (!ss) {
          return request;
        }

        isDebug && console.debug('request', request.url, { ...request });

        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method?.toUpperCase() || '')) {
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
        if (error?.response?.data?.data && ss && error.response.status !== 404) {
          // Try and get a more detailed error message
          console.error(
            '[odin-js]',
            await decryptData(error.response.data.data, error.response.data.iv, ss)
          );
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
  api: ApiType.App | ApiType.Guest;
}

export class OdinClient extends BaseOdinClient {
  constructor(options: ProviderOptions) {
    super({ ...options });
  }
}

export const assertIfOdinClientIsOwner = (odinClient: OdinClient) => {
  if (odinClient.getType() !== ApiType.Owner) {
    throw new Error(
      `This method is not available for ${odinClient.getType() === ApiType.App ? 'app' : 'youauth'
      } clients`
    );
  }
};

export const assertIfOdinClientIsOwnerOrApp = (odinClient: OdinClient) => {
  if (odinClient.getType() !== ApiType.Owner && odinClient.getType() !== ApiType.App) {
    throw new Error(`This method is not available for youauth clients`);
  }
};
