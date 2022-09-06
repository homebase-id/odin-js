import { HomePageConfig } from '../home/HomeTypes';

import { ProviderOptions } from '../../core/ProviderBase';
import { DriveProvider } from '../../core/DriveData/DriveProvider';
import AttributeDataProvider from '../../core/AttributeData/AttributeDataProvider';

import { AttributeFile } from '../../core/AttributeData/AttributeDataTypes';
import HomePageReadOnlyProvider from './HomePageReadOnlyProvider';
interface HomePageProviderOptions extends ProviderOptions {
  driveProvider: DriveProvider;
  attributeDataProvider: AttributeDataProvider;
}

export default class HomePageProvider extends HomePageReadOnlyProvider {
  private _driveProvider: DriveProvider;

  constructor(options: HomePageProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
      attributeDataProvider: options.attributeDataProvider,
    });
    this._driveProvider = options.driveProvider;
  }

  async ensureConfiguration() {
    await this._driveProvider.EnsureDrive(
      HomePageConfig.HomepageTargetDrive,
      'Home page config drive',
      '',
      true
    );
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    attribute.profileId = HomePageConfig.DefaultDriveId;
    // TODO: validate why type got overruled in all cases
    if (!attribute.type) {
      attribute.type = HomePageConfig.AttributeTypeNotApplicable.toString();
    }
    attribute.sectionId = HomePageConfig.AttributeSectionNotApplicable.toString();
    return await this._attributeDataProvider.saveAttribute(attribute);
  }
}
