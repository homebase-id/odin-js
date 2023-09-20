import { useQuery } from '@tanstack/react-query';
import { getHighestPrioAttributesFromMultiTypes, useDotYouClient } from '@youfoundation/common-app';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  Attribute,
  AttributeConfig,
  AttributeFile,
  dsrToAttributeFile,
  GetTargetDriveFromProfileId,
} from '@youfoundation/js-lib/profile';
import {
  GetFile,
  HomePageAttributes,
  HomePageConfig,
  HomePageFields,
  HomePageThemeFields,
  ResponseEntry,
} from '@youfoundation/js-lib/public';
import { queryBatchCollection } from '@youfoundation/js-lib/core';

type SocialInfo = { type: string; username: string; priority: number };

type SiteData = {
  owner: {
    displayName?: string;
    firstName?: string;
    surName?: string;
    profileImageId?: string;
    status?: string;
  };
  social: { type: string; username: string; priority: number }[];
  home: {
    template?: string;
    templateSettings?: unknown;
    tagLine?: string;
    leadText?: string;
    headerImageFileId?: string;
  };
};

export const useSiteData = () => {
  const { getDotYouClient, getIdentity, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const isAuthenticated = !!getIdentity() || isOwner;

  const fetchData: () => Promise<SiteData> = async () => {
    const fileData = await GetFile(dotYouClient, 'sitedata.json');

    const parseOwnerData = async (nameAndPhotoAndStatusAttr?: AttributeFile[]) => {
      const nameAttr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.type === BuiltInAttributes.Name
      );
      const photoAttr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.type === BuiltInAttributes.Photo
      );
      const statusAttr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.type === BuiltInAttributes.Status
      );

      return {
        displayName: nameAttr?.data.displayName ?? window.location.hostname,
        firstName: nameAttr?.data.givenName,
        surName: nameAttr?.data.surname,
        profileImageId: photoAttr?.data.profileImageId,
        status: statusAttr?.data.status,
      };
    };

    const parseSocialData = async (socialAttributeVersions?: AttributeFile[]) => {
      const socialAttributes = getHighestPrioAttributesFromMultiTypes(socialAttributeVersions);

      return socialAttributes
        ?.map((attr) => {
          const value = Object.values(attr?.data)?.[0];

          return {
            type: Object.keys(attr?.data)?.[0],
            username: typeof value === 'string' ? value : '',
            priority: attr?.priority,
          };
        })
        .sort((attrA, attrB) => attrA.priority - attrB.priority)
        .filter((attr) => attr !== undefined) as SocialInfo[];
    };

    const parseHomeData = async (homeAndThemeAttr?: AttributeFile[]) => {
      const themeAttribute = homeAndThemeAttr?.find(
        (attr) => attr.type === HomePageAttributes.Theme
      );

      // Page Config
      const tagLine = themeAttribute?.data[HomePageFields.TagLineId];
      const leadText = themeAttribute?.data[HomePageFields.LeadTextId];
      const headerImageFileId = themeAttribute?.data[HomePageFields.HeaderImageId];

      const homePageTheme = themeAttribute?.data[HomePageThemeFields.ThemeId];

      return {
        template: homePageTheme,
        templateSettings: themeAttribute?.data,
        tagLine: tagLine,
        leadText: leadText,
        headerImageFileId: headerImageFileId,
      };
    };

    const getFullData = async () => {
      const INCLUDE_METADATA_HEADER = true;
      const ownerDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
      const socialDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
      const homeDrive = GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId);

      /// Query batch collection to improve performance instead of higher level `AttributeDataProvider.getAttributeVersions`
      const collectionResult = await queryBatchCollection(dotYouClient, [
        {
          name: 'owner',
          queryParams: {
            targetDrive: ownerDrive,
            fileType: [AttributeConfig.AttributeFileType],
            groupId: [BuiltInProfiles.PersonalInfoSectionId],
            tagsMatchAtLeastOne: [
              BuiltInAttributes.Name,
              BuiltInAttributes.Photo,
              BuiltInAttributes.Status,
            ],
          },
          resultOptions: {
            includeMetadataHeader: INCLUDE_METADATA_HEADER,
            maxRecords: 10,
          },
        },
        {
          name: 'social',
          queryParams: {
            targetDrive: socialDrive,
            fileType: [AttributeConfig.AttributeFileType],
            tagsMatchAtLeastOne: [...BuiltInAttributes.AllSocial, ...BuiltInAttributes.AllGames],
          },
          resultOptions: {
            includeMetadataHeader: INCLUDE_METADATA_HEADER,
            maxRecords: 10,
          },
        },
        {
          name: 'home',
          queryParams: {
            targetDrive: homeDrive,
            fileType: [AttributeConfig.AttributeFileType],
            tagsMatchAtLeastOne: [HomePageAttributes.Theme],
          },
          resultOptions: {
            includeMetadataHeader: INCLUDE_METADATA_HEADER,
            maxRecords: 10,
          },
        },
      ]);

      const resultMap = new Map(
        collectionResult.results.map((result) => {
          return [result.name, result.searchResults];
        })
      );

      const ownerAttr = await Promise.all(
        resultMap
          .get('owner')
          ?.map(
            async (dsr) =>
              await dsrToAttributeFile(dotYouClient, dsr, ownerDrive, INCLUDE_METADATA_HEADER)
          ) ?? []
      );
      const socialAttr = await Promise.all(
        resultMap
          .get('social')
          ?.map(
            async (dsr) =>
              await dsrToAttributeFile(dotYouClient, dsr, ownerDrive, INCLUDE_METADATA_HEADER)
          ) ?? []
      );
      const homeAttr = await Promise.all(
        resultMap
          .get('home')
          ?.map(
            async (dsr) =>
              await dsrToAttributeFile(dotYouClient, dsr, ownerDrive, INCLUDE_METADATA_HEADER)
          ) ?? []
      );

      return {
        owner: await parseOwnerData(getHighestPrioAttributesFromMultiTypes(ownerAttr)),
        social: await parseSocialData(getHighestPrioAttributesFromMultiTypes(socialAttr)),
        home: await parseHomeData(getHighestPrioAttributesFromMultiTypes(homeAttr)),
      } as SiteData;
    };

    const staticData = {
      owner: (await getOwnerDataStatic(fileData)) ?? {},
      social: (await getSocialDataStatic(fileData)) ?? [],
      home: (await getHomeDataStatic(fileData)) ?? {},
    };

    if (!staticData.owner || !staticData.social || !staticData.home || isAuthenticated) {
      try {
        return await getFullData();
      } catch (ex) {
        console.error('Fetching sitedata over api failed, fallback to static data', ex);
        return staticData;
      }
    }

    return staticData;
  };

  return useQuery(['siteData'], fetchData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    onError: (er) => {
      console.error(er);
    },
  });
};

