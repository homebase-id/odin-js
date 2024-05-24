import {
  ActionButton,
  Cog,
  ellipsisAtMaxChar,
  SubtleMessage,
  t,
  Toast,
  formatToTimeAgoWithRelativeDetail,
  usePushNotifications,
  CHAT_APP_ID,
  FEED_APP_ID,
  OWNER_APP_ID,
  useDotYouClient,
  MAIL_APP_ID,
  ErrorNotification,
  Times,
} from '@youfoundation/common-app';
import { Bell } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { useEffect, useMemo, useState } from 'react';
import PushNotificationsDialog from '../../components/Dialog/PushNotificationsDialog/PushNotificationsDialog';
import { useApp } from '../../hooks/apps/useApp';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useSearchParams } from 'react-router-dom';
import { useContact } from '../../hooks/contacts/useContact';
import { PushNotification } from '@youfoundation/js-lib/core';

interface NotificationClickData {
  notification: string;
}

const Notifications = () => {
  const [params] = useSearchParams();
  const { data: notifications, isFetching: fetchingNotifications } = usePushNotifications().fetch;

  const [isDialogOpen, setDialogOpen] = useState(false);

  const [toOpenNotification, setToOpenNotification] = useState<string | undefined>(
    params.get('notification') || undefined
  );

  const doOpenNotification = (targetTagId: string) => {
    const activeNotification = notifications?.results.find((notification) =>
      stringGuidsEqual(notification.options.tagId, targetTagId)
    );

    if (!activeNotification) return;

    const targetLink = getTargetLink(activeNotification);
    if (targetLink) window.location.href = targetLink;
  };

  useEffect(() => {
    if (toOpenNotification && !fetchingNotifications) doOpenNotification(toOpenNotification);
  }, [fetchingNotifications, toOpenNotification]);

  // Listen for messages from the service worker to open the notification
  useEffect(() => {
    const handleEvent = (event: MessageEvent<NotificationClickData>) => {
      const activeTagId = event?.data.notification;
      setToOpenNotification(activeTagId);
    };

    navigator.serviceWorker.addEventListener('message', handleEvent);
    return () => navigator.serviceWorker.removeEventListener('message', handleEvent);
  }, []);

  const groupedNotificationsPerDay = useMemo(
    () =>
      notifications?.results.reduce(
        (acc, notification) => {
          const date = new Date(notification.created).toDateString();

          if (acc[date]) acc[date].push(notification);
          else acc[date] = [notification];

          return acc;
        },
        {} as { [key: string]: PushNotification[] }
      ) || {},
    [notifications]
  );

  const {
    mutate: remove,
    status: removeStatus,
    error: removeError,
  } = usePushNotifications().remove;
  const doClearAll = () => {
    remove(notifications?.results.map((n) => n.id) || []);
  };

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Bell}
        actions={
          <>
            {notifications?.results?.length ? (
              <ActionButton
                type="primary"
                icon={Times}
                onClick={doClearAll}
                state={removeStatus !== 'success' ? removeStatus : undefined}
              >
                {t('Clear all')}
              </ActionButton>
            ) : null}
            <ActionButton type="secondary" icon={Cog} onClick={() => setDialogOpen(true)}>
              {t('Notifications')}
            </ActionButton>
          </>
        }
      />
      {notifications?.results?.length ? (
        <>
          <div className="flex flex-col gap-3 px-2">
            {Object.keys(groupedNotificationsPerDay).map((day) => (
              <NotificationDay
                day={new Date(day)}
                notifications={groupedNotificationsPerDay[day]}
                key={day}
              />
            ))}
          </div>
          <ErrorNotification error={removeError} />
          <div className="mx-2 mt-5 flex max-w-sm flex-row-reverse">
            <ActionButton
              type="mute"
              size="none"
              onClick={doClearAll}
              state={removeStatus !== 'success' ? removeStatus : undefined}
              className="opacity-50 hover:opacity-100"
            >
              {t('Clear all')}
            </ActionButton>
          </div>
        </>
      ) : (
        <SubtleMessage>{t('No notifications')}</SubtleMessage>
      )}
      <PushNotificationsDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

const NotificationDay = ({
  day,
  notifications,
}: {
  day: Date;
  notifications: PushNotification[];
}) => {
  const groupedNotifications =
    notifications?.reduce(
      (acc, notification) => {
        if (acc[notification.options.appId]) acc[notification.options.appId].push(notification);
        else acc[notification.options.appId] = [notification];

        return acc;
      },
      {} as { [key: string]: PushNotification[] }
    ) || {};

  const today = new Date();
  const isToday = day.toDateString() === today.toDateString();

  return (
    <>
      <p className="text-sm text-gray-500">
        {isToday ? t('Today') : formatToTimeAgoWithRelativeDetail(day, false, true)}
      </p>

      {Object.keys(groupedNotifications).map((appId) => (
        <NotificationAppGroup
          appId={appId}
          notifications={groupedNotifications[appId]}
          key={appId}
        />
      ))}
    </>
  );
};

