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
import { AttributeDefinitions } from '../core/AttributeData/AttributeDefinitions';

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
      BuiltInProfiles.StandardProfileId,
      BuiltInProfiles.PersonalInfoSectionId,
      1,
      100
    );
  }

  async getSocialIdentities(): Promise<AttributeDisplayHash> {
    return this.getDisplayableSectionAttributes(
      BuiltInProfiles.StandardProfileId,
      BuiltInProfiles.SocialIdentitySectionId,
      1,
      100
    );
  }

  //Returns the top version of each attribute by type for the given section.
  async getDisplayableSectionAttributes(
    profileId: Guid,
    sectionId: Guid,
    pageNumber: number,
    pageSize: number
  ): Promise<AttributeDisplayHash> {
    const attributes = await this._attributeDataProvider.getProfileAttributes(
      profileId,
      sectionId,
      pageNumber,
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
    profileId: Guid,
    sectionId: Guid | undefined,
    pageNumber: number,
    pageSize: number
  ): Promise<Attribute[]> {
    return await this._attributeDataProvider.getProfileAttributes(
      profileId,
      sectionId,
      pageNumber,
      pageSize
    );
  }

  async getAttribute(profileId: Guid, id: Guid): Promise<AttributeFile | undefined> {
    return await this._attributeDataProvider.getAttribute(profileId, id);
  }

  async getAttributeVersions(
    profileId: Guid,
    sectionId: Guid,
    type: Guid
  ): Promise<OrderedAttributeList | null> {
    return this._attributeDataProvider.getAttributeVersions(profileId, sectionId, type);
  }

  async getBestAttributeVersion(
    profileId: Guid,
    sectionId: Guid,
    type: Guid
  ): Promise<Attribute | undefined> {
    const allVersions = await this.getAttributeVersions(profileId, sectionId, type);
    if (type === AttributeDefinitions.Photo.type) {
      console.log(allVersions);
    }
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