const getOwnerDataStatic = (fileData: Map<string, ResponseEntry[]>) => {
  if (fileData.has('name') && fileData.has('photo')) {
    const nameAttr = fileData.get('name')?.[0]?.payload as Attribute;
    const photoAttr = fileData.get('photo')?.[0]?.payload as Attribute;
    const statusAttr = fileData.get('status')?.[0]?.payload as Attribute;

    if (nameAttr && photoAttr) {
      return {
        displayName: nameAttr?.data.displayName,
        firstName: nameAttr?.data.givenName,
        surName: nameAttr?.data.surname,
        profileImageId: photoAttr?.data.profileImageId,
        status: statusAttr?.data.status,
      };
    }
  }
};

const getSocialDataStatic = (fileData: Map<string, ResponseEntry[]>) => {
  if (fileData.has('socials')) {
    const fileBasedResponse = fileData
      .get('socials')
      ?.sort((a, b) => (a?.payload.priority ?? 0) - (b?.payload.priority ?? 0))
      ?.map((entry) => {
        const value = Object.values(entry.payload.data)?.[0];

        return {
          type: Object.keys(entry.payload.data)?.[0],
          username: typeof value === 'string' ? value : '',
          priority: entry.payload.priority,
        };
      });

    if (fileBasedResponse?.length) {
      return fileBasedResponse;
    }
  }
};

const getHomeDataStatic = (fileData: Map<string, ResponseEntry[]>) => {
  // File based response if available
  if (fileData.has('theme')) {
    const themeAttribute = fileData.get('theme')?.[0]?.payload as Attribute;

    if (themeAttribute) {
      const tagLine = themeAttribute?.data[HomePageFields.TagLineId];
      const leadText = themeAttribute?.data[HomePageFields.LeadTextId];
      const headerImageFileId = themeAttribute?.data[HomePageFields.HeaderImageId];

      const homePageTheme = themeAttribute?.data[HomePageThemeFields.ThemeId];

      return {
        template: homePageTheme,
        templateSettings: themeAttribute?.data,
        tagLine: tagLine,
        leadText: leadText,
        headerImageFileId: headerImageFileId,
      };
    }
  }
};
