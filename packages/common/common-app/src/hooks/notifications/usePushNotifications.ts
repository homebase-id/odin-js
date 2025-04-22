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
  markAllNotificationsOfAppAndTypeIdAsRead,
  markAllNotificationsOfAppAsRead,
} from '@homebase-id/js-lib/core';
import { useEffect } from 'react';
import { useOdinClientContext } from '../auth/useOdinClientContext';
import { useRef } from 'react';

const PAGE_SIZE = 500;
export const usePushNotifications = () => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: unknown | undefined) =>
    await GetNotifications(odinClient, undefined, PAGE_SIZE, cursor);

  const markAsRead = async (notificationIds: string[]) =>
    await MarkNotificationsAsRead(odinClient, notificationIds);

  const removeNotifications = async (notificationIds: string[]) =>
    await DeleteNotifications(odinClient, notificationIds);

  return {
    fetch: useInfiniteQuery({
      queryKey: ['push-notifications'],
      initialPageParam: undefined as unknown | undefined,
      queryFn: ({ pageParam }) => getNotifications(pageParam),
      getNextPageParam: (lastPage) =>
        lastPage?.results && lastPage?.results?.length >= PAGE_SIZE ? lastPage.cursor : undefined,
      staleTime: 1000, // 1s - just enough to avoid duplicate fetches in a page load
    }),
    markAsRead: useMutation({
      mutationFn: markAsRead,
      onMutate: async (notificationIds) => {
        const existingData = queryClient.getQueryData<
          InfiniteData<{
            results: PushNotification[];
            cursor: unknown;
          }>
        >(['push-notifications']);

        if (!existingData) return;
        const newData: InfiniteData<{
          results: PushNotification[];
          cursor: unknown;
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
            cursor: unknown;
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
            cursor: unknown;
          }>
        >(['push-notifications']);

        if (!existingData) return;
        const newData: InfiniteData<{
          results: PushNotification[];
          cursor: unknown;
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
            cursor: unknown;
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
      cursor: unknown;
    }>
  >(['push-notifications']);

  if (!existingData) return;
  const newData: InfiniteData<{
    results: PushNotification[];
    cursor: unknown;
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
      cursor: unknown;
    }>
  >(['push-notifications'], newData);
};

export const useUnreadPushNotificationsCount = (props?: { appId?: string }) => {
  const odinClient = useOdinClientContext();
  const getCounts = async () => (await getNotificationCountsByAppId(odinClient)).unreadCounts;

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

export const useRemoveNotifications = (props: {
  disabled?: boolean;
  appId: string;
  typeId?: string;
}) => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();
  const { data: unreadCount } = useUnreadPushNotificationsCount({
    appId: props.appId,
  });

  const markAsRead = async ({ appId, typeId }: { appId: string; typeId?: string }) => {
    const response = typeId
      ? await markAllNotificationsOfAppAndTypeIdAsRead(odinClient, appId, typeId)
      : await markAllNotificationsOfAppAsRead(odinClient, appId);
    return response;
  };

  const mutation = useMutation({
    mutationFn: markAsRead,
    onMutate: ({ appId, typeId }) => {
      if (typeId) {
        return;
      }
      const existingCounts = queryClient.getQueryData<Record<string, number>>([
        'push-notifications-count',
      ]);
      if (!existingCounts) return;

      const newCounts = { ...existingCounts };
      newCounts[appId] = 0;
      queryClient.setQueryData(['push-notifications-count'], newCounts);
    },
    onSuccess: (_, { typeId }) => {
      if (typeId) {
        queryClient.invalidateQueries({ queryKey: ['push-notifications-count'] });
      }
      queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
    },
  });

  useEffect(() => {
    if (props?.typeId) return;

    if (props?.disabled || !props.appId || mutation.status === 'pending' || !unreadCount) {
      return;
    }
    mutation.mutate(props);
  }, [mutation, props?.disabled, props?.appId, unreadCount]);

  const scheduled = useRef(false);
  useEffect(() => {
    if (props?.disabled || !props.appId || !props.typeId || !unreadCount) {
      return;
    }

    if (scheduled.current) return;
    scheduled.current = true;
    setTimeout(() => {
      mutation.mutate(props);
      scheduled.current = false;
    }, 10 * 1000);
    mutation.mutate(props);
  }, [mutation, props?.disabled, props?.appId, props?.typeId]);
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
