import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  Attribute,
  getProfileAttributes,
  getProfileAttribute,
} from '@homebase-id/js-lib/profile';
import { GetFile } from '@homebase-id/js-lib/public';
import { PayloadDescriptor } from '@homebase-id/js-lib/core';
import { getProfileAttributesOverPeer } from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';

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

export const useBiography = (props?: { odinId: string } | undefined) => {
  const { odinId } = props || {};

  const dotYouClient = useDotYouClientContext();
  const isAuthenticated = !!dotYouClient.getIdentity();
  const queryClient = useQueryClient();

  const fetchData: (odinId?: string) => Promise<BiographyData | undefined> = async () => {
    const fetchStaticData = async (): Promise<BiographyData | undefined> => {
      if (odinId) return undefined;

      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (!fileData.has('short-bio') && !fileData.has('long-bio')) return;

      const shortBioAttributes = await (async () => {
        const shortBioEntries = fileData.get('short-bio');
        if (!shortBioEntries) return undefined;
        const allPromise = await Promise.all(
          shortBioEntries.map(async (entry) => {
            let attr: Attribute | undefined = entry.payload as Attribute;
            if (
              !attr &&
              entry.header.fileMetadata.payloads.filter(
                (payload: PayloadDescriptor) => payload.contentType === 'application/json'
              ).length !== 0 &&
              entry.header.fileMetadata.appData.uniqueId
            ) {
              console.warn(entry, 'fetching attribute, not enough data in static file');
              // Fetch attribute if it is not included in the static data
              attr = (
                await getProfileAttribute(
                  dotYouClient,
                  BuiltInProfiles.StandardProfileId,
                  entry.header.fileMetadata.appData.uniqueId
                )
              )?.fileMetadata.appData.content;
            }

            if (!attr) return undefined;
            return {
              body: attr.data?.[MinimalProfileFields.ShortBioId] as string,
              id: attr.id,
              priority: attr.priority,
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
            title: attribute.data?.[MinimalProfileFields.ExperienceTitleId] as string,
            body: attribute.data?.[MinimalProfileFields.ExperienceDecriptionId] as
              | string
              | Record<string, unknown>[],
            link: attribute.data?.[MinimalProfileFields.ExperienceLinkId] as string,
            imageFileKey: attribute.data?.[MinimalProfileFields.ExperienceImageFileKey] as string,
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
          odinId
            ? await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.ShortBio)
            : await getProfileAttributes(
                dotYouClient,
                BuiltInProfiles.StandardProfileId,
                undefined,
                [BuiltInAttributes.ShortBio]
              )
        )?.map((dsr) => {
          const attr = dsr.fileMetadata.appData.content;
          return {
            body: attr.data?.[MinimalProfileFields.ShortBioId] as string,
            id: attr.id,
            priority: attr.priority,
          };
        });

        const longBiographyAttributes = (
          odinId
            ? await getProfileAttributesOverPeer(dotYouClient, odinId, BuiltInAttributes.Experience)
            : await getProfileAttributes(
                dotYouClient,
                BuiltInProfiles.StandardProfileId,
                undefined,
                [BuiltInAttributes.Experience]
              )
        )?.map((dsr) => {
          const attr = dsr.fileMetadata.appData.content;
          return {
            title: attr.data?.[MinimalProfileFields.ExperienceTitleId] as string,
            body: attr.data?.[MinimalProfileFields.ExperienceDecriptionId] as
              | string
              | Record<string, unknown>[],
            link: attr.data?.[MinimalProfileFields.ExperienceLinkId] as string,
            imageFileKey: attr.data?.[MinimalProfileFields.ExperienceImageFileKey] as string,
            lastModified: dsr.fileMetadata.updated,
            imageFileId: dsr.fileId,
            id: attr.id,
            priority: attr.priority,
          };
        });

        return {
          shortBio: shortBiographyAttributes?.[0],
          experience: longBiographyAttributes || [],
        };
      } catch (e) {
        console.error('failed to fetch dynamic data', e);
      }
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) queryClient.setQueryData(['biography', odinId || ''], dynamicData);
      }, 500);
    }

    return returnData;
  };

  return useQuery({
    queryKey: ['biography', odinId || ''],
    queryFn: () => fetchData(odinId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};