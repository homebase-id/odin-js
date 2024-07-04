import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useDotYouClient, OWNER_APP_ID } from '@youfoundation/common-app';
import { useState, useEffect } from 'react';
import {
  getApplicationServerKey,
  registerNewDevice,
  getCurrentDeviceDetails,
  getRegisteredDevices,
  removeAllRegisteredDevice,
  removeCurrentRegisteredDevice,
  removeRegisteredDevice,
} from '../../provider/notifications/PushClientProvider';
import { SendNotification } from '@youfoundation/js-lib/core';
import { hasDebugFlag } from '@youfoundation/js-lib/helpers';

const isDebug = hasDebugFlag();
const TestGuid = '00000000-0000-0000-0000-000000000000';
export const usePushNotificationClient = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    navigator.serviceWorker.ready.then(() => {
      setIsReady(true);
      isDebug && console.debug('Service Worker is ready :)');
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
              const publicKey = await getApplicationServerKey();
              const options = {
                userVisibleOnly: true,
                applicationServerKey: publicKey,
              };

              await serviceWorkerRegistration.pushManager
                .subscribe(options)
                .then(async (pushSubscription) => {
                  console.log('Push registration success, sending to server...');
                  await registerNewDevice(dotYouClient, pushSubscription);

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
            }, 1000 * 30)
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
    return await getCurrentDeviceDetails(dotYouClient);
  };

  const removeCurrentDevice = async () => {
    return await removeCurrentRegisteredDevice(dotYouClient);
  };

  const _removeRegisteredDevice = async (key: string) => {
    return await removeRegisteredDevice(dotYouClient, key);
  };

  const getNotificationClients = async () => {
    return await getRegisteredDevices(dotYouClient);
  };

  const removeAllClients = async () => {
    return await removeAllRegisteredDevice(dotYouClient);
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
      mutationFn: removeCurrentDevice,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-clients'], exact: false });
        queryClient.invalidateQueries({
          queryKey: ['notification-clients', 'current'],
          exact: false,
        });
      },
    }),
    removeRegisteredDevice: useMutation({
      mutationFn: _removeRegisteredDevice,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-clients'], exact: false });
      },
    }),
  };
};
