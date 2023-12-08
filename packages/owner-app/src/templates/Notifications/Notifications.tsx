import {
  ActionButton,
  Bubble,
  Cog,
  ErrorNotification,
  SubtleMessage,
  t,
  Toast,
} from '@youfoundation/common-app';
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

const titleFormer = (appName: string) => `${appName}`;

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

const getTargetLink = (payload: PushNotification) => {
  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (
      [
        OWNER_FOLLOWER_TYPE_ID,
        OWNER_CONNECTION_REQUEST_TYPE_ID,
        OWNER_CONNECTION_ACCEPTED_TYPE_ID,
      ].includes(payload.options.typeId)
    ) {
      return `/owner/connections/${payload.senderId}`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `/apps/chat/${payload.options.typeId}`;
  }
};

const Notifications = () => {
  // const { notifications: notificationList } = useNotifications();
  const { data: notifications } = usePushNotifications().fetch;
  const { isSupported, isEnabled } = usePushNotificationClient();
  const {
    mutate: enable,
    status: enableStatus,
    error: enableError,
  } = usePushNotificationClient().enableOnThisDevice;
  const { data: current } = usePushNotificationClients().fetchCurrent;
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const handleEvent = (event: MessageEvent<NotificationClickData>) => {
      console.log('incoming message', event?.data.notification);
    };

    navigator.serviceWorker.addEventListener('message', handleEvent);
    return () => navigator.serviceWorker.removeEventListener('message', handleEvent);
  }, []);

  const groupedNotifications =
    notifications?.results.reduce(
      (acc, notification) => {
        if (acc[notification.options.appId]) acc[notification.options.appId].push(notification);
        else acc[notification.options.appId] = [notification];

        return acc;
      },
      {} as { [key: string]: PushNotification[] }
    ) || {};

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Bell}
        actions={
          <>
            {isSupported ? (
              (isEnabled && current) || enableStatus === 'success' ? null : (
                <ActionButton onClick={() => enable()} icon={Bubble} state={enableStatus}>
                  {t('Enable push')}
                </ActionButton>
              )
            ) : null}
            <ActionButton type="secondary" icon={Cog} onClick={() => setDialogOpen(true)}>
              {t('Settings')}
            </ActionButton>
          </>
        }
      />
      <ErrorNotification error={enableError} />
      {notifications?.results?.length ? (
        <div className="flex flex-col gap-3 px-2">
          {Object.keys(groupedNotifications).map((appId) => (
            <NotificationGroup
              appId={appId}
              notifications={groupedNotifications[appId]}
              key={appId}
            />
          ))}
        </div>
      ) : (
        <SubtleMessage>{t('No notifications')}</SubtleMessage>
      )}
      <PushNotificationsDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

const NotificationGroup = ({
  appId,
  notifications,
}: {
  appId: string;
  notifications: PushNotification[];
}) => {
  const { data: app } = useApp({ appId: appId }).fetch;
  const appName = app?.name ?? (stringGuidsEqual(appId, OWNER_APP_ID) ? 'Homebase' : 'Unknown');

  const { mutate: remove } = usePushNotifications().remove;

  const groupedByTypeNotifications =
    notifications.reduce(
      (acc, notification) => {
        if (acc[notification.options.typeId]) acc[notification.options.typeId].push(notification);
        else acc[notification.options.typeId] = [notification];

        return acc;
      },
      {} as { [key: string]: PushNotification[] }
    ) || {};

  return (
    <>
      {Object.keys(groupedByTypeNotifications).map((typeId) => {
        const typeGroup = groupedByTypeNotifications[typeId];
        const groupCount = typeGroup.length - 1;
        const sliced = typeGroup.slice(0, 3);

        return (
          <div
            key={typeId}
            className="relative"
            style={{
              paddingBottom: `${sliced.length * 0.5}rem`,
            }}
          >
            {sliced.map((notification, index) => (
              <div
                key={notification.id}
                className={index === 0 ? 'relative z-10' : 'absolute w-full'}
                style={
                  index === 0
                    ? undefined
                    : {
                        top: `${index * 0.5}rem`,
                        bottom: `${index * -0.5}rem`,
                        left: `${index * 0.25}rem`,
                        zIndex: 5 - index,
                        opacity: 1 - 0.3 * index,
                      }
                }
              >
                <Toast
                  title={titleFormer(appName)}
                  body={bodyFormer(notification, false, appName)}
                  timestamp={notification.created}
                  onDismiss={() => remove(typeGroup.map((n) => n.id))}
                  href={getTargetLink(notification)}
                  groupCount={groupCount}
                />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
};

export default Notifications;
