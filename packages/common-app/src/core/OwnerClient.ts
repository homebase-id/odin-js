import { BaseProviderOptions, ApiType, BaseDotYouClient } from '@homebase-id/js-lib/core';

export interface OwnerProviderOptions extends Omit<BaseProviderOptions, 'api'> {
  api?: ApiType;
}

export class OwnerClient extends BaseDotYouClient {
  constructor(options: OwnerProviderOptions) {
    super({ ...options, api: options.api || ApiType.Owner });
  }
}
