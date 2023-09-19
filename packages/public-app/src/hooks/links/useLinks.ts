import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  Attribute,
  LinkFields,
  getAttributeVersions,
} from '@youfoundation/js-lib/profile';
import useAuth from '../auth/useAuth';
import { GetFile } from '@youfoundation/js-lib/public';

const useLinks = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
  const queryClient = useQueryClient();
  const dotYouClient = getDotYouClient();

  const fetchData: () => Promise<
    { text: string; target: string; id: string; priority: number }[] | undefined
  > = async () => {
    const fetchStaticData = async () => {
      const fileData = await GetFile(dotYouClient, 'sitedata.json');
      if (fileData.has('link')) {
        const linkAttributes = fileData
          .get('link')
          ?.sort((attrA, attrB) => attrB.payload.priority - attrA.payload.priority)
          .map((entry) => {
            const attribute = entry.payload as Attribute;

            return {
              text: attribute.data[LinkFields.LinkText] as string,
              target: attribute.data[LinkFields.LinkTarget] as string,
              id: attribute.id,
              priority: attribute.priority,
            };
          });

        return linkAttributes;
      }
    };

    const fetchDynamicData = async () => {
      const linkAttributes = await getAttributeVersions(
        dotYouClient,
        BuiltInProfiles.StandardProfileId,
        undefined,
        [BuiltInAttributes.Link]
      );

      return linkAttributes
        ?.sort((attrA, attrB) => attrA.priority - attrB.priority)
        .map((attribute) => {
          return {
            text: attribute.data[LinkFields.LinkText] as string,
            target: attribute.data[LinkFields.LinkTarget] as string,
            id: attribute.id,
            priority: attribute.priority,
          };
        });
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) {
          queryClient.setQueryData(['links'], dynamicData);
        }
      }, 500);
    }

    return returnData;
  };

  return useQuery(['links'], fetchData, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

export default useLinks;
