import { ActionButton, Bubble, Cog, SubtleMessage, t, Toast } from '@youfoundation/common-app';
import { Bell } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePushNotificationClient,
  usePushNotificationClients,
  usePushNotifications,
} from '../../hooks/notifications/usePushNotifications';
import { useState } from 'react';
import PushNotificationsDialog from '../../components/Dialog/PushNotificationsDialog/PushNotificationsDialog';
import { PushNotification } from '../../provider/notifications/PushNotificationsProvider';

const Notifications = () => {
  // const { notifications: notificationList } = useNotifications();
  const { data: notifications } = usePushNotifications().fetch;
  const { isSupported, isEnabled, enableOnThisDevice } = usePushNotificationClient();
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
              <ActionButton type="secondary" icon={Cog} onClick={() => setDialogOpen(true)}>
                {t('Push Settings')}
              </ActionButton>
            ) : (
              <ActionButton onClick={enableOnThisDevice} icon={Bubble}>
                {t('Enable push notifications')}
              </ActionButton>
            )
          ) : null
        }
      />
      {notifications?.results?.length ? (
        <div className="flex flex-col gap-3 px-2">
          {notifications?.results.map((notification, index) => (
            <NotificationItem notification={notification} key={index} />
          ))}
        </div>
      ) : (
        <SubtleMessage>{t('No notifications')}</SubtleMessage>
      )}
      <PushNotificationsDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

const NotificationItem = ({ notification }: { notification: PushNotification }) => {
  return (
    <Toast
      title={`A notification from ${notification.senderId}`}
      body={`${notification.created}`}
    />
  );
};

export default Notifications;
