import { HomePageConfig } from '../home/HomeTypes';

import { ProviderOptions } from '../../core/ProviderBase';
import { AttributeDataProvider } from '../../core/AttributeData/AttributeDataProvider';

import { AttributeFile } from '../../core/AttributeData/AttributeDataTypes';
import { HomePageReadOnlyProvider } from './HomePageReadOnlyProvider';
interface HomePageProviderOptions extends ProviderOptions {
  attributeDataProvider: AttributeDataProvider;
}

export class HomePageProvider extends HomePageReadOnlyProvider {
  constructor(options: HomePageProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
      attributeDataProvider: options.attributeDataProvider,
    });
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    attribute.profileId = HomePageConfig.DefaultDriveId;
    if (!attribute.type) {
      attribute.type = HomePageConfig.AttributeTypeNotApplicable.toString();
    }
    attribute.sectionId = HomePageConfig.AttributeSectionNotApplicable.toString();
    return await this._attributeDataProvider.saveAttribute(attribute);
  }
}
