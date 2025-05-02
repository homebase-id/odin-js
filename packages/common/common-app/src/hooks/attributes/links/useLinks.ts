import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  Attribute,
  LinkFields,
  getProfileAttributes,
} from '@homebase-id/js-lib/profile';
import { GetFile } from '@homebase-id/js-lib/public';
import { getProfileAttributesOverPeer } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../../auth/useOdinClientContext';

interface LinkData {
  text: string;
  target: string;
  id: string;
  priority: number;
}

export const useLinks = (props?: { odinId: string } | undefined) => {
  const { odinId } = props || {};

  const odinClient = useOdinClientContext();
  const isAuthenticated = !!odinClient.getHostIdentity();
  const queryClient = useQueryClient();

  const fetchData: (odinId?: string) => Promise<LinkData[] | undefined> = async () => {
    const fetchStaticData = async () => {
      if (odinId) return null;

      const fileData = await GetFile(odinClient, 'sitedata.json');
      if (fileData.has('link')) {
        const linkAttributes = (
          fileData
            .get('link')
            ?.map((entry) => {
              const attribute = entry.payload as Attribute;
              if (!attribute.data) return undefined;

              return {
                text: attribute.data[LinkFields.LinkText] as string,
                target: attribute.data[LinkFields.LinkTarget] as string,
                id: attribute.id,
                priority: attribute.priority,
              };
            })
            .filter(Boolean) as LinkData[]
        ).sort((attrA, attrB) => attrB.priority - attrA.priority);

        return linkAttributes;
      }
    };

    const fetchDynamicData = async () => {
      try {
        const linkAttributes = odinId
          ? await getProfileAttributesOverPeer(odinClient, odinId, BuiltInAttributes.Link)
          : await getProfileAttributes(odinClient, BuiltInProfiles.StandardProfileId, undefined, [
            BuiltInAttributes.Link,
          ]);

        return linkAttributes
          ?.map((dsr) => {
            const attr = dsr.fileMetadata.appData.content;

            return {
              text: attr.data?.[LinkFields.LinkText] as string,
              target: attr.data?.[LinkFields.LinkTarget] as string,
              id: attr.id,
              priority: attr.priority,
            };
          })
          .sort((attrA, attrB) => attrA.priority - attrB.priority);
      } catch (e) {
        console.error('failed to fetch dynamic data', e);
      }
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) queryClient.setQueryData(['links', odinId || ''], dynamicData);
      }, 500);
    }

    return returnData;
  };

  return useQuery({
    queryKey: ['links', odinId || ''],
    queryFn: () => fetchData(odinId),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
