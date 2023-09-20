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

const useBiography = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
  const queryClient = useQueryClient();

  const dotYouClient = getDotYouClient();

  const fetchData: () => Promise<
    { title: string; body: string; id: string }[] | undefined
  > = async () => {
    const fetchStaticData = async () => {
      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (fileData.has('bio')) {
        const bioAttributes = fileData
          .get('bio')
          ?.map((entry) => {
            const attribute = entry.payload as Attribute;

            return {
              title: attribute.data[MinimalProfileFields.ShortBioId] as string,
              body: attribute.data[MinimalProfileFields.FullBioId] as string,
              id: attribute.id,
              priority: attribute.priority,
            };
          })
          .sort((a, b) => a.priority - b.priority);

        if (bioAttributes?.length) return bioAttributes;
      }
    };

    const fetchDynamicData = async () => {
      const biographyAttributes = await getAttributeVersions(
        dotYouClient,
        BuiltInProfiles.StandardProfileId,
        BuiltInProfiles.PersonalInfoSectionId,
        [BuiltInAttributes.FullBio]
      );

      return biographyAttributes?.map((attribute) => {
        return {
          title: attribute.data[MinimalProfileFields.ShortBioId] as string,
          body: attribute.data[MinimalProfileFields.FullBioId] as string,
          id: attribute.id,
        };
      });
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
