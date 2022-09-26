import { HomePageConfig } from '../home/HomeTypes';
import { ProviderBase, ProviderOptions } from '../../core/ProviderBase';
import AttributeDataProvider from '../../core/AttributeData/AttributeDataProvider';

import { Attribute, AttributeFile } from '../../core/AttributeData/AttributeDataTypes';

interface HomePageReadOnlyProviderOptions extends ProviderOptions {
  attributeDataProvider: AttributeDataProvider;
}

export default class HomePageReadOnlyProvider extends ProviderBase {
  protected _attributeDataProvider: AttributeDataProvider;

  constructor(options: HomePageReadOnlyProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });

    this._attributeDataProvider = options.attributeDataProvider;
  }

  async getAttribute(attributeId: string): Promise<AttributeFile | undefined> {
    return this._attributeDataProvider.getAttribute(HomePageConfig.DefaultDriveId, attributeId);
  }

  async getAttributes(type: string): Promise<AttributeFile[] | undefined> {
    return await this._attributeDataProvider.getAttributes(
      HomePageConfig.DefaultDriveId,
      [type],
      10
    );
  }

  async getBestAttributeVersion(type: string): Promise<Attribute | undefined> {
    const allAttributes = await this._attributeDataProvider.getAttributeVersions(
      HomePageConfig.DefaultDriveId,
      undefined,
      type
    );

    return allAttributes?.[0];
  }
}
