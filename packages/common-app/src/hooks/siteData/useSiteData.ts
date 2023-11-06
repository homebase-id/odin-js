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
  ResponseEntry,
} from '@youfoundation/js-lib/public';
import { EmbeddedThumb, queryBatchCollection } from '@youfoundation/js-lib/core';

interface DefaultTemplateSettings {
  imageFileId: string;
  colors: {
    name: string;
    id: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  favicon: { fileId: string } | { emoji: string } | undefined;
}

export interface ThemeCoverSettings extends DefaultTemplateSettings {
  themeId: '111';
  tagLine?: string;
  leadText?: string;
}

export interface ThemeWithTabsSettings extends DefaultTemplateSettings {
  themeId: '222' | '333';
  tabs?: 'true' | 'false';
  tabsOrder?: string[];
  headerImageKey?: string;
}

export interface ThemeLinksSettings extends DefaultTemplateSettings {
  themeId: '444';
  headerImageKey?: string;
}

export type TemplateSettings =
  | ThemeCoverSettings
  | ThemeLinksSettings
  | ThemeWithTabsSettings
  | undefined;

type OwnerSiteData = {
  displayName?: string;
  firstName?: string;
  surName?: string;
  profileImageFileId?: string;
  profileImageFileKey?: string;
  profileImagePreviewThumbnail?: EmbeddedThumb;
  status?: string;
};

type SocialSiteData = { type: string; username: string; priority: number }[];

type HomeSiteData = {
  templateSettings?: TemplateSettings;
  headerPreviewThumbnail?: EmbeddedThumb;
};

type SiteData = {
  owner: OwnerSiteData;
  social: SocialSiteData;
  home: HomeSiteData;
};

export const useSiteData = () => {
  const { getDotYouClient, getIdentity, isOwner } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const isAuthenticated = !!getIdentity() || isOwner;

  const fetchData: () => Promise<SiteData> = async () => {
    const fileData = await GetFile(dotYouClient, 'sitedata.json');

    const parseOwnerData = async (
      nameAndPhotoAndStatusAttr?: AttributeFile[]
    ): Promise<OwnerSiteData> => {
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
        profileImageFileId: photoAttr?.fileId,
        profileImageFileKey: photoAttr?.data.profileImageKey,
        profileImagePreviewThumbnail: photoAttr?.previewThumbnail,
        status: statusAttr?.data.status,
      };
    };

    const parseSocialData = async (socialAttributes?: AttributeFile[]): Promise<SocialSiteData> => {
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
        .filter((attr) => attr !== undefined) as SocialSiteData;
    };

    const parseHomeData = async (homeAndThemeAttr?: AttributeFile[]): Promise<HomeSiteData> => {
      const themeAttribute = homeAndThemeAttr?.find(
        (attr) => attr.type === HomePageAttributes.Theme
      );

      return {
        templateSettings: {
          ...themeAttribute?.data,
          imageFileId: themeAttribute?.fileId,
        } as TemplateSettings,
        headerPreviewThumbnail: themeAttribute?.previewThumbnail,
      };
    };

    const getFullData = async () => {
      const INCLUDE_METADATA_HEADER = true;
      const ownerDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
      const socialDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
      const homeDrive = HomePageConfig.HomepageTargetDrive;

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
              await dsrToAttributeFile(dotYouClient, dsr, homeDrive, INCLUDE_METADATA_HEADER)
          ) ?? []
      );

      return {
        owner: await parseOwnerData(getHighestPrioAttributesFromMultiTypes(ownerAttr)),
        social: await parseSocialData(
          socialAttr.filter((attr) => attr !== undefined) as AttributeFile[]
        ),
        home: await parseHomeData(getHighestPrioAttributesFromMultiTypes(homeAttr)),
      } as SiteData;
    };

    const staticData = {
      owner: await getOwnerDataStatic(fileData),
      social: await getSocialDataStatic(fileData),
      home: await getHomeDataStatic(fileData),
    };

    if (!staticData.owner || !staticData.social || !staticData.home || isAuthenticated) {
      try {
        return await getFullData();
      } catch (ex) {
        console.error('Fetching sitedata over api failed, fallback to static data', ex);
        return {
          owner: staticData.owner ?? {},
          social: staticData.social ?? [],
          home: staticData.home ?? {},
        } as SiteData;
      }
    }

    return staticData as SiteData;
  };

  return useQuery({
    queryKey: ['siteData'],
    queryFn: fetchData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

const getOwnerDataStatic = (fileData: Map<string, ResponseEntry[]>): OwnerSiteData | undefined => {
  if (fileData.has('name') && fileData.has('photo')) {
    const nameAttr = fileData.get('name')?.[0]?.payload as Attribute;
    const photoAttrHeader = fileData.get('photo')?.[0]?.header;
    const photoAttr = fileData.get('photo')?.[0]?.payload as Attribute;
    const statusAttr = fileData.get('status')?.[0]?.payload as Attribute;

    if (nameAttr && photoAttr) {
      return {
        displayName: nameAttr?.data.displayName,
        firstName: nameAttr?.data.givenName,
        surName: nameAttr?.data.surname,
        profileImageFileId: photoAttrHeader?.fileId,
        profileImageFileKey: photoAttr?.data.profileImageKey,
        profileImagePreviewThumbnail: photoAttr?.previewThumbnail,
        status: statusAttr?.data.status,
      };
    }
  }
};

const getSocialDataStatic = (
  fileData: Map<string, ResponseEntry[]>
): SocialSiteData | undefined => {
  if (fileData.has('socials')) {
    const fileBasedResponse = fileData
      .get('socials')
      ?.sort((a, b) => (a?.payload?.priority ?? 0) - (b?.payload?.priority ?? 0))
      ?.map((entry) => {
        if (!entry.payload?.data) return null;
        const value = Object.values(entry.payload?.data)?.[0];

        return {
          type: Object.keys(entry.payload?.data)?.[0],
          username: typeof value === 'string' ? value : '',
          priority: entry.payload?.priority,
        };
      })
      ?.filter(Boolean) as SocialSiteData | undefined;

    if (fileBasedResponse?.length) return fileBasedResponse;
  }
};

const getHomeDataStatic = (fileData: Map<string, ResponseEntry[]>): HomeSiteData | undefined => {
  // File based response if available
  if (fileData.has('theme')) {
    const entry = fileData.get('theme')?.[0];
    const themeAttribute = entry?.payload as Attribute;
    if (themeAttribute) {
      return {
        templateSettings: {
          ...themeAttribute?.data,
          imageFileId: entry?.header?.fileId,
        } as TemplateSettings,
        headerPreviewThumbnail: themeAttribute?.previewThumbnail,
      };
    }
  }
};
