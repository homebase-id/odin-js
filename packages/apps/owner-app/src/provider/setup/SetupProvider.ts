import { OdinClient, NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  HomePageConfig,
  HomePageAttributes,
  HomePageTheme,
  BlogConfig,
  getChannelDefinition,
  saveChannelDefinition,
} from '@homebase-id/js-lib/public';
import { base64ToUint8Array, getNewId, toGuidId } from '@homebase-id/js-lib/helpers';
import {
  ProfileDefinition,
  BuiltInProfiles,
  getProfileDefinition,
  saveProfileDefinition,
  saveProfileSection,
  BuiltInAttributes,
  LocationFields,
  MinimalProfileFields,
  getProfileAttribute,
  LinkFields,
  SocialFields,
  getProfileAttributes,
  Attribute,
} from '@homebase-id/js-lib/profile';
import { FollowRequest, createOrUpdateFollow } from '@homebase-id/js-lib/network';
import { saveProfileAttribute } from '../profile/AttributeData/ManageAttributeProvider';
import { fallbackHeaderImage, invalidateSiteData } from '@homebase-id/common-app';
import { QueryClient } from '@tanstack/react-query';

export const SetupProfileDefinition = async (odinClient: OdinClient) => {
  const initialStandardProfile: ProfileDefinition = {
    profileId: BuiltInProfiles.StandardProfileId,
    name: 'Standard Info',
    description: 'Standard Profile Information',
    isSystemSection: true,
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

  const initialAboutSection = {
    sectionId: BuiltInProfiles.AboutSectionId,
    name: 'About',
    priority: 3000,
    isSystemSection: true,
  };

  const initialWallet: ProfileDefinition = {
    profileId: BuiltInProfiles.WalletId,
    name: 'Wallet',
    description: 'My wallet',
    isSystemSection: true,
  };

  const initialCreditCardSection = {
    sectionId: BuiltInProfiles.CreditCardsSectionId,
    name: 'Credit Cards',
    priority: 1000,
    isSystemSection: true,
  };

  if (!(await getProfileDefinition(odinClient, initialStandardProfile.profileId))) {
    await saveProfileDefinition(odinClient, initialStandardProfile);

    await saveProfileSection(
      odinClient,
      initialStandardProfile.profileId,
      initialPersonalInfoSection
    );
    await saveProfileSection(odinClient, initialStandardProfile.profileId, initialLinksSection);
    await saveProfileSection(odinClient, initialStandardProfile.profileId, initialAboutSection);
  }
  if (!(await getProfileDefinition(odinClient, initialWallet.profileId))) {
    await saveProfileDefinition(odinClient, initialWallet);

    await saveProfileSection(odinClient, initialWallet.profileId, initialCreditCardSection);
  }

  const defaultShortBioAttribute: NewHomebaseFile<Attribute> = {
    fileMetadata: {
      appData: {
        content: {
          id: getNewId(),
          profileId: BuiltInProfiles.StandardProfileId,
          type: BuiltInAttributes.FullBio,
          priority: 10000,
          sectionId: BuiltInProfiles.AboutSectionId,
          data: {
            short_bio:
              'Born in a serene town that instilled values of compassion and integrity, embodies the essence of a true global citizen.',
          },
        },
      },
    },
    serverMetadata: {
      accessControlList: ANONYMOUS_ACL,
    },
  };

  const shortBioAttr = await getProfileAttributes(
    odinClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.FullBio],
    1
  );

  if (!shortBioAttr?.length) await saveProfileAttribute(odinClient, defaultShortBioAttribute);

  const defaultStatusAttribute: NewHomebaseFile<Attribute> = {
    fileMetadata: {
      appData: {
        content: {
          id: getNewId(),
          profileId: BuiltInProfiles.StandardProfileId,
          type: BuiltInAttributes.Status,
          priority: 10000,
          sectionId: BuiltInProfiles.PersonalInfoSectionId,
          data: { status: 'New Identity Owner' },
        },
      },
    },
    serverMetadata: {
      accessControlList: ANONYMOUS_ACL,
    },
  };

  const statusAttr = await getProfileAttributes(
    odinClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.Status],
    1
  );

  if (!statusAttr?.length) await saveProfileAttribute(odinClient, defaultStatusAttribute);
};

