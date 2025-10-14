import {
  ApiType,
  AppNotification,
  ClientConnectionNotification,
  DotYouClient,
  PushNotification,
  TargetDrive,
  TypedConnectionNotification,
} from '@homebase-id/js-lib/core';
import {ReactNode, useCallback, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {t} from '../../helpers/i18n/dictionary';
import {DomainHighlighter} from '../../ui/DomainHighlighter/DomainHighlighter';
import {useWebsocketSubscriber} from '../transitProcessor/useWebsocketSubscriber';
import {incrementAppIdNotificationCount, insertNewNotification} from './usePushNotifications';
import {
  OWNER_APP_ID,
  CHAT_APP_ID,
  MAIL_APP_ID,
  FEED_APP_ID,
  COMMUNITY_APP_ID,
} from '../../constants';
import {hasDebugFlag, stringGuidsEqual} from '@homebase-id/js-lib/helpers';
import {
  invalidateActiveConnections,
  invalidatePendingConnection,
  invalidatePendingConnections,
  invalidateSentConnections,
} from '../connections/useConnections';

interface LiveNotification {
  title: string;
  body?: string | ReactNode;
  imgSrc?: string;
  href?: string;
  key: string;
}

const isDebug = hasDebugFlag();

export const useLiveNotifications = (props: { drives?: TargetDrive[] } | undefined = {}) => {
  const {drives} = props || {};
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);
  const queryClient = useQueryClient();

  const handler = useCallback((_: DotYouClient, wsNotification: TypedConnectionNotification) => {
    const clientNotification = wsNotification as ClientConnectionNotification;

    if (
      wsNotification.notificationType === 'connectionRequestAccepted' ||
      wsNotification.notificationType === 'connectionRequestReceived'
    ) {
      isDebug && console.debug(clientNotification);

      const otherId =
        clientNotification.notificationType === 'connectionRequestReceived'
          ? clientNotification.sender
          : clientNotification.recipient;

      const host = new DotYouClient({api: ApiType.Guest, hostIdentity: otherId}).getRoot();

      const liveNotification: LiveNotification = {
        key: `incoming-${otherId}`,
        title:
          clientNotification.notificationType === 'connectionRequestReceived'
            ? t('New connection request')
            : t('Your connection request was accepted'),
        body: otherId ? <DomainHighlighter>{otherId}</DomainHighlighter> : undefined,
        imgSrc: `${host}/pub/image`,
        href: `/owner/connections/${otherId}`,
      };

      setLiveNotifications((oldSet) => [
        ...oldSet.filter((existing) => existing.key !== liveNotification.key),
        liveNotification,
      ]);

      if (wsNotification.notificationType === 'connectionRequestReceived') {
        invalidatePendingConnections(queryClient);
        invalidatePendingConnection(queryClient);
      } else {
        invalidateSentConnections(queryClient);
        invalidateActiveConnections(queryClient);
      }
    } else if (wsNotification.notificationType === 'appNotificationAdded') {
      const clientNotification = wsNotification as AppNotification;

      insertNewNotification(queryClient, clientNotification);
      incrementAppIdNotificationCount(queryClient, clientNotification.options.appId);

      // Add as live notification
      const host = new DotYouClient({
        api: ApiType.Guest,
        hostIdentity: clientNotification.senderId,
      }).getRoot();

      const targetLink = buildNotificationTargetLink(clientNotification);
      if (
        window.location.pathname === targetLink ||
        (targetLink && window.location.pathname.startsWith(targetLink))
      )
        return;

      const liveNotification: LiveNotification = {
        key: clientNotification.id,
        title: buildNotificationTitle(clientNotification),
        body: buildNotificationBody(
          clientNotification,
          false,
          clientNotification.options.appId,
          undefined
        ),
        imgSrc: `${host}/pub/image`,
        href: targetLink,
      };

      setLiveNotifications((oldSet) => [
        ...oldSet.filter((existing) => existing.key !== liveNotification.key),
        liveNotification,
      ]);
    }
  }, []);

  const dismiss = (notification: LiveNotification) => {
    // Just mark the notification as "handled" and avoid displaying it as an overlay; While keeping it in the list of notifications
    setLiveNotifications(liveNotifications.filter((noti) => noti !== notification));
  };

  useWebsocketSubscriber(
    handler,
    undefined,
    ['connectionRequestAccepted', 'connectionRequestReceived', 'appNotificationAdded', 'unknown'],
    drives || [],
    undefined,
    undefined,
    'useLiveNotifications'
  );
  return {
    liveNotifications,
    dismiss,
  };
};

const OWNER_FOLLOWER_TYPE_ID = '2cc468af-109b-4216-8119-542401e32f4d';
const OWNER_CONNECTION_REQUEST_TYPE_ID = '8ee62e9e-c224-47ad-b663-21851207f768';
const OWNER_CONNECTION_ACCEPTED_TYPE_ID = '79f0932a-056e-490b-8208-3a820ad7c321';
const OWNER_INTRODUCTION_RECEIVED_TYPE_ID = 'f100bfa0-ac4e-468a-9322-bdaf6059ec8a';
const OWNER_INTRODUCTION_ACCEPTED_TYPE_ID = 'f56ee792-56dd-45fd-8f9e-f96bb5d0e3de';

