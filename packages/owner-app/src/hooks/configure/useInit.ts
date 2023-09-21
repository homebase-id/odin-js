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
import { useStaticFiles } from '@youfoundation/common-app';

export const FIRST_RUN_TOKEN_STORAGE_KEY = 'first-run-token';

const useInit = () => {
  const { isAuthenticated } = useAuth();
  const firstRunToken = localStorage.getItem(FIRST_RUN_TOKEN_STORAGE_KEY);

  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const { mutateAsync: publishStaticFiles } = useStaticFiles().publish;

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

    // Setup (default) Data
    await SetupDefaultIdentity(dotYouClient, data);

    // Do a first publish of the static files
    // This is normally a side effect from the useAttribute hook.. TODO: Move to providers instead of the hook
    await publishStaticFiles();
  };

  return {
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
