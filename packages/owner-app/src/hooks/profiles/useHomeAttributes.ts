import { useQuery } from '@tanstack/react-query';
import { getAttributes } from '@youfoundation/js-lib/profile';
import { HomePageAttributes, HomePageConfig } from '@youfoundation/js-lib/public';
import useAuth from '../auth/useAuth';
import { AttributeVm } from './useAttributes';

const useHomeAttributes = () => {
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
        typeDefinition: {
          type: HomePageAttributes.Theme,
          name: 'Theme',
          description: '',
        },
      } as AttributeVm;
    });
    return foundThemeAttributes;
  };

  return {
    fetchTheme: useQuery(
      ['attributes', HomePageConfig.DefaultDriveId, HomePageAttributes.Theme],
      fetchTheme,
      { refetchOnMount: false, refetchOnWindowFocus: false, staleTime: Infinity, retry: 1 }
    ),
  };
};

export default useHomeAttributes;
