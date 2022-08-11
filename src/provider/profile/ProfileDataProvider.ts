import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import {
  Attribute,
  AttributeFile,
  OrderedAttributeList,
} from '../core/AttributeData/AttributeDataTypes';
import AttributeDataProvider from '../core/AttributeData/AttributeDataProvider';

interface ProfileDataProviderOptions extends ProviderOptions {
  attributeDataProvider: AttributeDataProvider;
}

export default class ProfileDataProvider extends ProviderBase {
  private _attributeDataProvider: AttributeDataProvider;

  constructor(options: ProfileDataProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });

    this._attributeDataProvider = options.attributeDataProvider;
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    const result = await this._attributeDataProvider.saveAttribute(attribute);

    return result;
  }

  async getProfileAttributes(
    profileId: string,
    sectionId: string | undefined,
    pageSize: number
  ): Promise<AttributeFile[]> {
    return await this._attributeDataProvider.getProfileAttributes(profileId, sectionId, pageSize);
  }

  async getAttribute(profileId: string, id: string): Promise<AttributeFile | undefined> {
    return await this._attributeDataProvider.getAttribute(profileId, id);
  }

  async removeAttribute(profileId: string, attributeFileId: string): Promise<void> {
    return this._attributeDataProvider.removeAttribute(profileId, attributeFileId);
  }

  async getAttributeVersions(
    profileId: string,
    sectionId: string,
    type: string
  ): Promise<OrderedAttributeList | null> {
    return this._attributeDataProvider.getAttributeVersions(profileId, sectionId, type);
  }

  async getBestAttributeVersion(
    profileId: string,
    sectionId: string,
    type: string
  ): Promise<Attribute | undefined> {
    const allVersions = await this.getAttributeVersions(profileId, sectionId, type);
    return allVersions?.versions[0];
  }
}
