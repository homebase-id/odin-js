import {useMutation, useQueryClient} from '@tanstack/react-query';

import {WelcomeData} from '../../templates/Setup/Setup';
import {DriveDefinitionParam, enableAutoPasswordRecovery, initialize} from '../../provider/system/SystemProvider';
import {toGuidId} from '@homebase-id/js-lib/helpers';
import {CircleDefinition} from '@homebase-id/js-lib/network';
import {
  SetupAutoFollow,
  SetupBlog,
  SetupDefaultIdentity,
  SetupHome,
  SetupProfileDefinition,
} from '../../provider/setup/SetupProvider';
import {useDotYouClientContext, useStaticFiles} from '@homebase-id/common-app';
import {getSettings, updateSettings} from '../../provider/system/SettingsProvider';
import {AUTO_FIX_VERSION} from '../useAutoFixDefaultConfig';

export const FIRST_RUN_TOKEN_STORAGE_KEY = 'first-run-token';
export const SHOULD_USE_AUTOMATED_PASSWORD_RECOVERY = 'use-auto-pwd-recovery';

export const useInit = () => {
  const firstRunToken = localStorage.getItem(FIRST_RUN_TOKEN_STORAGE_KEY);

  const dotYouClient = useDotYouClientContext();
  const isAuthenticated = dotYouClient.isAuthenticated();

  const queryClient = useQueryClient();

  const {mutateAsync: publishStaticFiles} = useStaticFiles().publish;

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
    await initialize(dotYouClient, firstRunToken, initDrives, initCircles);

    if (data?.enableAutomatedPasswordRecovery === true) {
      try {
        await enableAutoPasswordRecovery(dotYouClient);

      } catch (error) {
        console.error(error);
        // alert(t("This hosting provider does not have auto-password recovery enabled.  You can manually configure " +
        //   "this after you have added connections"));
      }
    }

    // Ensure Config
    await SetupProfileDefinition(dotYouClient);
    await SetupBlog(dotYouClient);
    await SetupHome(dotYouClient);

    // Setup (default) Data
    await SetupDefaultIdentity(queryClient, dotYouClient, data);
    try {
      await SetupAutoFollow(dotYouClient);
    } catch (ex) {
      console.error('[init] autofollow failed', ex);
    }

    // Do a first publish of the static files
    // This is normally a side effect from the useAttribute hook.. but we need to do it here after the first setup
    await publishStaticFiles(undefined);

    const defaultServerSettings = getSettings(dotYouClient);

    await updateSettings(dotYouClient, {
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
        queryClient.invalidateQueries({queryKey: ['initialized']});
      },
    }),
  };
};
