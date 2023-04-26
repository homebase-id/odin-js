import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  Attribute,
  DotYouClient,
  GetFile,
  getAttributeVersions,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useBiography = () => {
  const { getSharedSecret, getApiType, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const fetchData: () => Promise<
    { title: string; body: string; id: string }[] | undefined
  > = async () => {
    const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

    const fetchStaticData = async () => {
      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (fileData.has('bio')) {
        const bioAttributes = fileData.get('bio')?.map((entry) => {
          const attribute = entry.payload as Attribute;

          return {
            title: attribute.data[MinimalProfileFields.ShortBioId] as string,
            body: attribute.data[MinimalProfileFields.FullBioId] as string,
            id: attribute.id,
          };
        });
        if (bioAttributes?.length) {
          return bioAttributes;
        }
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
