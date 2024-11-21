import { useQuery } from '@tanstack/react-query';
import { getProfileAttributes } from '@homebase-id/js-lib/profile';
import { HomePageAttributes, HomePageConfig } from '@homebase-id/js-lib/public';
import { AttributeVm } from './useAttributes';
import { AttributeDefinitions } from './AttributeDefinitions';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useHomeAttributes = () => {
  const dotYouClient = useDotYouClientContext();

  const fetchTheme = async () => {
    const foundThemeAttributes = (
      await getProfileAttributes(
        dotYouClient,
        HomePageConfig.DefaultDriveId,
        undefined,
        [HomePageAttributes.Theme],
        10
      )
    ).map((attr) => {
      return {
        ...attr,
        fileMetadata: {
          ...attr.fileMetadata,
          appData: {
            ...attr.fileMetadata.appData,
            content: {
              ...attr.fileMetadata.appData.content,
              typeDefinition: Object.values(AttributeDefinitions).find((def) => {
                return def.type === attr.fileMetadata.appData.content?.type;
              }),
            },
          },
        },
      } as HomebaseFile<AttributeVm>;
    });
    return foundThemeAttributes;
  };

  return {
    fetchTheme: useQuery({
      queryKey: ['attributes', HomePageConfig.DefaultDriveId, HomePageAttributes.Theme],
      queryFn: fetchTheme,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: 1,
    }),
  };
};
