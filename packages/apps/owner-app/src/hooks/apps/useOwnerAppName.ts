import { isOwnerConsoleApp, t } from '@homebase-id/common-app';
import { useApp } from './useApp';

export { isOwnerConsoleApp };

/**
 * The name to show for the app a drive or circle page sits under. The owner console is not a
 * registered app, so it has no registration to read a name from.
 */
export const useOwnerAppName = (appId?: string) => {
  const isOwnerConsole = isOwnerConsoleApp(appId);
  const { data: app } = useApp({ appId: isOwnerConsole ? undefined : appId }).fetch;
  return isOwnerConsole ? t('Owner console') : app?.name;
};
