import {
  MAIL_APP_ID,
  ExtendPermissionDialog,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';

export const MailHome = () => {
  useRemoveNotifications({ appId: MAIL_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Mail</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Mail')}
        appId={MAIL_APP_ID}
        drives={drives}
        permissions={permissions}
      />
    </>
  );
};
