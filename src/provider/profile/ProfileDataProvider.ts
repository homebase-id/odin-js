import { Guid } from 'guid-typescript';
import { BuiltInProfiles } from './ProfileConfig';
import orderBy from 'lodash-es/orderBy';
import groupBy from 'lodash-es/groupBy';
import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import {
  Attribute,
  AttributeDisplayHash,
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

  async getPersonalInfo(): Promise<AttributeDisplayHash> {
    return this.getDisplayableSectionAttributes(
      BuiltInProfiles.StandardProfileId.toString(),
      BuiltInProfiles.PersonalInfoSectionId.toString(),
      100
    );
  }

  async getSocialIdentities(): Promise<AttributeDisplayHash> {
    return this.getDisplayableSectionAttributes(
      BuiltInProfiles.StandardProfileId.toString(),
      BuiltInProfiles.SocialIdentitySectionId.toString(),
      100
    );
  }

  //Returns the top version of each attribute by type for the given section.
  async getDisplayableSectionAttributes(
    profileId: string,
    sectionId: string,
    pageSize: number
  ): Promise<AttributeDisplayHash> {
    const attributes = await this._attributeDataProvider.getProfileAttributes(
      profileId,
      sectionId,
      pageSize
    );
    return this.createAttributeDisplayHash(attributes);
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    const result = await this._attributeDataProvider.saveAttribute(attribute);

    //Notify other digital identities I changed my profile
    //Note: fire and forget
    // createCircleNetworkProvider().notifyConnections({
    //     targetSystemApi: 2, //circle network
    //     notificationId: 100 //profile was updated
    // });

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

  ///

  private createAttributeDisplayHash(attributes: Attribute[]): AttributeDisplayHash {
    //need to group by type then choose the best type to show based on priority
    const groups = groupBy(attributes, 'type');
    const attrTypes = Object.keys(groups).map((t) => Guid.parse(t));

    const result: AttributeDisplayHash = {};
    for (const key in attrTypes) {
      const attrTypeId = attrTypes[key];

      //now choose the best version of the attributes with-in the type
      const attributesOfType: Attribute[] = groups[attrTypeId.toString()];
      const sorted: Attribute[] = orderBy(attributesOfType, 'priority', 'asc');
      const bestVersion = sorted[0];
      result[bestVersion.type] = bestVersion;
    }

    return result;
  }
}
