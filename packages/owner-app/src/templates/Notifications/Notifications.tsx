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
import { useApp } from '../../hooks/apps/useApp';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

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

const OWNER_APP_ID = 'ac126e09-54cb-4878-a690-856be692da16';
const dateTimeFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  // weekday: 'short',
  // year: yearsAgo !== 0 ? 'numeric' : undefined,
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

const NotificationItem = ({ notification }: { notification: PushNotification }) => {
  const { data: app } = useApp({ appId: notification.options.appId }).fetch;
  const appName =
    app?.name ??
    (stringGuidsEqual(notification.options.appId, OWNER_APP_ID) ? 'Homebase' : 'Unknown');

  return (
    <Toast
      title={`[${appName}] A notification from ${notification.senderId}`}
      body={`${new Date(notification.created).toLocaleDateString(undefined, dateTimeFormat)}`}
    />
  );
};

export default Notifications;
