import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useDotYouClient, OWNER_APP_ID } from '@youfoundation/common-app';
import { useState, useEffect } from 'react';
import {
  GetApplicationServerKey,
  RegisterNewDevice,
  GetCurrentDeviceDetails,
  RemoveRegisteredDevice,
  GetRegisteredDevices,
  RemoveAllRegisteredDevice,
} from '../../provider/notifications/PushClientProvider';
import { SendNotification } from '@youfoundation/js-lib/core';

const TestGuid = '00000000-0000-0000-0000-000000000000';
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
      'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window,
    canEnable:
      'PushManager' in window &&
      'serviceWorker' in navigator &&
      isReady &&
      'Notification' in window,
    isEnabled: 'Notification' in window && Notification.permission === 'granted',
    sendTestNotification: useMutation({
      mutationFn: async () => {
        return await SendNotification(dotYouClient, {
          appId: OWNER_APP_ID,
          typeId: TestGuid,
          silent: false,
          tagId: TestGuid,
          unEncryptedMessage: 'Test notification',
        });
      },
    }),
    enableOnThisDevice: useMutation({
      mutationFn: async () => {
        const permission =
          Notification.permission === 'granted'
            ? 'granted'
            : await Notification.requestPermission();

        if (permission === 'denied' || permission === 'default')
          throw new Error('Notification permission denied');

        console.log('Notification permission granted.');

        await Promise.race([
          navigator.serviceWorker.ready
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

                  queryClient.invalidateQueries({
                    queryKey: ['notification-clients', 'current'],
                  });
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
            }),
          new Promise<void>((_resolve, reject) =>
            setTimeout(() => {
              reject(`We can't enable notifications at the moment, please refresh and try again`);
            }, 1000 * 60)
          ),
        ]).catch((error) => {
          throw new Error(error);
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
        queryClient.invalidateQueries({
          queryKey: ['notification-clients', 'current'],
          exact: false,
        });
      },
    }),
  };
};
