import { ActionButton, Bubble, Cog, SubtleMessage, t, Toast } from '@youfoundation/common-app';
import { Bell } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import {
  usePushNotificationClient,
  usePushNotificationClients,
  usePushNotifications,
} from '../../hooks/notifications/usePushNotifications';
import { useEffect, useState } from 'react';
import PushNotificationsDialog from '../../components/Dialog/PushNotificationsDialog/PushNotificationsDialog';
import { PushNotification } from '../../provider/notifications/PushNotificationsProvider';
import { useApp } from '../../hooks/apps/useApp';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

interface NotificationClickData {
  notification: string;
}

const OWNER_APP_ID = 'ac126e09-54cb-4878-a690-856be692da16';
const CHAT_APP_ID = '2d781401-3804-4b57-b4aa-d8e4e2ef39f4';

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';

const titleFormer = (payload: PushNotification, appName: string) => `${appName}`;

const bodyFormer = (payload: PushNotification, hasMultiple: boolean, appName: string) => {
  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${payload.senderId} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${payload.senderId} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${payload.senderId} accepted your connection request`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `${payload.senderId} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  }

  return `${payload.senderId} sent you a notification via ${appName}`;
};

const Notifications = () => {
  // const { notifications: notificationList } = useNotifications();
  const { data: notifications } = usePushNotifications().fetch;
  const { isSupported, isEnabled, enableOnThisDevice } = usePushNotificationClient();
  const { data: current } = usePushNotificationClients().fetchCurrent;
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const handleEvent = (event: MessageEvent<NotificationClickData>) => {
      console.log('incoming message', event?.data.notification);
    };

    navigator.serviceWorker.addEventListener('message', handleEvent);
    return () => navigator.serviceWorker.removeEventListener('message', handleEvent);
  }, []);

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
  // const { mutate: markAsRead } = usePushNotifications().markAsRead;
  const { mutate: remove } = usePushNotifications().remove;
  const { data: app } = useApp({ appId: notification.options.appId }).fetch;
  const appName =
    app?.name ??
    (stringGuidsEqual(notification.options.appId, OWNER_APP_ID) ? 'Homebase' : 'Unknown');

  return (
    <Toast
      title={titleFormer(notification, appName)}
      body={bodyFormer(notification, false, appName)}
      timestamp={notification.created}
      onDismiss={() => remove([notification.id])}
    />
  );
};

export default Notifications;
