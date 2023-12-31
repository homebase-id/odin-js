import { useQuery } from '@tanstack/react-query';
import { getAttributes } from '@youfoundation/js-lib/profile';
import { HomePageAttributes, HomePageConfig } from '@youfoundation/js-lib/public';
import { useAuth } from '../auth/useAuth';
import { AttributeVm } from './useAttributes';
import { AttributeDefinitions } from './AttributeDefinitions';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

export const useHomeAttributes = () => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchTheme = async () => {
    const foundThemeAttributes = (
      await getAttributes(
        dotYouClient,
        HomePageConfig.DefaultDriveId,
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
      } as DriveSearchResult<AttributeVm>;
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
