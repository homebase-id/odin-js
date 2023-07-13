import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WelcomeData } from '../../templates/Setup/Setup';
import { DriveDefinitionParam, initialize } from '../../provider/system/SystemProvider';
import useAuth from '../auth/useAuth';
import useAttribute from '../profiles/useAttribute';
import { AttributeVm } from '../profiles/useAttributes';
import {
  BlogConfig,
  HomePageAttributes,
  HomePageConfig,
  HomePageTheme,
  getChannelDefinition,
  saveChannelDefinition,
} from '@youfoundation/js-lib/public';
import {
  getAttribute,
  BuiltInProfiles,
  AttributeFile,
  BuiltInAttributes,
  saveAttribute,
  ProfileDefinition,
  getProfileDefinition,
  saveProfileDefinition,
  saveProfileSection,
  getAttributes,
  GetTargetDriveFromProfileId,
  MinimalProfileFields,
  LocationFields,
  getAttributeVersions,
  SocialFields,
  LinkFields,
} from '@youfoundation/js-lib/profile';
import { ImageContentType, SecurityGroupType, uploadImage } from '@youfoundation/js-lib/core';
import { getNewId, toGuidId } from '@youfoundation/js-lib/helpers';
import { CircleDefinition } from '@youfoundation/js-lib/network';

const anonymousAcl = { requiredSecurityGroup: SecurityGroupType.Anonymous };
export const FIRST_RUN_TOKEN_STORAGE_KEY = 'first-run-token';

