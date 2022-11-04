import { ProviderBase, ProviderOptions } from '../core/ProviderBase';
import { Attribute, AttributeFile } from '../core/AttributeData/AttributeDataTypes';
import { AttributeDataProvider } from '../core/AttributeData/AttributeDataProvider';
import { MediaProvider } from '../core/MediaData/MediaProvider';
import { DataUtil } from '../core/DataUtil';
import { AttributeDefinitions } from '../core/AttributeData/AttributeDefinitions';
import { BuiltInProfiles, MinimalProfileFields } from './ProfileConfig';
import { SecurityGroupType } from '../core/DriveData/DriveUploadTypes';
import { getTargetDriveFromProfileId } from './ProfileDefinitionProvider';
import { HomePageAttributes, HomePageFields } from '../public/home/HomeTypes';

interface ProfileDataProviderOptions extends ProviderOptions {
  attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;
}

export class ProfileDataProvider extends ProviderBase {
  private _attributeDataProvider: AttributeDataProvider;
  private _mediaProvider: MediaProvider;

  constructor(options: ProfileDataProviderOptions) {
    super({
      api: options.api,
      sharedSecret: options.sharedSecret,
    });

    this._attributeDataProvider = options.attributeDataProvider;
    this._mediaProvider = options.mediaProvider;
  }

  async ensureConfiguration() {
    // Personal Info Section:
    const defaultNameAttrId = DataUtil.toGuidId('default_name_attribute');
    const defaultPhotoAttrId = DataUtil.toGuidId('default_photo_attribute');

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
    const defaultTwitterAttrId = DataUtil.toGuidId('default_twitter_attribute');
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

    const defaultFacebookAttrId = DataUtil.toGuidId('default_facebook_attribute');
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

    const defaultInstagramAttrId = DataUtil.toGuidId('default_instagram_attribute');
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

    const defaultTiktokAttrId = DataUtil.toGuidId('default_tiktok_attribute');
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

    const defaultLinkedinAttrId = DataUtil.toGuidId('default_linkedin_attribute');
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
    const defaulCreditCardAttrId = DataUtil.toGuidId('default_creditcard_attribute');
    if (!(await this.getAttribute(BuiltInProfiles.WalletId, defaulCreditCardAttrId))) {
      const defaulCreditCardAttrFile: AttributeFile = {
        id: defaulCreditCardAttrId,
        type: AttributeDefinitions.CreditCard.type,
        acl: { requiredSecurityGroup: SecurityGroupType.Owner },
        profileId: BuiltInProfiles.WalletId,
        priority: 1000,
        sectionId: BuiltInProfiles.CreditCardsSectionId,
        data: {},
      };
      await this.saveAttribute(defaulCreditCardAttrFile);
    }
  }

  async saveAttribute(attribute: AttributeFile): Promise<AttributeFile> {
    // If the attribute is a photo attribute and there is a fileId (which means it already exists)
    if (
      (attribute.type === AttributeDefinitions.Photo.type ||
        attribute.type === HomePageAttributes.HomePage) &&
      attribute.fileId
    ) {
      const imageFieldKey =
        attribute.type === AttributeDefinitions.Photo.type
          ? MinimalProfileFields.ProfileImageId
          : HomePageFields.HeaderImageId;

      // TODO: Is this the way forward, should there be another way of handling this?
      // Update on an image holding attribute; We need to check the image file itself and potentially reupload to match the ACL
      const imageFileId = attribute.data[imageFieldKey];
      const targetDrive = getTargetDriveFromProfileId(attribute.profileId);
      if (imageFileId) {
        const imageFileMeta = await this._mediaProvider.getDecryptedMetadata(
          targetDrive,
          imageFileId
        );

        if (
          imageFileMeta &&
          !DataUtil.aclEqual(attribute.acl, imageFileMeta.serverMetadata.accessControlList)
        ) {
          // Not what it should be, going to reupload it in full
          const imageData = await this._mediaProvider.getDecryptedImageData(
            targetDrive,
            imageFileId
          );

          if (imageData) {
            await this._mediaProvider.uploadImage(
              targetDrive,
              undefined,
              attribute.acl,
              new Uint8Array(imageData.content),
              imageFileId,
              imageData.contentType
            );
          }
        }
      }
    }

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
  ): Promise<AttributeFile[] | undefined> {
    return this._attributeDataProvider.getAttributeVersions(profileId, sectionId, type);
  }

  async getBestAttributeVersion(
    profileId: string,
    sectionId: string | undefined,
    type: string
  ): Promise<Attribute | undefined> {
    const allAttributes = await this.getAttributeVersions(profileId, sectionId, type);
    return allAttributes?.[0];
  }
}
