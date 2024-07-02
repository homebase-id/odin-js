import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DeleteNotifications,
  GetNotifications,
  MarkNotificationsAsRead,
  PushNotification,
  getNotificationCountsByAppId,
  markAllNotificationsOfAppAsRead,
} from '@youfoundation/js-lib/core';
import { useEffect, useState } from 'react';
import { hasDebugFlag, stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useDotYouClient } from '../auth/useDotYouClient';

const isDebug = hasDebugFlag();
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

  const getCounts = async () => await getNotificationCounts();

  return useQuery({
    queryKey: ['push-notifications-count'],
    select: (counts) => {
      if (!props?.appId) {
        return Object.values(counts.unreadCounts).reduce((acc, count) => acc + count, 0);
      }

      return counts.unreadCounts[props.appId] || 0;
    },
    queryFn: getCounts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRemoveNotifications = (props: { appId: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const markAsRead = (appId: string) => markAllNotificationsOfAppAsRead(dotYouClient, appId);

  const mutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['push-notifications-count'] });
    },
  });

  useEffect(() => {
    (async () => {
      if (!props.appId || !mutation.isIdle) return;
      mutation.mutate(props.appId);
    })();
  }, [mutation, props?.appId]);
};
