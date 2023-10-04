import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  Attribute,
  getAttributeVersions,
} from '@youfoundation/js-lib/profile';
import useAuth from '../auth/useAuth';
import { GetFile } from '@youfoundation/js-lib/public';

export type BiographyData = {
  shortBio?: {
    id: string;
    body: string;
  };
  experience: {
    title: string;
    link?: string;
    body: string | Record<string, unknown>[];
    id: string;
  }[];
};

const useBiography = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
  const queryClient = useQueryClient();

  const dotYouClient = getDotYouClient();

  const fetchData: () => Promise<BiographyData | undefined> = async () => {
    const fetchStaticData = async (): Promise<BiographyData | undefined> => {
      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (fileData.has('short-bio') || fileData.has('long-bio')) {
        const shortBioAttributes = fileData
          .get('short-bio')
          ?.map((entry) => {
            const attribute = entry.payload as Attribute;

            return {
              body: attribute.data[MinimalProfileFields.ShortBioId] as string,
              id: attribute.id,
              priority: attribute.priority,
            };
          })
          .sort((a, b) => a.priority - b.priority);

        const longBioAttributes = fileData
          .get('long-bio')
          ?.map((entry) => {
            const attribute = entry.payload as Attribute;

            return {
              title: attribute.data[MinimalProfileFields.ExperienceTitleId] as string,
              body: attribute.data[MinimalProfileFields.ExperienceDecriptionId] as
                | string
                | Record<string, unknown>[],
              link: attribute.data[MinimalProfileFields.ExperienceLinkId] as string,
              id: attribute.id,
              priority: attribute.priority,
            };
          })
          .sort((a, b) => a.priority - b.priority);

        return {
          shortBio: shortBioAttributes?.[0],
          experience: longBioAttributes || [],
        };
      }
    };

    const fetchDynamicData = async (): Promise<BiographyData | undefined> => {
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
          BuiltInAttributes.FullBio,
        ])
      )?.map((attribute) => {
        return {
          title: attribute.data[MinimalProfileFields.ExperienceTitleId] as string,
          body: attribute.data[MinimalProfileFields.ExperienceDecriptionId] as
            | string
            | Record<string, unknown>[],
          link: attribute.data[MinimalProfileFields.ExperienceLinkId] as string,
          id: attribute.id,
          priority: attribute.priority,
        };
      });

      return {
        shortBio: shortBiographyAttributes?.[0],
        experience: longBiographyAttributes || [],
      };
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

  return useQuery(['biography'], fetchData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

export default useBiography;
