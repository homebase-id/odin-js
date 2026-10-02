import { OWNER_APP_ID, t } from '@homebase-id/common-app';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useApp } from './useApp';

/** True for the owner console's own id, and for no id at all (an owner drive or circle). */
export const isOwnerConsoleApp = (appId?: string | null) =>
  !appId || stringGuidsEqual(appId, OWNER_APP_ID);

/**
 * The name to show for the app a drive or circle page sits under. The owner console is not a
 * registered app, so it has no registration to read a name from.
 */
export const useOwnerAppName = (appId?: string) => {
  const isOwnerConsole = isOwnerConsoleApp(appId);
  const { data: app } = useApp({ appId: isOwnerConsole ? undefined : appId }).fetch;
  return isOwnerConsole ? t('Owner console') : app?.name;
};
