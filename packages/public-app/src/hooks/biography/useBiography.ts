import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  Attribute,
  getAttributeVersions,
  getAttribute,
} from '@youfoundation/js-lib/profile';
import { useAuth } from '../auth/useAuth';
import { GetFile } from '@youfoundation/js-lib/public';
import { PayloadDescriptor } from '@youfoundation/js-lib/core';

type ShortBioData = {
  id: string;
  body: string;
  priority: number;
};

type ExperienceData = {
  title: string;
  link?: string;
  imageFileId?: string;
  imageFileKey?: string;
  lastModified: number | undefined;
  body: string | Record<string, unknown>[];
  id: string;
  priority: number;
};

export type BiographyData = {
  shortBio?: ShortBioData;
  experience: ExperienceData[];
};

export const useBiography = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
  const queryClient = useQueryClient();

  const dotYouClient = getDotYouClient();

  const fetchData: () => Promise<BiographyData | undefined> = async () => {
    const fetchStaticData = async (): Promise<BiographyData | undefined> => {
      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (!fileData.has('short-bio') && !fileData.has('long-bio')) return;

      const shortBioAttributes = await (async () => {
        const shortBioEntries = fileData.get('short-bio');
        if (!shortBioEntries) return undefined;
        const allPromise = await Promise.all(
          shortBioEntries.map(async (entry) => {
            let attribute: Attribute | undefined = entry.payload as Attribute;
            if (
              !attribute &&
              entry.header.fileMetadata.payloads.filter(
                (payload: PayloadDescriptor) => payload.contentType === 'application/json'
              ).length !== 0 &&
              entry.header.fileMetadata.appData.uniqueId
            ) {
              console.warn(entry, 'fetching attribute, not enough data in static file');
              // Fetch attribute if it is not included in the static data
              attribute = await getAttribute(
                dotYouClient,
                BuiltInProfiles.StandardProfileId,
                entry.header.fileMetadata.appData.uniqueId
              );
            }

            if (!attribute) return undefined;
            return {
              body: attribute.data[MinimalProfileFields.ShortBioId] as string,
              id: attribute.id,
              priority: attribute.priority,
            };
          })
        );

        return (allPromise.filter(Boolean) as ShortBioData[]).sort(
          (a, b) => a.priority - b.priority
        );
      })();

      const longBioAttributes: ExperienceData[] | undefined = fileData
        .get('long-bio')
        ?.map((entry) => {
          const attribute = entry.payload as Attribute;

          return {
            title: attribute.data[MinimalProfileFields.ExperienceTitleId] as string,
            body: attribute.data[MinimalProfileFields.ExperienceDecriptionId] as
              | string
              | Record<string, unknown>[],
            link: attribute.data[MinimalProfileFields.ExperienceLinkId] as string,
            imageFileKey: attribute.data[MinimalProfileFields.ExperienceImageFileKey] as string,
            lastModified: entry.header.fileMetadata.updated,
            imageFileId: entry.header.fileId,
            id: attribute.id,
            priority: attribute.priority,
          };
        })
        .sort((a, b) => a.priority - b.priority);

      return {
        shortBio: shortBioAttributes?.[0],
        experience: longBioAttributes || [],
      };
    };

    const fetchDynamicData = async (): Promise<BiographyData | undefined> => {
      try {
        const shortBiographyAttributes = (
          await getAttributeVersions(dotYouClient, BuiltInProfiles.StandardProfileId, undefined, [
            BuiltInAttributes.ShortBio,
          ])
        )?.map((attribute) => {
          return {
            body: attribute.data[MinimalProfileFields.ShortBioId] as string,
            id: attribute.id,
            priority: attribute.priority,
          };
        });

        const longBiographyAttributes = (
          await getAttributeVersions(dotYouClient, BuiltInProfiles.StandardProfileId, undefined, [
            BuiltInAttributes.Experience,
          ])
        )?.map((attribute) => {
          return {
            title: attribute.data[MinimalProfileFields.ExperienceTitleId] as string,
            body: attribute.data[MinimalProfileFields.ExperienceDecriptionId] as
              | string
              | Record<string, unknown>[],
            link: attribute.data[MinimalProfileFields.ExperienceLinkId] as string,
            imageFileKey: attribute.data[MinimalProfileFields.ExperienceImageFileKey] as string,
            lastModified: attribute.lastModified,
            imageFileId: attribute.fileId,
            id: attribute.id,
            priority: attribute.priority,
          };
        });

        return {
          shortBio: shortBiographyAttributes?.[0],
          experience: longBiographyAttributes || [],
        };
      } catch (e) {
        console.error('failed to fetch dynamic data');
      }
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) {
          queryClient.setQueryData(['biography'], dynamicData);
        }
      }, 500);
    }

    return returnData;
  };

  return useQuery({
    queryKey: ['biography'],
    queryFn: fetchData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
