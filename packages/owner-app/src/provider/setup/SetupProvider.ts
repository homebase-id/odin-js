import {
  DotYouClient,
  ImageContentType,
  SecurityGroupType,
  uploadImage,
} from '@youfoundation/js-lib/core';
import {
  HomePageConfig,
  HomePageAttributes,
  HomePageTheme,
  BlogConfig,
  getChannelDefinition,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';
import { base64ToUint8Array, getNewId, toGuidId } from '@youfoundation/js-lib/helpers';
import {
  ProfileDefinition,
  BuiltInProfiles,
  getProfileDefinition,
  saveProfileDefinition,
  saveProfileSection,
  getAttributes,
  saveAttribute,
  AttributeFile,
  BuiltInAttributes,
  GetTargetDriveFromProfileId,
  LocationFields,
  MinimalProfileFields,
  getAttribute,
  LinkFields,
  SocialFields,
  getAttributeVersions,
} from '@youfoundation/js-lib/profile';
import { AttributeVm } from '../../hooks/profiles/useAttributes';
import { fallbackHeaderImage } from '../../templates/Setup/fallbackImage';

export const SetupProfileDefinition = async (dotYouClient: DotYouClient) => {
  const initialStandardProfile: ProfileDefinition = {
    profileId: BuiltInProfiles.StandardProfileId,
    name: 'Standard Info',
    description: 'Standard Profile Information',
  };

  const initialPersonalInfoSection = {
    sectionId: BuiltInProfiles.PersonalInfoSectionId,
    name: 'Personal Info',
    priority: 1000,
    isSystemSection: true,
  };

  const initialLinksSection = {
    sectionId: BuiltInProfiles.ExternalLinksSectionId,
    name: 'Links',
    priority: 2000,
    isSystemSection: true,
  };

  const initialWallet: ProfileDefinition = {
    profileId: BuiltInProfiles.WalletId,
    name: 'Wallet',
    description: 'My wallet',
  };

  const initialCreditCardSection = {
    sectionId: BuiltInProfiles.CreditCardsSectionId,
    name: 'Credit Cards',
    priority: 1000,
    isSystemSection: true,
  };

  if (!(await getProfileDefinition(dotYouClient, initialStandardProfile.profileId))) {
    await saveProfileDefinition(dotYouClient, initialStandardProfile);

    await saveProfileSection(
      dotYouClient,
      initialStandardProfile.profileId,
      initialPersonalInfoSection
    );
    await saveProfileSection(dotYouClient, initialStandardProfile.profileId, initialLinksSection);
  }
  if (!(await getProfileDefinition(dotYouClient, initialWallet.profileId))) {
    await saveProfileDefinition(dotYouClient, initialWallet);

    await saveProfileSection(dotYouClient, initialWallet.profileId, initialCreditCardSection);
  }
};

export const SetupHome = async (dotYouClient: DotYouClient) => {
  const headerImageFileId = (
    await uploadImage(
      dotYouClient,
      HomePageConfig.HomepageTargetDrive,
      ANONYMOUS_ACL,
      base64ToUint8Array(fallbackHeaderImage()),
      undefined,
      { type: 'image/svg+xml' }
    )
  )?.fileId;

  const defaultHomeAttribute: AttributeVm = {
    id: getNewId(),
    profileId: HomePageConfig.DefaultDriveId,
    type: HomePageAttributes.HomePage,
    priority: 1000,
    sectionId: HomePageConfig.AttributeSectionNotApplicable,
    data: {
      headerImageId: headerImageFileId,
      leadText:
        'Born in a serene town that instilled values of compassion and integrity, embodies the essence of a true global citizen.',
      tagLine: 'New Identity Owner',
      isProtected: true,
    },
    acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
    typeDefinition: {
      type: HomePageAttributes.HomePage,
      name: 'Homepage',
      description: '',
    },
  };

  const defaultThemeAttribute: AttributeVm = {
    id: getNewId(),
    profileId: HomePageConfig.DefaultDriveId,
    type: HomePageAttributes.Theme,
    priority: 1000,
    sectionId: HomePageConfig.AttributeSectionNotApplicable,
    data: { themeId: HomePageTheme.SocialClassic + '', isProtected: true },
    acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
    typeDefinition: {
      type: HomePageAttributes.Theme,
      name: 'Theme',
      description: '',
    },
  };

  const homeDef = await getAttributes(
    dotYouClient,
    HomePageConfig.DefaultDriveId,
    [HomePageAttributes.HomePage],
    1
  );

  if (!homeDef?.length) await saveAttribute(dotYouClient, defaultHomeAttribute);

  const themeDef = await getAttributes(
    dotYouClient,
    HomePageConfig.DefaultDriveId,
    [HomePageAttributes.Theme],
    1
  );

  if (!themeDef?.length) await saveAttribute(dotYouClient, defaultThemeAttribute);
};

export const SetupBlog = async (dotYouClient: DotYouClient) => {
  // Create Public Channel oon the (Default) Public Posts Drive
  const publicDef = await getChannelDefinition(dotYouClient, BlogConfig.PublicChannel.channelId);
  if (!publicDef) {
    await saveChannelDefinition(dotYouClient, BlogConfig.PublicChannel);
  }
};

export interface ProfileSetupData {
  givenName: string;
  surname: string;
  city?: string;
  country?: string;
  imageData?: {
    bytes: Uint8Array;
    type: ImageContentType;
  };
}

export interface SocialSetupData {
  odinId?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  other: { text: string; target: string }[];
}

const ANONYMOUS_ACL = { requiredSecurityGroup: SecurityGroupType.Anonymous };

const SetupProfileData = async (dotYouClient: DotYouClient, profileData: ProfileSetupData) => {
  const defaultPhotoAttrId = toGuidId('default_photo_attribute');
  const existingPhotoAttr = await getAttribute(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    defaultPhotoAttrId
  );

  if (!existingPhotoAttr && profileData.imageData) {
    const mediaFileId = (
      await uploadImage(
        dotYouClient,
        GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
        ANONYMOUS_ACL,
        profileData.imageData.bytes,
        undefined,
        { type: profileData.imageData?.type as ImageContentType }
      )
    )?.fileId;

    const newPhotoAttr: AttributeFile = {
      id: defaultPhotoAttrId,
      profileId: BuiltInProfiles.StandardProfileId,
      type: BuiltInAttributes.Photo,
      priority: 9000, // a High Prio, so new ones get a better one
      sectionId: BuiltInProfiles.PersonalInfoSectionId,
      data: {},
      acl: ANONYMOUS_ACL,
    };

    newPhotoAttr.data[MinimalProfileFields.ProfileImageId] = mediaFileId?.toString();

    await saveAttribute(dotYouClient, newPhotoAttr);
  }

  const defaultNameAttrId = toGuidId('default_name_attribute');
  const existingNameAttr = await getAttribute(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    defaultNameAttrId
  );

  if (!existingNameAttr) {
    const newNameAttr: AttributeFile = {
      id: defaultNameAttrId,
      profileId: BuiltInProfiles.StandardProfileId,
      type: BuiltInAttributes.Name,
      priority: 2000,
      sectionId: BuiltInProfiles.PersonalInfoSectionId,
      data: {},
      acl: ANONYMOUS_ACL,
    };

    newNameAttr.data[MinimalProfileFields.GivenNameId] = profileData.givenName;
    newNameAttr.data[MinimalProfileFields.SurnameId] = profileData.surname;
    newNameAttr.data[
      MinimalProfileFields.DisplayName
    ] = `${profileData.givenName} ${profileData.surname}`;

    await saveAttribute(dotYouClient, newNameAttr);
  }

  if (profileData.city || profileData.country) {
    const defaultLocationAttrId = toGuidId('default_location_attribute');
    const existingLocationAttr = await getAttribute(
      dotYouClient,
      BuiltInProfiles.StandardProfileId,
      defaultLocationAttrId
    );

    if (!existingLocationAttr) {
      const newLocationAttr: AttributeFile = {
        id: defaultLocationAttrId,
        profileId: BuiltInProfiles.StandardProfileId,
        type: BuiltInAttributes.Address,
        priority: 3000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
        acl: ANONYMOUS_ACL,
      };

      newLocationAttr.data[LocationFields.City] = profileData.city ?? '';
      newLocationAttr.data[LocationFields.Country] = profileData.country ?? '';

      await saveAttribute(dotYouClient, newLocationAttr);
    }
  }
};

const SetupSocialData = async (dotYouClient: DotYouClient, socialData: SocialSetupData) => {
  const saveSocial = async (type: string, dataField: string, value: string, priority: number) => {
    // Search attribute:
    const foundAttributesOfType = await getAttributeVersions(
      dotYouClient,
      BuiltInProfiles.StandardProfileId,
      undefined,
      [type]
    );

    if (!foundAttributesOfType?.length) {
      // Create attribute:
      const socialAttribute: AttributeFile = {
        id: getNewId(),
        profileId: BuiltInProfiles.StandardProfileId,
        type: type,
        priority: priority,
        sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
        data: {},
        acl: ANONYMOUS_ACL,
      };

      socialAttribute.data[dataField] = value;

      await saveAttribute(dotYouClient, socialAttribute);
    }

    return true;
  };

  if (socialData.odinId)
    await saveSocial(
      BuiltInAttributes.HomebaseIdentity,
      SocialFields.Homebase,
      socialData.odinId,
      1000
    );

  if (socialData.facebook)
    await saveSocial(
      BuiltInAttributes.FacebookUsername,
      SocialFields.Facebook,
      socialData.facebook,
      2000
    );

  if (socialData.instagram)
    await saveSocial(
      BuiltInAttributes.InstagramUsername,
      SocialFields.Instagram,
      socialData.instagram,
      3000
    );

  if (socialData.tiktok)
    await saveSocial(
      BuiltInAttributes.TiktokUsername,
      SocialFields.Tiktok,
      socialData.tiktok,
      5000
    );

  if (socialData.twitter)
    await saveSocial(
      BuiltInAttributes.TwitterUsername,
      SocialFields.Twitter,
      socialData.twitter,
      6000
    );

  if (socialData.linkedin)
    await saveSocial(
      BuiltInAttributes.LinkedinUsername,
      SocialFields.LinkedIn,
      socialData.linkedin,
      7000
    );

  if (socialData.other)
    await Promise.all(
      socialData.other.map(async (link, index) => {
        const linkAttribute: AttributeFile = {
          id: getNewId(),
          profileId: BuiltInProfiles.StandardProfileId,
          type: BuiltInAttributes.Link,
          priority: 10000 + index * 1000,
          sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
          data: {},
          acl: ANONYMOUS_ACL,
        };

        linkAttribute.data[LinkFields.LinkText] = link.text;
        linkAttribute.data[LinkFields.LinkTarget] = link.target;

        return await saveAttribute(dotYouClient, linkAttribute);
      })
    );
};

export const SetupDefaultIdentity = async (
  dotYouClient: DotYouClient,
  data: { profile: ProfileSetupData; social: SocialSetupData }
) => {
  await SetupProfileData(dotYouClient, data.profile);
  await SetupSocialData(dotYouClient, data.social);
};
