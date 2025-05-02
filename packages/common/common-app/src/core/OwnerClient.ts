import { BaseProviderOptions, ApiType, BaseOdinClient } from '@homebase-id/js-lib/core';

export interface OwnerProviderOptions
  extends Omit<Omit<BaseProviderOptions, 'api'>, 'hostIdentity'> {
  api?: ApiType;
}

export class OwnerClient extends BaseOdinClient {
  constructor(options: OwnerProviderOptions) {
    super({
      ...options,
      hostIdentity: window.location.hostname,
      api: options.api || ApiType.Owner,
    });
  }
}
