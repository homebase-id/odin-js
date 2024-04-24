import { createPortal } from 'react-dom';
import { AppPermissionType } from '@youfoundation/js-lib/network';
import { useMissingPermissions } from '../../hooks/auth/useMissingPermissions';
import { usePortal } from '../../hooks/portal/usePortal';
import { DialogWrapper } from '../../ui/Dialog/DialogWrapper';
import { t } from '../../helpers';
import { ActionLink, Shield } from '../../ui';

export const ExtendPermissionDialog = ({
  appId,
  appName,
  drives,
  permissions,
  needsAllConnected,
}: {
  appId: string;
  appName: string;
  drives: {
    a: string;
    t: string;
    n: string;
    d: string;
    p: number;
  }[];
  permissions: AppPermissionType[];
  needsAllConnected?: boolean;
}) => {
  const target = usePortal('modal-container');
  const extendPermissionUrl = useMissingPermissions({
    appId,
    drives,
    permissions,
    needsAllConnected,
  });

  if (!extendPermissionUrl) return null;

  const dialog = (
    <DialogWrapper title={t('Missing permissions')} isSidePanel={false}>
      <p>
        {t(
          `The ${appName} app is missing permissions. Without the necessary permissions the functionality of the ${appName} will be limited`
        )}
      </p>
      <div className="flex flex-row-reverse">
        <ActionLink href={extendPermissionUrl} icon={Shield}>
          {t('Extend permissions')}
        </ActionLink>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