export const SetupHome = async (odinClient: OdinClient) => {
  const defaultThemeAttribute: NewHomebaseFile<Attribute> = {
    fileMetadata: {
      appData: {
        content: {
          id: getNewId(),
          profileId: HomePageConfig.DefaultDriveId,
          type: HomePageAttributes.Theme,
          priority: 1000,
          sectionId: HomePageConfig.AttributeSectionNotApplicable,
          data: {
            themeId: HomePageTheme.VerticalPosts + '',
            isProtected: true,
            headerImageKey: new Blob([base64ToUint8Array(fallbackHeaderImage())], {
              type: 'image/svg+xml',
            }),
          },
        },
      },
    },
    serverMetadata: { accessControlList: ANONYMOUS_ACL },
  };

  const themeDef = await getProfileAttributes(
    odinClient,
    HomePageConfig.DefaultDriveId,
    undefined,
    [HomePageAttributes.Theme],
    1
  );

  if (!themeDef?.length) await saveProfileAttribute(odinClient, defaultThemeAttribute);
};

export const SetupBlog = async (odinClient: OdinClient) => {
  // Create Public Channel oon the (Default) Public Posts Drive
  const publicDef = await getChannelDefinition(odinClient, BlogConfig.PublicChannelId);
  if (!publicDef) {
    await saveChannelDefinition(odinClient, BlogConfig.PublicChannelNewDsr);
  }
};

export interface ProfileSetupData {
  givenName: string;
  surname: string;
  city?: string;
  country?: string;
  imageData?: Blob;
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

const SetupProfileData = async (
  queryClient: QueryClient,
  odinClient: OdinClient,
  profileData: ProfileSetupData
) => {
  // Default Photo Attribute
  const defaultPhotoAttrId = toGuidId('default_photo_attribute');
  const existingPhotoAttr = await getProfileAttribute(
    odinClient,
    BuiltInProfiles.StandardProfileId,
    defaultPhotoAttrId
  );

  if (!existingPhotoAttr && profileData.imageData) {
    const newPhotoAttr: NewHomebaseFile<Attribute> = {
      fileMetadata: {
        appData: {
          content: {
            id: defaultPhotoAttrId,
            profileId: BuiltInProfiles.StandardProfileId,
            type: BuiltInAttributes.Photo,
            priority: 9000, // a High Prio, so new ones get a better one
            sectionId: BuiltInProfiles.PersonalInfoSectionId,
            data: {},
          },
        },
      },
      serverMetadata: { accessControlList: ANONYMOUS_ACL },
    };

    if (!newPhotoAttr.fileMetadata.appData.content.data)
      newPhotoAttr.fileMetadata.appData.content.data = {};
    newPhotoAttr.fileMetadata.appData.content.data[MinimalProfileFields.ProfileImageKey] =
      profileData.imageData;

    await saveProfileAttribute(odinClient, newPhotoAttr);
  }

  // Default Name Attribute
  const defaultNameAttrId = toGuidId('default_name_attribute');
  const existingNameAttr = await getProfileAttribute(
    odinClient,
    BuiltInProfiles.StandardProfileId,
    defaultNameAttrId
  );

  if (!existingNameAttr) {
    const newNameAttr: NewHomebaseFile<Attribute> = {
      fileMetadata: {
        appData: {
          content: {
            id: defaultNameAttrId,
            profileId: BuiltInProfiles.StandardProfileId,
            type: BuiltInAttributes.Name,
            priority: 2000,
            sectionId: BuiltInProfiles.PersonalInfoSectionId,
            data: {},
          },
        },
      },
      serverMetadata: { accessControlList: ANONYMOUS_ACL },
    };

    if (!newNameAttr.fileMetadata.appData.content.data)
      newNameAttr.fileMetadata.appData.content.data = {};
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.GivenNameId] =
      profileData.givenName;
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.SurnameId] =
      profileData.surname;
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.DisplayName] =
      `${profileData.givenName} ${profileData.surname}`;

    await saveProfileAttribute(odinClient, newNameAttr);
  }

  // Default Location Attribute (Optional)
  if (profileData.city || profileData.country) {
    const defaultLocationAttrId = toGuidId('default_location_attribute');
    const existingLocationAttr = await getProfileAttribute(
      odinClient,
      BuiltInProfiles.StandardProfileId,
      defaultLocationAttrId
    );

    if (!existingLocationAttr) {
      const newLocationAttr: NewHomebaseFile<Attribute> = {
        fileMetadata: {
          appData: {
            content: {
              id: defaultLocationAttrId,
              profileId: BuiltInProfiles.StandardProfileId,
              type: BuiltInAttributes.Address,
              priority: 3000,
              sectionId: BuiltInProfiles.PersonalInfoSectionId,
              data: {},
            },
          },
        },
        serverMetadata: { accessControlList: ANONYMOUS_ACL },
      };

      if (!newLocationAttr.fileMetadata.appData.content.data)
        newLocationAttr.fileMetadata.appData.content.data = {};
      newLocationAttr.fileMetadata.appData.content.data[LocationFields.City] =
        profileData.city ?? '';
      newLocationAttr.fileMetadata.appData.content.data[LocationFields.Country] =
        profileData.country ?? '';

      await saveProfileAttribute(odinClient, newLocationAttr);
    }
  }

  invalidateSiteData(queryClient);
};

