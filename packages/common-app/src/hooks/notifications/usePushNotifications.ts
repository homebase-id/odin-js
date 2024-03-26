import { useDotYouClient } from '@youfoundation/common-app';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DeleteNotifications,
  GetNotifications,
  MarkNotificationsAsRead,
} from '@youfoundation/js-lib/core';
import { useEffect } from 'react';
import { hasDebugFlag } from '@youfoundation/js-lib/helpers';

const isDebug = hasDebugFlag();
const PAGE_SIZE = 50;
export const usePushNotifications = (props?: { appId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: number | undefined) => {
    return await GetNotifications(dotYouClient, props?.appId, PAGE_SIZE, cursor);
  };

  const markAsRead = async (notificationIds: string[]) =>
    await MarkNotificationsAsRead(dotYouClient, notificationIds);

  const removeNotifications = async (notificationIds: string[]) =>
    await DeleteNotifications(dotYouClient, notificationIds);

  return {
    fetch: useQuery({
      queryKey: ['push-notifications', props?.appId],
      queryFn: () => getNotifications(undefined),
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onMutate: async () => {
        // TODO
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeNotifications,
      onMutate: async () => {
        // TODO
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
  };
};

export const useUnreadPushNotificationsCount = (props?: { appId?: string }) => {
  const { data: notifications } = usePushNotifications(props).fetch;

  return notifications?.results.filter((n) => n.unread).length ?? 0;
};

export const useRemoveNotifications = (props?: { appId?: string }) => {
  const {
    fetch: { data: notifcationsData },
    remove: { mutateAsync: removeListOfNotifications },
  } = usePushNotifications(props);

  useEffect(() => {
    (async () => {
      const notifications = notifcationsData?.results;
      if (notifications && notifications?.length > 0) {
        isDebug && console.debug('Removing all notifications', props?.appId);
        await removeListOfNotifications(notifications.map((n) => n.id));
      }
    })();
  }, [notifcationsData]);
};
