import {
  InfiniteData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AppNotification,
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

const PAGE_SIZE = 30;
export const usePushNotifications = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: number | undefined) =>
    await GetNotifications(dotYouClient, undefined, PAGE_SIZE, cursor);

  const markAsRead = async (notificationIds: string[]) =>
    await MarkNotificationsAsRead(dotYouClient, notificationIds);

  const removeNotifications = async (notificationIds: string[]) =>
    await DeleteNotifications(dotYouClient, notificationIds);

  return {
    fetch: useInfiniteQuery({
      queryKey: ['push-notifications'],
      initialPageParam: undefined as number | undefined,
      queryFn: ({ pageParam }) => getNotifications(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage?.results && lastPage?.results?.length >= PAGE_SIZE ? lastPage.cursor : undefined,
      staleTime: 1000 * 60 * 5, // 5 minutes
      // select: (data) => ({
      //   ...data,
      //   results: data.results.filter(
      //     (n) => !props?.appId || stringGuidsEqual(n.options.appId, props.appId)
      //   ),
      // }),
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onMutate: async (notificationIds) => {
        const existingData = queryClient.getQueryData<
          InfiniteData<{
            results: PushNotification[];
            cursor: number;
          }>
        >(['push-notifications']);

        if (!existingData) return;
        const newData: InfiniteData<{
          results: PushNotification[];
          cursor: number;
        }> = {
          ...existingData,
          pages: existingData.pages.map((page) => ({
            ...page,
            results: page.results.map((n) => ({
              ...n,
              unread: notificationIds.some((id) => id === n.id) ? false : n.unread,
            })),
          })),
        };
        queryClient.setQueryData<
          InfiniteData<{
            results: PushNotification[];
            cursor: number;
          }>
        >(['push-notifications'], newData);

        return existingData;
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeNotifications,
      onMutate: async (notificationIds) => {
        const existingData = queryClient.getQueryData<
          InfiniteData<{
            results: PushNotification[];
            cursor: number;
          }>
        >(['push-notifications']);

        if (!existingData) return;
        const newData: InfiniteData<{
          results: PushNotification[];
          cursor: number;
        }> = {
          ...existingData,
          pages: existingData.pages.map((page) => ({
            ...page,
            results: page.results.filter((n) => !notificationIds.some((id) => id === n.id)),
          })),
        };
        queryClient.setQueryData<
          InfiniteData<{
            results: PushNotification[];
            cursor: number;
          }>
        >(['push-notifications'], newData);

        return existingData;
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
  };
};

export const insertNewNotification = (
  queryClient: QueryClient,
  appNotification: AppNotification
) => {
  const existingData = queryClient.getQueryData<
    InfiniteData<{
      results: PushNotification[];
      cursor: number;
    }>
  >(['push-notifications']);

  if (!existingData) return;
  const newData: InfiniteData<{
    results: PushNotification[];
    cursor: number;
  }> = {
    ...existingData,
    pages: existingData.pages.map((page, index) => ({
      ...page,
      results:
        index === 0
          ? [
              appNotification,
              ...page.results.filter((notification) => notification.id !== appNotification.id),
            ]
          : page.results.filter((notification) => notification.id !== appNotification.id),
    })),
  };

  queryClient.setQueryData<
    InfiniteData<{
      results: PushNotification[];
      cursor: number;
    }>
  >(['push-notifications'], newData);
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

export const insertPushNotification = async (
  queryClient: QueryClient,
  clientNotification: PushNotification
) => {
  const existingNotificationData = queryClient.getQueryData<{
    results: PushNotification[];
    cursor: number;
  }>(['push-notifications']);

  if (existingNotificationData) {
    const newNotificationData = {
      ...existingNotificationData,
      results: [
        clientNotification,
        ...existingNotificationData.results.filter(
          (notification) =>
            !stringGuidsEqual(notification.options.tagId, clientNotification.options.tagId)
        ),
      ],
    };
    queryClient.setQueryData(['push-notifications'], newNotificationData);
  }
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