const NotificationAppGroup = ({
  appId,
  notifications,
}: {
  appId: string;
  notifications: PushNotification[];
}) => {
  const { data: app } = useApp({ appId: appId }).fetch;
  const appName =
    app?.name ??
    (stringGuidsEqual(appId, OWNER_APP_ID)
      ? 'Homebase'
      : stringGuidsEqual(appId, FEED_APP_ID)
        ? 'Homebase - Feed'
        : `Unknown (${appId})`);

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

        return <NotificationGroup typeGroup={typeGroup} appName={appName} key={typeId} />;
      })}
    </>
  );
};

const NotificationGroup = ({
  typeGroup,
  appName,
}: {
  typeGroup: PushNotification[];
  appName: string;
}) => {
  const canExpand = typeGroup.length > 1;
  const [isExpanded, setExpanded] = useState(!canExpand);

  const {
    remove: { mutate: remove },
    markAsRead: { mutate: markAsRead },
  } = usePushNotifications();

  const groupCount = typeGroup.length - 1;
  const visibleLength = isExpanded ? 10 : 3;

  return (
    <div
      style={{
        paddingBottom: isExpanded ? '' : `${visibleLength * 0.5}rem`,
      }}
    >
      <div className="relative flex flex-col gap-2">
        {typeGroup.slice(0, visibleLength).map((notification, index) => (
          <div
            key={notification.id}
            className={index === 0 || isExpanded ? 'relative z-10' : 'absolute w-full rounded-lg'}
            style={
              index === 0 || isExpanded
                ? undefined
                : {
                    top: `${index * 0.5}rem`,
                    bottom: `${index * -0.5}rem`,
                    left: `${index * 0.25}rem`,
                    right: `${index * -0.5}rem`,
                    zIndex: 5 - index,
                    opacity: 1 - 0.3 * index,
                  }
            }
          >
            <NotificationItem
              notification={notification}
              isExpanded={index === 0 || isExpanded}
              onDismiss={() => remove([notification.id])}
              onOpen={() =>
                canExpand && !isExpanded
                  ? setExpanded(true)
                  : markAsRead(typeGroup.map((n) => n.id))
              }
              groupCount={isExpanded ? 0 : groupCount}
              href={
                (canExpand && isExpanded) || !canExpand ? getTargetLink(notification) : undefined
              }
              appName={appName}
            />
          </div>
        ))}
        {canExpand && isExpanded ? (
          <div className="flex max-w-sm flex-row-reverse">
            <a onClick={() => setExpanded(false)} className="cursor-pointer text-sm text-slate-400">
              {t('Hide')}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const NotificationItem = ({
  notification,
  isExpanded,
  onOpen,
  onDismiss,
  href,
  groupCount,
  appName,
}: {
  notification: PushNotification;
  isExpanded: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  href: string | undefined;
  groupCount: number;
  appName: string;
}) => {
  const identity = useDotYouClient().getIdentity();
  const isLocalNotification = notification.senderId === identity;

  const { data: contactFile } = useContact({
    odinId: isLocalNotification ? undefined : notification.senderId,
    canSave: false,
  }).fetch;
  const senderName = contactFile?.fileMetadata.appData.content.name?.displayName;

  const title = useMemo(() => `${appName}`, [appName]);
  const body = useMemo(
    () => bodyFormer(notification, false, appName, senderName),
    [notification, senderName, appName]
  );

  return (
    <Toast
      title={title}
      imgSrc={notification.senderId ? `https://${notification.senderId}/pub/image` : undefined}
      // Keeping the hidden ones short
      body={ellipsisAtMaxChar(body, isExpanded ? 120 : 40)}
      timestamp={notification.created}
      onDismiss={onDismiss}
      onOpen={onOpen}
      href={href}
      groupCount={groupCount}
      isRead={!notification.unread}
    />
  );
};

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';

const FEED_NEW_CONTENT_TYPE_ID = 'ad695388-c2df-47a0-ad5b-fc9f9e1fffc9';
const FEED_NEW_REACTION_TYPE_ID = '37dae95d-e137-4bd4-b782-8512aaa2c96a';
const FEED_NEW_COMMENT_TYPE_ID = '1e08b70a-3826-4840-8372-18410bfc02c7';

const bodyFormer = (
  payload: PushNotification,
  hasMultiple: boolean,
  appName: string,
  senderName: string | undefined
) => {
  const sender = senderName || payload.senderId;

  if (payload.options.unEncryptedMessage) {
    if (payload.options.appId === CHAT_APP_ID) {
      return `${sender} ${payload.options.unEncryptedMessage}`;
    }
    return payload.options.unEncryptedMessage;
  }

  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${sender} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${sender} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${sender} accepted your connection request`;
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    if (payload.options.typeId === FEED_NEW_CONTENT_TYPE_ID) {
      return `${sender} posted to your feed`;
    } else if (payload.options.typeId === FEED_NEW_REACTION_TYPE_ID) {
      return `${sender} reacted to your post`;
    } else if (payload.options.typeId === FEED_NEW_COMMENT_TYPE_ID) {
      return `${sender} commented to your post`;
    }
  }

  return `${sender} sent you a notification via ${appName}`;
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
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `/apps/mail/${payload.options.typeId}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    return `/apps/feed`;
  }
};

export default Notifications;
