import { useQuery } from '@tanstack/react-query';
import {
  ApiType,
  DotYouClient,
  getAttributes,
  HomePageAttributes,
  HomePageConfig,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import { AttributeVm } from './useAttributes';

const useHomeAttributes = () => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchHome = async () => {
    const foundHomettributes = (
      await getAttributes(
        dotYouClient,
        HomePageConfig.DefaultDriveId,
        [HomePageAttributes.HomePage],
        10
      )
    ).map((attr) => {
      return {
        ...attr,
        typeDefinition: {
          type: HomePageAttributes.HomePage,
          name: 'Homepage',
          description: '',
        },
      } as AttributeVm;
    });
    return foundHomettributes;
  };

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
    fetchHome: useQuery(
      ['attributes', HomePageConfig.DefaultDriveId, HomePageAttributes.HomePage],
      fetchHome,
      { refetchOnMount: false, refetchOnWindowFocus: false, staleTime: Infinity, retry: 1 }
    ),
    fetchTheme: useQuery(
      ['attributes', HomePageConfig.DefaultDriveId, HomePageAttributes.Theme],
      fetchTheme,
      { refetchOnMount: false, refetchOnWindowFocus: false, staleTime: Infinity, retry: 1 }
    ),
  };
};

export default useHomeAttributes;
