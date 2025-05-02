import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WelcomeData } from '../../templates/Setup/Setup';
import { DriveDefinitionParam, initialize } from '../../provider/system/SystemProvider';
import { toGuidId } from '@homebase-id/js-lib/helpers';
import { CircleDefinition } from '@homebase-id/js-lib/network';
import {
  SetupAutoFollow,
  SetupBlog,
  SetupDefaultIdentity,
  SetupHome,
  SetupProfileDefinition,
} from '../../provider/setup/SetupProvider';
import { useOdinClientContext, useStaticFiles } from '@homebase-id/common-app';
import { getSettings, updateSettings } from '../../provider/system/SettingsProvider';
import { AUTO_FIX_VERSION } from '../useAutoFixDefaultConfig';

export const FIRST_RUN_TOKEN_STORAGE_KEY = 'first-run-token';

export const useInit = () => {
  const firstRunToken = localStorage.getItem(FIRST_RUN_TOKEN_STORAGE_KEY);

  const odinClient = useOdinClientContext();
  const isAuthenticated = odinClient.isAuthenticated();

  const queryClient = useQueryClient();

  const { mutateAsync: publishStaticFiles } = useStaticFiles().publish;

  const initDrives: DriveDefinitionParam[] = [];

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
    await initialize(odinClient, firstRunToken, initDrives, initCircles);

    // Ensure Config
    await SetupProfileDefinition(odinClient);
    await SetupBlog(odinClient);
    await SetupHome(odinClient);

    // Setup (default) Data
    await SetupDefaultIdentity(queryClient, odinClient, data);
    try {
      await SetupAutoFollow(odinClient);
    } catch (ex) {
      console.error('[init] autofollow failed', ex);
    }

    // Do a first publish of the static files
    // This is normally a side effect from the useAttribute hook.. but we need to do it here after the first setup
    await publishStaticFiles(undefined);

    const defaultServerSettings = getSettings(odinClient);

    await updateSettings(odinClient, {
      ...defaultServerSettings,
      lastRunAutoFix: AUTO_FIX_VERSION,
    });
  };

  return {
    initWithData: useMutation({
      mutationFn: doInitWithData,
      onError: (ex) => {
        console.error(ex);
      },
      retry: 0,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['initialized'] });
      },
    }),
  };
};
