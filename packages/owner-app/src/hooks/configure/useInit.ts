import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WelcomeData } from '../../templates/Setup/Setup';
import { DriveDefinitionParam, initialize } from '../../provider/system/SystemProvider';
import useAuth from '../auth/useAuth';
import { BlogConfig, HomePageConfig } from '@youfoundation/js-lib/public';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { CircleDefinition } from '@youfoundation/js-lib/network';
import {
  SetupBlog,
  SetupDefaultIdentity,
  SetupHome,
  SetupProfileDefinition,
} from '../../provider/setup/SetupProvider';

export const FIRST_RUN_TOKEN_STORAGE_KEY = 'first-run-token';

const useInit = () => {
  const { isAuthenticated } = useAuth();
  const firstRunToken = localStorage.getItem(FIRST_RUN_TOKEN_STORAGE_KEY);

  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const initDrives: DriveDefinitionParam[] = [
    {
      targetDrive: HomePageConfig.HomepageTargetDrive,
      name: 'Homepage Config',
      metadata: '',
      allowAnonymousReads: true,
      ownerOnly: false,
      allowSubscriptions: false,
    },
    {
      targetDrive: BlogConfig.PublicChannelDrive,
      name: 'Public Posts',
      metadata: '',
      allowAnonymousReads: true,
      ownerOnly: false,
      allowSubscriptions: true,
    },
  ];

  const doCleanInit = async () => {
    if (!isAuthenticated) return;

    // Initialize
    await initialize(dotYouClient, firstRunToken, initDrives);

    // Setup Base Definitions
    await SetupProfileDefinition(dotYouClient);
    await SetupBlog(dotYouClient);
    // await SetupHome(dotYouClient); // Better done by DemoData; TODO: Make demoData compatible with existing attributes
  };

  const doInitWithData = async (data: WelcomeData) => {
    if (!isAuthenticated) return;

    const initCircles: CircleDefinition[] = data?.circles?.map((circle) => {
      return {
        id: toGuidId(circle.name),
        name: circle.name,
        description: circle.description,
        permissions: {
          keys: [10],
        },
      };
    });

    // Initialize
    await initialize(dotYouClient, firstRunToken, initDrives, initCircles);

    // Ensure Config
    await SetupProfileDefinition(dotYouClient);
    await SetupBlog(dotYouClient);
    await SetupHome(dotYouClient);

    // Setup Default Identity with data
    await SetupDefaultIdentity(dotYouClient, data);
  };

  return {
    init: useMutation(doCleanInit, {
      onError: (ex) => {
        console.error(ex);
      },
      retry: 0,
      onSettled: () => {
        queryClient.invalidateQueries(['initialized']);
      },
    }),
    initWithData: useMutation(doInitWithData, {
      onError: (ex) => {
        console.error(ex);
      },
      retry: 0,
      onSettled: () => {
        queryClient.invalidateQueries(['initialized']);
      },
    }),
  };
};

export default useInit;
