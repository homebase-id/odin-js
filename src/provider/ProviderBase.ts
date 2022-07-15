import axios, { AxiosError } from 'axios';
import { Guid } from 'guid-typescript';

export enum ApiType {
  Owner,
  App,
  YouAuth,
}

export interface ProviderOptions {
  api?: ApiType;
  sharedSecret: Uint8Array | null;
  appId: Guid;
}

export class ProviderBase {
  private _options: ProviderOptions;

  constructor(options: ProviderOptions) {
    this._options = options;
  }

  protected getSharedSecret(): Uint8Array | null {
    return this._options?.sharedSecret;
  }

  protected getOptions(): ProviderOptions {
    return this._options;
  }

  protected AssertHasSharedSecret() {
    if (this.getSharedSecret() == null) {
      throw new Error('Shared secret not configured');
    }
  }

  //Returns the endpoint for the identity
  protected getEndpoint(): string {
    let root: string = '';
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
  protected createAxiosClient() {
    return axios.create({
      baseURL: this.getEndpoint(),
      withCredentials: true,
      headers: {
        AppId: this._options?.appId == null ? '' : this._options?.appId.toString(),
      },
    });
  }

  protected handleErrorResponse(error: AxiosError) {
    throw error;
  }
}
