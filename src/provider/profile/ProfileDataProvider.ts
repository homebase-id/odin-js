import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import {
  Attribute,
  AttributeFile,
  OrderedAttributeList,
} from '../core/AttributeData/AttributeDataTypes';
import AttributeDataProvider from '../core/AttributeData/AttributeDataProvider';
import { DataUtil } from '../core/DataUtil';
import { AttributeDefinitions } from '../core/AttributeData/AttributeDefinitions';
import { BuiltInProfiles } from './ProfileConfig';
import { SecurityGroupType } from '../core/DriveData/DriveUploadTypes';

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

  async ensureConfiguration() {
    // Personal Info Section:
    const defaultNameAttrId = DataUtil.toByteArrayId('default_name_attribute');
    const defaultPhotoAttrId = DataUtil.toByteArrayId('default_photo_attribute');

    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultNameAttrId))) {
      const defaultNameAttributeFile: AttributeFile = {
        id: defaultNameAttrId,
        type: AttributeDefinitions.Name.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
      };
      await this.saveAttribute(defaultNameAttributeFile);
    }

    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultPhotoAttrId))) {
      const defaultPhotoAttributeFile: AttributeFile = {
        id: defaultPhotoAttrId,
        type: AttributeDefinitions.Photo.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
      };
      await this.saveAttribute(defaultPhotoAttributeFile);
    }

    // Social Info Section:
    const defaultTwitterAttrId = DataUtil.toByteArrayId('default_twitter_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultTwitterAttrId))) {
      const defaultTwitterAttrFile: AttributeFile = {
        id: defaultTwitterAttrId,
        type: AttributeDefinitions.TwitterUsername.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await this.saveAttribute(defaultTwitterAttrFile);
    }

    const defaultFacebookAttrId = DataUtil.toByteArrayId('default_facebook_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultFacebookAttrId))) {
      const defaultFacebookAttrFile: AttributeFile = {
        id: defaultFacebookAttrId,
        type: AttributeDefinitions.FacebookUsername.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await this.saveAttribute(defaultFacebookAttrFile);
    }

    const defaultInstagramAttrId = DataUtil.toByteArrayId('default_instagram_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultInstagramAttrId))) {
      const defaultInstagramAttrFile: AttributeFile = {
        id: defaultInstagramAttrId,
        type: AttributeDefinitions.InstagramUsername.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await this.saveAttribute(defaultInstagramAttrFile);
    }

    const defaultTiktokAttrId = DataUtil.toByteArrayId('default_tiktok_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultTiktokAttrId))) {
      const defaultTiktokAttrFile: AttributeFile = {
        id: defaultTiktokAttrId,
        type: AttributeDefinitions.TiktokUsername.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await this.saveAttribute(defaultTiktokAttrFile);
    }

    const defaultLinkedinAttrId = DataUtil.toByteArrayId('default_linkedin_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.StandardProfileId, defaultLinkedinAttrId))) {
      const defaultLinkedinAttrFile: AttributeFile = {
        id: defaultLinkedinAttrId,
        type: AttributeDefinitions.LinkedinUsername.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await this.saveAttribute(defaultLinkedinAttrFile);
    }

    // Financial Info Section:
    const defaulCreditCardAttrId = DataUtil.toByteArrayId('default_creditcard_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.FinancialProfileId, defaulCreditCardAttrId))) {
      const defaulCreditCardAttrFile: AttributeFile = {
        id: defaulCreditCardAttrId,
        type: AttributeDefinitions.CreditCard.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Owner },
        profileId: BuiltInProfiles.FinancialProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.CreditCardsSectionId,
        data: {},
      };
      await this.saveAttribute(defaulCreditCardAttrFile);
    }
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
    sectionId: string | undefined,
    type: string
  ): Promise<OrderedAttributeList | null> {
    return this._attributeDataProvider.getAttributeVersions(profileId, sectionId, type);
  }

  async getBestAttributeVersion(
    profileId: string,
    sectionId: string | undefined,
    type: string
  ): Promise<Attribute | undefined> {
    const allVersions = await this.getAttributeVersions(profileId, sectionId, type);
    return allVersions?.versions[0];
  }
}