const OWNER_SHAMIR_PASSWORD_RECOVERY_RECRUITED = 'c5e3a188-487f-4162-8b37-ee6c6f4a27ef';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_REQUESTED = '260e370d-85d5-4ed9-92ed-bb2b36b0f73c';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SUFFICIENT_SHARDS_COLLECTED = '0df41b47-939e-47c0-8439-d38ce8b4d048';
const OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_COLLECTED = 'e1cb2e75-2002-4ce0-a2e3-f228579229ef';
const OWNER_SHAMIR_PASSWORD_RECOVERY_RISK_REPORT_GENERATED = '959f197f-4f97-4ff1-b36e-eb237b79eda1';

const FEED_NEW_CONTENT_TYPE_ID = 'ad695388-c2df-47a0-ad5b-fc9f9e1fffc9';
const FEED_NEW_REACTION_TYPE_ID = '37dae95d-e137-4bd4-b782-8512aaa2c96a';
const FEED_NEW_COMMENT_TYPE_ID = '1e08b70a-3826-4840-8372-18410bfc02c7';

export const buildNotificationTitle = (payload: PushNotification) => {
  if (stringGuidsEqual(payload.options.appId, OWNER_APP_ID)) {
    return 'Homebase';
  } else if (stringGuidsEqual(payload.options.appId, CHAT_APP_ID)) {
    return 'Homebase Chat';
  } else if (stringGuidsEqual(payload.options.appId, MAIL_APP_ID)) {
    return 'Hombease Mail';
  } else if (stringGuidsEqual(payload.options.appId, FEED_APP_ID)) {
    return 'Homebase Feed';
  } else if (stringGuidsEqual(payload.options.appId, COMMUNITY_APP_ID)) {
    return 'Homebase Community';
  }

  return `Unknown (${payload.options.appId})`;
};

export const buildNotificationBody = (
  payload: PushNotification,
  hasMultiple: boolean,
  appName: string,
  senderName: string | undefined
) => {
  const sender = senderName || payload.senderId;

  if (payload.options.unEncryptedMessage)
    return (payload.options.unEncryptedMessage || '').replaceAll(payload.senderId, sender);

  if (payload.options.appId === OWNER_APP_ID) {
    // Based on type, we show different messages
    if (payload.options.typeId === OWNER_FOLLOWER_TYPE_ID) {
      return `${sender} started following you`;
    } else if (payload.options.typeId === OWNER_CONNECTION_REQUEST_TYPE_ID) {
      return `${sender} sent you a connection request`;
    } else if (payload.options.typeId === OWNER_CONNECTION_ACCEPTED_TYPE_ID) {
      return `${sender} accepted your connection request`;
    } else if (payload.options.typeId === OWNER_INTRODUCTION_RECEIVED_TYPE_ID) {
      return `${sender} introduced you to someone`;
    } else if (payload.options.typeId === OWNER_INTRODUCTION_ACCEPTED_TYPE_ID) {
      return `${sender} confirmed the introduction`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_RECRUITED) {
      return `${sender} added you as part of their password recovery process.  This has zero impact to you :)`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_REQUESTED) {
      return `${sender} has requested your assistance in recovering their identity.  Tap to continue...`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SUFFICIENT_SHARDS_COLLECTED) {
      return 'We now have sufficient shards to recover your password.  Check your email for the final steps.';
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_COLLECTED) {
      return `Good news!  We've collected a shard of your password recovery from ${sender}.  ${payload.options.unEncryptedMessage}`
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_RISK_REPORT_GENERATED) {
      return 'Your password recovery report has been generated.  Tap to continue...';
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `${sender} sent you ${hasMultiple ? 'multiple messages' : 'a message'}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    if (payload.options.typeId === FEED_NEW_CONTENT_TYPE_ID) {
      return `${sender} uploaded a new post`;
    } else if (payload.options.typeId === FEED_NEW_REACTION_TYPE_ID) {
      return `${sender} reacted to your post`;
    } else if (payload.options.typeId === FEED_NEW_COMMENT_TYPE_ID) {
      return `${sender} commented to your post`;
    }
  } else if (payload.options.appId === COMMUNITY_APP_ID) {
    return `${sender} sent ${hasMultiple ? 'multiple messages' : 'a message'}`;
  }

  return `${sender} sent you a notification via ${appName}`;
};

export const buildNotificationTargetLink = (payload: PushNotification) => {
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
    } else if (payload.options.typeId === OWNER_INTRODUCTION_RECEIVED_TYPE_ID) {
      return `/owner/connections`;
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_SHARD_REQUESTED) {
      return `/owner/security/release-shards`
    } else if (payload.options.typeId === OWNER_SHAMIR_PASSWORD_RECOVERY_RISK_REPORT_GENERATED) {
      return `/owner/security/password-recovery`
    }
  } else if (payload.options.appId === CHAT_APP_ID) {
    return `/apps/chat/${payload.options.typeId}`;
  } else if (payload.options.appId === MAIL_APP_ID) {
    return `/apps/mail/inbox/${payload.options.typeId}`;
  } else if (payload.options.appId === FEED_APP_ID) {
    if (payload.options.typeId === FEED_NEW_CONTENT_TYPE_ID)
      return `/apps/feed?post=${payload.options.tagId}`;
    else if (payload.options.typeId === FEED_NEW_COMMENT_TYPE_ID)
      return `/apps/feed/preview/${payload.options.tagId}`;
    else if (payload.options.typeId === FEED_NEW_REACTION_TYPE_ID)
      return `/apps/feed/preview/${payload.options.tagId}`;
    else return `/apps/feed`;
  } else if (payload.options.appId === COMMUNITY_APP_ID) {
    return `/apps/community/redirect/${payload.options.typeId}/${payload.options.tagId}`;
  }
};
