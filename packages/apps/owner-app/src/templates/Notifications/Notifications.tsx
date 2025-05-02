import {
  ActionButton,
  ellipsisAtMaxChar,
  SubtleMessage,
  t,
  Toast,
  formatToTimeAgoWithRelativeDetail,
  usePushNotifications,
  OWNER_APP_ID,
  ErrorNotification,
  useRemoveNotifications,
  buildNotificationTargetLink,
  buildNotificationBody,
  buildNotificationTitle,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { Cog, Times, Bell } from '@homebase-id/common-app/icons';
import { PageMeta } from '@homebase-id/common-app';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../hooks/apps/useApp';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useSearchParams } from 'react-router-dom';
import { useContact } from '@homebase-id/common-app';
import { ApiType, OdinClient, PushNotification } from '@homebase-id/js-lib/core';
import PushNotificationsDialog from '../../components/Notifications/PushNotificationsDialog/PushNotificationsDialog';

interface NotificationClickData {
  notification: string;
}

const Notifications = () => {
  const [params] = useSearchParams();

  useRemoveNotifications({ appId: OWNER_APP_ID });
  const {
    data: notifications,
    isFetching: fetchingNotifications,
    hasNextPage,
    fetchNextPage,
  } = usePushNotifications().fetch;

  const flattenedNotifications = notifications?.pages?.flatMap((page) => page.results);
  const [isDialogOpen, setDialogOpen] = useState(false);

  const [toOpenNotification, setToOpenNotification] = useState<string | undefined>(
    params.get('notification') || undefined
  );

  const doOpenNotification = (targetTagId: string) => {
    const activeNotification = flattenedNotifications?.find((notification) =>
      stringGuidsEqual(notification.options.tagId, targetTagId)
    );

    if (!activeNotification) return;

    const targetLink = buildNotificationTargetLink(activeNotification);
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
      flattenedNotifications?.reduce(
        (acc, notification) => {
          const date = new Date(notification.created).toDateString();

          if (acc[date]) acc[date].push(notification);
          else acc[date] = [notification];

          return acc;
        },
        {} as { [key: string]: PushNotification[] }
      ) || {},
    [flattenedNotifications]
  );

  const {
    mutate: remove,
    status: removeStatus,
    error: removeError,
  } = usePushNotifications().remove;

  const doClearAll = () => {
    remove(flattenedNotifications?.map((n) => n.id) || []);
  };

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Bell}
        actions={
          <>
            {flattenedNotifications?.length ? (
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
      {flattenedNotifications?.length ? (
        <>
          <div className="mx-2 -mb-5 mt-5 flex max-w-sm flex-row">
            <ActionButton
              type="mute"
              size="none"
              onClick={doClearAll}
              state={removeStatus !== 'success' ? removeStatus : undefined}
              className="ml-auto text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-100"
            >
              {t('Clear all')}
            </ActionButton>
          </div>
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
          <div className="mx-2 mt-5 flex max-w-sm flex-row">
            {hasNextPage ? (
              <ActionButton onClick={() => fetchNextPage()} type="secondary">
                {t('Load more')}
              </ActionButton>
            ) : null}
            <ActionButton
              type="mute"
              size="none"
              onClick={doClearAll}
              state={removeStatus !== 'success' ? removeStatus : undefined}
              className="ml-auto text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-100"
            >
              {t('Clear all')}
            </ActionButton>
          </div>
        </>
      ) : fetchingNotifications ? null : (
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
  const appName = app?.name;

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
  appName?: string;
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
              onDismiss={() =>
                isExpanded ? remove([notification.id]) : remove(typeGroup.map((n) => n.id))
              }
              onOpen={() =>
                canExpand && !isExpanded
                  ? setExpanded(true)
                  : markAsRead(typeGroup.map((n) => n.id))
              }
              groupCount={isExpanded ? 0 : groupCount}
              href={
                (canExpand && isExpanded) || !canExpand
                  ? buildNotificationTargetLink(notification)
                  : undefined
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
  appName?: string;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const isLocalNotification = notification.senderId === loggedOnIdentity;

  const { data: contactFile } = useContact({
    odinId: isLocalNotification ? undefined : notification.senderId,
    canSave: false,
  }).fetch;
  const senderName = contactFile?.fileMetadata.appData.content.name?.displayName;

  const title = useMemo(
    () => (appName ? appName : buildNotificationTitle(notification)),
    [appName]
  );
  const body = useMemo(
    () => buildNotificationBody(notification, false, title, senderName),
    [notification, senderName, title]
  );

  return (
    <Toast
      title={title}
      imgSrc={
        notification.senderId
          ? `${new OdinClient({ hostIdentity: notification.senderId, api: ApiType.Guest }).getRoot()}/pub/image`
          : undefined
      }
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

export default Notifications;
