import { useDotYouClient } from '@youfoundation/common-app';
import {
  GetApplicationServerKey,
  GetCurrentDeviceDetails,
  GetRegisteredDevices,
  RegisterNewDevice,
  RemoveAllRegisteredDevice,
  RemoveRegisteredDevice,
} from '../../provider/notifications/PushClientProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DeleteNotifications,
  GetNotifications,
  MarkNotificationsAsRead,
} from '../../provider/notifications/PushNotificationsProvider';
import { ApiType } from '@youfoundation/js-lib/core';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 50;
export const usePushNotifications = (props?: { appId?: string }) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: number | undefined) =>
    dotYouClient.getType() === ApiType.App
      ? { results: [], count: 0 }
      : await GetNotifications(dotYouClient, props?.appId, PAGE_SIZE, cursor);

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
      onMutate: async (_notificationIds) => {
        // TODO
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['push-notifications'] });
      },
    }),
    remove: useMutation({
      mutationFn: removeNotifications,
      onMutate: async (notificationIds) => {
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

export const usePushNotificationClient = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    navigator.serviceWorker.ready.then(() => {
      setIsReady(true);
      console.log('Service Worker is ready :)');
    });
  }, []);

  return {
    isSupported:
      'PushManager' in window &&
      'serviceWorker' in navigator &&
      isReady &&
      'Notification' in window,
    isEnabled: 'Notification' in window && Notification.permission === 'granted',
    enableOnThisDevice: useMutation({
      mutationFn: async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'denied' || permission === 'default')
          throw new Error('Notification permission denied');

        console.log('Notification permission granted.');

        await navigator.serviceWorker.ready
          .then(async (serviceWorkerRegistration) => {
            console.log('Service Worker is still ready)');
            const publicKey = await GetApplicationServerKey();
            const options = {
              userVisibleOnly: true,
              applicationServerKey: publicKey,
            };

            await serviceWorkerRegistration.pushManager
              .subscribe(options)
              .then(async (pushSubscription) => {
                console.log('Push registration success, sending to server...');
                await RegisterNewDevice(dotYouClient, pushSubscription);

                queryClient.invalidateQueries({ queryKey: ['notification-clients', 'current'] });
                queryClient.invalidateQueries({ queryKey: ['notification-clients'] });
              })
              .catch((error) => {
                console.error(error);
                throw new Error('Notification registration failed');
              });
          })
          .catch((error) => {
            console.warn('Service Worker error during registration:', error);
            throw new Error('Service Worker error during registration');
          });
      },
    }),
  };
};

export const usePushNotificationClients = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const getCurrentClient = async () => {
    return await GetCurrentDeviceDetails(dotYouClient);
  };

  const removeCurrentDevice = async () => {
    return await RemoveRegisteredDevice(dotYouClient);
  };

  const getNotificationClients = async () => {
    return await GetRegisteredDevices(dotYouClient);
  };

  const removeAllClients = async () => {
    return await RemoveAllRegisteredDevice(dotYouClient);
  };

  return {
    fetch: useQuery({
      queryKey: ['notification-clients'],
      queryFn: () => getNotificationClients(),
    }),
    removeAll: useMutation({
      mutationFn: () => removeAllClients(),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-clients'] });
      },
    }),
    fetchCurrent: useQuery({
      queryKey: ['notification-clients', 'current'],
      queryFn: () => getCurrentClient(),
      retry: false,
    }),
    removeCurrent: useMutation({
      mutationFn: () => removeCurrentDevice(),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-clients'], exact: false });
      },
    }),
  };
};
