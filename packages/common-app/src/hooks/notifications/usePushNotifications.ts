import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DeleteNotifications,
  GetNotifications,
  MarkNotificationsAsRead,
  PushNotification,
  getNotificationCountsByAppId,
  markAllNotificationsOfAppAsRead,
} from '@homebase-id/js-lib/core';
import { useEffect } from 'react';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClient } from '../auth/useDotYouClient';

// const isDebug = hasDebugFlag();
const PAGE_SIZE = 700;
export const usePushNotifications = (props?: { appId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: number | undefined) => {
    return await GetNotifications(dotYouClient, undefined, PAGE_SIZE, cursor);
  };

  const markAsRead = async (notificationIds: string[]) =>
    await MarkNotificationsAsRead(dotYouClient, notificationIds);

  const removeNotifications = async (notificationIds: string[]) =>
    await DeleteNotifications(dotYouClient, notificationIds);

  return {
    fetch: useQuery({
      queryKey: ['push-notifications'],
      queryFn: () => getNotifications(undefined),
      staleTime: 1000 * 60 * 5, // 5 minutes
      select: (data) => ({
        ...data,
        results: data.results.filter(
          (n) => !props?.appId || stringGuidsEqual(n.options.appId, props.appId)
        ),
      }),
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onMutate: async (notificationIds) => {
        const existingData = queryClient.getQueryData<{
          results: PushNotification[];
          cursor: number;
        }>(['push-notifications']);

        if (!existingData) return;
        const newData = {
          ...existingData,
          results: existingData.results.map((n) => ({
            ...n,
            unread: notificationIds.some((id) => id === n.id) ? false : n.unread,
          })),
        };
        queryClient.setQueryData(['push-notifications'], newData);

        return existingData;
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeNotifications,
      onMutate: async (notificationIds) => {
        const existingData = queryClient.getQueryData<{
          results: PushNotification[];
          cursor: number;
        }>(['push-notifications']);

        if (!existingData) return;
        const newData = {
          ...existingData,
          results: existingData.results.filter((n) => !notificationIds.some((id) => id === n.id)),
        };
        queryClient.setQueryData(['push-notifications'], newData);

        return existingData;
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
  };
};

export const useUnreadPushNotificationsCount = (props?: { appId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const getNotificationCounts = async () => getNotificationCountsByAppId(dotYouClient);

  const getCounts = async () => (await getNotificationCounts()).unreadCounts;

  return useQuery({
    queryKey: ['push-notifications-count'],
    select: (counts) => {
      if (!props?.appId) {
        return Object.values(counts).reduce((acc, count) => acc + count, 0);
      }

      return counts[props.appId] || 0;
    },
    queryFn: getCounts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRemoveNotifications = (props: { disabled?: boolean; appId: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const { data: unreadCount } = useUnreadPushNotificationsCount({ appId: props.appId });

  const markAsRead = async (appId: string) => {
    const response = await markAllNotificationsOfAppAsRead(dotYouClient, appId);
    return response;
  };

  const mutation = useMutation({
    mutationFn: markAsRead,
    onMutate: (appId: string) => {
      const existingCounts = queryClient.getQueryData<Record<string, number>>([
        'push-notifications-count',
      ]);
      if (!existingCounts) return;

      const newCounts = { ...existingCounts };
      newCounts[appId] = 0;
      queryClient.setQueryData(['push-notifications-count'], newCounts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
    },
  });

  useEffect(() => {
    (async () => {
      if (props?.disabled || !props.appId || mutation.status === 'pending' || !unreadCount) {
        return;
      }
      mutation.mutate(props.appId);
    })();
  }, [mutation, props?.disabled, props?.appId, unreadCount]);
};

export const incrementAppIdNotificationCount = async (queryClient: QueryClient, appId: string) => {
  const existingCounts = queryClient.getQueryData<Record<string, number>>([
    'push-notifications-count',
  ]);
  if (!existingCounts) return;
  const newCounts = {
    ...existingCounts,
  };
  newCounts[appId] = (newCounts[appId] || 0) + 1;
  queryClient.setQueryData(['push-notifications-count'], newCounts);
};
