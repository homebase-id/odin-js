import { ActionButton, Check, SubtleMessage, t, Toast } from '@youfoundation/common-app';
import { Bell } from '@youfoundation/common-app';
import { useNotifications } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePushNotificationClients,
  usePushNotifications,
} from '../../hooks/notifications/usePushNotifications';
import { useState } from 'react';
import PushNotificationsDialog from '../../components/Dialog/PushNotificationsDialog/PushNotificationsDialog';

const Notifications = () => {
  const { notifications: notificationList } = useNotifications();
  const { isSupported, isEnabled, enableOnThisDevice } = usePushNotifications();
  const { data: current } = usePushNotificationClients().fetchCurrent;
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Bell}
        actions={
          isSupported ? (
            isEnabled && current ? (
              <ActionButton type="secondary" icon={Check} onClick={() => setDialogOpen(true)}>
                {t('Push Notifications Enabled')}
              </ActionButton>
            ) : (
              <ActionButton onClick={enableOnThisDevice}>
                {t('Enable push notifications')}
              </ActionButton>
            )
          ) : null
        }
      />
      {notificationList?.length ? (
        <div className="flex flex-col gap-3 px-2">
          {notificationList.map((notification, index) => (
            <Toast {...notification} key={index} type={undefined} />
          ))}
        </div>
      ) : (
        <SubtleMessage>{t('No notifications')}</SubtleMessage>
      )}
      <PushNotificationsDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

export default Notifications;
