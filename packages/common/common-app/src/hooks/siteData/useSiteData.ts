import { QueryClient, useQuery } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  Attribute,
  AttributeConfig,
  homebaseFileToProfileAttribute,
  GetTargetDriveFromProfileId,
} from '@homebase-id/js-lib/profile';
import {
  GetFile,
  HomePageAttributes,
  HomePageConfig,
  ResponseEntry,
} from '@homebase-id/js-lib/public';
import { HomebaseFile, EmbeddedThumb, queryBatchCollection } from '@homebase-id/js-lib/core';
import { getHighestPrioAttributesFromMultiTypes } from '../../helpers/common';
import { useOdinClientContext } from '../auth/useOdinClientContext';

interface DefaultTemplateSettings {
  imageFileId: string;
  imageLastModified: number;
  colors: {
    name: string;
    id: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  favicon: { fileKey: string } | { emoji: string } | undefined;
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
export interface ThemeDisabledSettings extends DefaultTemplateSettings {
  themeId: '0';
}

export type TemplateSettings =
  | ThemeCoverSettings
  | ThemeLinksSettings
  | ThemeWithTabsSettings
  | ThemeDisabledSettings
  | undefined;

type OwnerSiteData = {
  displayName?: string;
  firstName?: string;
  surName?: string;
  profileImageFileId?: string;
  profileImageFileKey?: string;
  profileImagePreviewThumbnail?: EmbeddedThumb;
  profileImageLastModified?: number;
  status?: string;
};

type HomeSiteData = {
  templateSettings?: TemplateSettings;
  headerPreviewThumbnail?: EmbeddedThumb;
};

type SiteData = {
  owner: OwnerSiteData;
  home: HomeSiteData;
};

export const useSiteData = () => {
  const odinClient = useOdinClientContext();
  const isAuthenticated = odinClient.isAuthenticated();

  const fetchData: () => Promise<SiteData> = async () => {
    const fileData = await GetFile(odinClient, 'sitedata.json');

    const parseOwnerData = async (
      nameAndPhotoAndStatusAttr?: HomebaseFile<Attribute>[]
    ): Promise<OwnerSiteData> => {
      const nameDsr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.fileMetadata.appData.content.type === BuiltInAttributes.Name
      );
      const nameAttr = nameDsr?.fileMetadata.appData.content;

      const photoDsr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.fileMetadata.appData.content.type === BuiltInAttributes.Photo
      );
      const photoAttr = photoDsr?.fileMetadata.appData.content;

      const statusDsr = nameAndPhotoAndStatusAttr?.find(
        (attr) => attr.fileMetadata.appData.content.type === BuiltInAttributes.Status
      );
      const statusAttr = statusDsr?.fileMetadata.appData.content;

      return {
        displayName: nameAttr?.data?.displayName ?? window.location.hostname,
        firstName: nameAttr?.data?.givenName,
        surName: nameAttr?.data?.surname,
        profileImageFileId: photoDsr?.fileId,
        profileImageFileKey: photoAttr?.data?.profileImageKey,
        profileImagePreviewThumbnail: photoDsr?.fileMetadata?.appData?.previewThumbnail,
        profileImageLastModified: photoDsr?.fileMetadata.updated,
        status: statusAttr?.data?.status,
      };
    };

    const parseHomeData = async (
      homeAndThemeAttr?: HomebaseFile<Attribute>[]
    ): Promise<HomeSiteData> => {
      const themeAttribute = homeAndThemeAttr?.find(
        (attr) => attr.fileMetadata.appData.content.type === HomePageAttributes.Theme
      );

      return {
        templateSettings: {
          ...themeAttribute?.fileMetadata.appData.content?.data,
          imageFileId: themeAttribute?.fileId,
          imageLastModified: themeAttribute?.fileMetadata.updated,
        } as TemplateSettings,
        headerPreviewThumbnail: themeAttribute?.fileMetadata.appData.previewThumbnail,
      };
    };

    const getFullData = async () => {
      const INCLUDE_METADATA_HEADER = true;
      const ownerDrive = GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId);
      const homeDrive = HomePageConfig.HomepageTargetDrive;

      /// Query batch collection to improve performance instead of higher level `AttributeDataProvider.getProfileAttributes`
      const collectionResult = await queryBatchCollection(odinClient, [
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
              await homebaseFileToProfileAttribute(
                odinClient,
                dsr,
                ownerDrive,
                INCLUDE_METADATA_HEADER
              )
          ) ?? []
      );
      const homeAttr = await Promise.all(
        resultMap
          .get('home')
          ?.map(
            async (dsr) =>
              await homebaseFileToProfileAttribute(
                odinClient,
                dsr,
                homeDrive,
                INCLUDE_METADATA_HEADER
              )
          ) ?? []
      );

      return {
        owner: await parseOwnerData(getHighestPrioAttributesFromMultiTypes(ownerAttr)),
        home: await parseHomeData(getHighestPrioAttributesFromMultiTypes(homeAttr)),
      } as SiteData;
    };

    const staticData = {
      owner: await getOwnerDataStatic(fileData),
      home: await getHomeDataStatic(fileData),
    };

    if (!staticData.owner || !staticData.home || isAuthenticated) {
      try {
        return await getFullData();
      } catch (ex) {
        console.error('Fetching sitedata over api failed, fallback to static data', ex);
        return {
          owner: staticData.owner ?? {},
          home: staticData.home ?? {},
        } as SiteData;
      }
    }

    return staticData as SiteData;
  };

  return useQuery({
    queryKey: ['site-data'],
    queryFn: fetchData,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const invalidateSiteData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['site-data'] });
};

const getOwnerDataStatic = (fileData: Map<string, ResponseEntry[]>): OwnerSiteData | undefined => {
  if (fileData.has('name') && fileData.has('photo')) {
    const nameAttr = fileData.get('name')?.[0]?.payload as Attribute;
    const photoAttrHeader = fileData.get('photo')?.[0]?.header;
    const photoAttr = fileData.get('photo')?.[0]?.payload as Attribute;
    const statusAttr = fileData.get('status')?.[0]?.payload as Attribute;

    if (nameAttr && photoAttr) {
      return {
        displayName: nameAttr?.data?.displayName,
        firstName: nameAttr?.data?.givenName,
        surName: nameAttr?.data?.surname,
        profileImageFileId: photoAttrHeader?.fileId,
        profileImageFileKey: photoAttr?.data?.profileImageKey,
        profileImagePreviewThumbnail: photoAttrHeader?.fileMetadata.appData.previewThumbnail,
        profileImageLastModified: photoAttrHeader?.fileMetadata.updated,
        status: statusAttr?.data?.status,
      };
    }
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
          imageLastModified: entry?.header?.fileMetadata.updated,
        } as TemplateSettings,
        headerPreviewThumbnail: entry?.header?.fileMetadata.appData.previewThumbnail,
      };
    }
  }
};