const SetupSocialData = async (
  queryClient: QueryClient,
  odinClient: OdinClient,
  socialData: SocialSetupData
) => {
  const saveSocial = async (type: string, dataField: string, value: string, priority: number) => {
    // Search attribute:
    const foundAttributesOfType = await getProfileAttributes(
      odinClient,
      BuiltInProfiles.StandardProfileId,
      undefined,
      [type]
    );

    if (!foundAttributesOfType?.length) {
      // Create attribute:
      const socialAttribute: NewHomebaseFile<Attribute> = {
        fileMetadata: {
          appData: {
            content: {
              id: getNewId(),
              profileId: BuiltInProfiles.StandardProfileId,
              type: type,
              priority: priority,
              sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
              data: {},
            },
          },
        },
        serverMetadata: { accessControlList: ANONYMOUS_ACL },
      };

      if (!socialAttribute.fileMetadata.appData.content.data)
        socialAttribute.fileMetadata.appData.content.data = {};
      socialAttribute.fileMetadata.appData.content.data[dataField] = value;

      await saveProfileAttribute(odinClient, socialAttribute);
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
        const linkAttribute: NewHomebaseFile<Attribute> = {
          fileMetadata: {
            appData: {
              content: {
                id: getNewId(),
                profileId: BuiltInProfiles.StandardProfileId,
                type: BuiltInAttributes.Link,
                priority: 10000 + index * 1000,
                sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
                data: {},
              },
            },
          },
          serverMetadata: { accessControlList: ANONYMOUS_ACL },
        };

        if (!linkAttribute.fileMetadata.appData.content.data)
          linkAttribute.fileMetadata.appData.content.data = {};
        linkAttribute.fileMetadata.appData.content.data[LinkFields.LinkText] = link.text;
        linkAttribute.fileMetadata.appData.content.data[LinkFields.LinkTarget] = link.target;

        return await saveProfileAttribute(odinClient, linkAttribute);
      })
    );

  invalidateSiteData(queryClient);
};

export const SetupDefaultIdentity = async (
  queryClient: QueryClient,
  odinClient: OdinClient,
  data: { profile: ProfileSetupData; social: SocialSetupData }
) => {
  await SetupProfileData(queryClient, odinClient, data.profile);
  await SetupSocialData(queryClient, odinClient, data.social);
};

const DEFAULT_FOLLOW_REQUEST: FollowRequest = {
  notificationType: 'allNotifications',
  odinId: 'id.homebase.id',
};
export const SetupAutoFollow = async (odinClient: OdinClient) => {
  await createOrUpdateFollow(odinClient, DEFAULT_FOLLOW_REQUEST, false);
};
