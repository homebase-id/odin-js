import axios from 'axios';

export enum ApiType {
  Owner,
  App,
  YouAuth,
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
  protected createAxiosClient() {
    return axios.create({
      baseURL: this.getEndpoint(),
      withCredentials: true,
    });
  }
}