const useInit = () => {
  const { isAuthenticated } = useAuth();
  const { mutateAsync: saveAttr } = useAttribute({}).save;
  const firstRunToken = localStorage.getItem(FIRST_RUN_TOKEN_STORAGE_KEY);

  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const initDrives: DriveDefinitionParam[] = [
    {
      targetDrive: HomePageConfig.HomepageTargetDrive,
      name: 'Homepage Config',
      metadata: '',
      allowAnonymousReads: true,
      ownerOnly: false,
      allowSubscriptions: false,
    },
    {
      targetDrive: BlogConfig.PublicChannelDrive,
      name: 'Public Posts',
      metadata: '',
      allowAnonymousReads: true,
      ownerOnly: false,
      allowSubscriptions: true,
    },
  ];

  // TODO: Move to a setup provider

  const profileDataInit = async () => {
    // Personal Info Section:
    const defaultNameAttrId = toGuidId('default_name_attribute');
    const defaultPhotoAttrId = toGuidId('default_photo_attribute');

    if (!(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultNameAttrId))) {
      const defaultNameAttributeFile: AttributeFile = {
        id: defaultNameAttrId,
        type: BuiltInAttributes.Name,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultNameAttributeFile);
    }

    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultPhotoAttrId))
    ) {
      const defaultPhotoAttributeFile: AttributeFile = {
        id: defaultPhotoAttrId,
        type: BuiltInAttributes.Photo,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultPhotoAttributeFile);
    }

    // Social Info Section:
    const defaultTwitterAttrId = toGuidId('default_twitter_attribute');
    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultTwitterAttrId))
    ) {
      const defaultTwitterAttrFile: AttributeFile = {
        id: defaultTwitterAttrId,
        type: BuiltInAttributes.TwitterUsername,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultTwitterAttrFile);
    }

    const defaultFacebookAttrId = toGuidId('default_facebook_attribute');
    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultFacebookAttrId))
    ) {
      const defaultFacebookAttrFile: AttributeFile = {
        id: defaultFacebookAttrId,
        type: BuiltInAttributes.FacebookUsername,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultFacebookAttrFile);
    }

    const defaultInstagramAttrId = toGuidId('default_instagram_attribute');
    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultInstagramAttrId))
    ) {
      const defaultInstagramAttrFile: AttributeFile = {
        id: defaultInstagramAttrId,
        type: BuiltInAttributes.InstagramUsername,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultInstagramAttrFile);
    }

    const defaultTiktokAttrId = toGuidId('default_tiktok_attribute');
    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultTiktokAttrId))
    ) {
      const defaultTiktokAttrFile: AttributeFile = {
        id: defaultTiktokAttrId,
        type: BuiltInAttributes.TiktokUsername,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultTiktokAttrFile);
    }

    const defaultLinkedinAttrId = toGuidId('default_linkedin_attribute');
    if (
      !(await getAttribute(dotYouClient, BuiltInProfiles.StandardProfileId, defaultLinkedinAttrId))
    ) {
      const defaultLinkedinAttrFile: AttributeFile = {
        id: defaultLinkedinAttrId,
        type: BuiltInAttributes.LinkedinUsername,
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        profileId: BuiltInProfiles.StandardProfileId,
        priority: 1000,
        sectionId: BuiltInProfiles.ExternalLinksSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaultLinkedinAttrFile);
    }

    // Wallet Section:
    const defaulCreditCardAttrId = toGuidId('default_creditcard_attribute');
    if (!(await getAttribute(dotYouClient, BuiltInProfiles.WalletId, defaulCreditCardAttrId))) {
      const defaulCreditCardAttrFile: AttributeFile = {
        id: defaulCreditCardAttrId,
        type: BuiltInAttributes.CreditCard,
        acl: { requiredSecurityGroup: SecurityGroupType.Owner },
        profileId: BuiltInProfiles.WalletId,
        priority: 1000,
        sectionId: BuiltInProfiles.CreditCardsSectionId,
        data: {},
      };
      await saveAttribute(dotYouClient, defaulCreditCardAttrFile);
    }
  };

  const profileDefinitionInit = async () => {
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

  const blogInit = async () => {
    // Create Public Channel oon the (Default) Public Posts Drive
    const publicDef = await getChannelDefinition(dotYouClient, BlogConfig.PublicChannel.channelId);
    if (!publicDef) {
      await saveChannelDefinition(dotYouClient, BlogConfig.PublicChannel);
    }
  };

  const homeInit = async () => {
    const defaultHomeAttribute: AttributeVm = {
      id: getNewId(),
      profileId: HomePageConfig.DefaultDriveId,
      type: HomePageAttributes.HomePage,
      priority: 1000,
      sectionId: HomePageConfig.AttributeSectionNotApplicable,
      data: { isProtected: true },
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

  const doCleanInit = async (isEmptyInit?: boolean) => {
    if (!isAuthenticated) return;

    // Initialize
    await initialize(dotYouClient, firstRunToken, initDrives);

    if (!isEmptyInit) {
      await profileDefinitionInit();
      await profileDataInit();
      await blogInit();
      // await homeInit(); => Better put in by the demo data wizard..
    }
  };

  const doInitWithData = async (data: WelcomeData) => {
    if (!isAuthenticated) return;

    const initCircles: CircleDefinition[] = data?.circles?.map((circle) => {
      return {
        id: toGuidId(circle.name),
        name: circle.name,
        description: circle.description,
        permissions: {
          keys: [10],
        },
      };
    });

    // Initialize
    await initialize(dotYouClient, firstRunToken, initDrives, initCircles);

    // Ensure Config
    await profileDefinitionInit();
    // await profileDataInit(); => Skip of Profile Data Provider, as more relevant base data will be created by what follows
    await blogInit();
    await homeInit();

    // Save data from welcome wizard:
    // Profile Data:
    const defaultPhotoAttrId = toGuidId('default_photo_attribute');
    const existingPhotoAttr = await getAttribute(
      dotYouClient,
      BuiltInProfiles.StandardProfileId,
      defaultPhotoAttrId
    );

    if (!existingPhotoAttr && data.profile.imageData) {
      const mediaFileId = (
        await uploadImage(
          dotYouClient,
          GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
          anonymousAcl,
          data.profile.imageData.bytes,
          undefined,
          { type: data.profile.imageData?.type as ImageContentType }
        )
      )?.fileId;

      const newPhotoAttr: AttributeFile = {
        id: defaultPhotoAttrId,
        profileId: BuiltInProfiles.StandardProfileId,
        type: BuiltInAttributes.Photo,
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
        acl: anonymousAcl,
      };

      newPhotoAttr.data[MinimalProfileFields.ProfileImageId] = mediaFileId?.toString();

      await saveAttr(newPhotoAttr);
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
        priority: 1000,
        sectionId: BuiltInProfiles.PersonalInfoSectionId,
        data: {},
        acl: anonymousAcl,
      };

      newNameAttr.data[MinimalProfileFields.GivenNameId] = data.profile.givenName;
      newNameAttr.data[MinimalProfileFields.SurnameId] = data.profile.surname;
      newNameAttr.data[
        MinimalProfileFields.DisplayName
      ] = `${data.profile.givenName} ${data.profile.surname}`;

      await saveAttr(newNameAttr);
    }

    if (data.profile.city || data.profile.country) {
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
          priority: 1000,
          sectionId: BuiltInProfiles.PersonalInfoSectionId,
          data: {},
          acl: anonymousAcl,
        };

        newLocationAttr.data[LocationFields.City] = data.profile.city ?? '';
        newLocationAttr.data[LocationFields.Country] = data.profile.country ?? '';

        await saveAttr(newLocationAttr);
      }
    }

    // Social
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
          acl: anonymousAcl,
        };

        socialAttribute.data[dataField] = value;

        await saveAttr(socialAttribute);
      }

      return true;
    };

    if (data.social.facebook) {
      await saveSocial(
        BuiltInAttributes.FacebookUsername,
        SocialFields.Facebook,
        data.social.facebook,
        1000
      );
    }

    if (data.social.instagram) {
      await saveSocial(
        BuiltInAttributes.InstagramUsername,
        SocialFields.Instagram,
        data.social.instagram,
        2000
      );
    }

    if (data.social.tiktok) {
      await saveSocial(
        BuiltInAttributes.TiktokUsername,
        SocialFields.Tiktok,
        data.social.tiktok,
        4000
      );
    }

    if (data.social.twitter) {
      await saveSocial(
        BuiltInAttributes.TwitterUsername,
        SocialFields.Twitter,
        data.social.twitter,
        5000
      );
    }

    if (data.social.linkedin) {
      await saveSocial(
        BuiltInAttributes.LinkedinUsername,
        SocialFields.LinkedIn,
        data.social.linkedin,
        6000
      );
    }

    if (data.social.other) {
      await Promise.all(
        data.social.other.map(async (link, index) => {
          const linkAttribute: AttributeFile = {
            id: getNewId(),
            profileId: BuiltInProfiles.StandardProfileId,
            type: BuiltInAttributes.Link,
            priority: 10000 + index * 1000,
            sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
            data: {},
            acl: anonymousAcl,
          };

          linkAttribute.data[LinkFields.LinkText] = link.text;
          linkAttribute.data[LinkFields.LinkTarget] = link.target;

          return await saveAttr(linkAttribute);
        })
      );
    }
  };

  return {
    init: useMutation(doCleanInit, {
      onError: (ex) => {
        console.error(ex);
      },
      retry: 0,
      onSettled: () => {
        queryClient.invalidateQueries(['initialized']);
      },
    }),
    initWithData: useMutation(doInitWithData, {
      onError: (ex) => {
        console.error(ex);
      },
      retry: 0,
      onSettled: () => {
        queryClient.invalidateQueries(['initialized']);
      },
    }),
  };
};

export default useInit;
