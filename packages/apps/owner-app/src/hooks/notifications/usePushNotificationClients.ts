import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { useOdinClientContext, OWNER_APP_ID, t } from '@homebase-id/common-app';
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
import { SendNotification } from '@homebase-id/js-lib/core';
import { formatGuidId, getNewId, hasDebugFlag } from '@homebase-id/js-lib/helpers';

const isDebug = hasDebugFlag();
const TestGuid = '00000000-0000-0000-0000-000000000000';
export const usePushNotificationClient = () => {
  const odinClient = useOdinClientContext();
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
        const correlationId = formatGuidId(getNewId());

        return await SendNotification(
          odinClient,
          {
            appId: OWNER_APP_ID,
            typeId: TestGuid,
            silent: false,
            tagId: TestGuid,
            unEncryptedMessage: `${t('Test notification')} ${correlationId}`,
          },
          {
            headers: {
              'Odin-Correlation-Id': correlationId,
            },
          }
        );
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
                  await registerNewDevice(odinClient, pushSubscription);

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
  const odinClient = useOdinClientContext();

  const getCurrentClient = async () => {
    return await getCurrentDeviceDetails(odinClient);
  };

  const removeCurrentDevice = async () => {
    return await removeCurrentRegisteredDevice(odinClient);
  };

  const _removeRegisteredDevice = async (key: string) => {
    return await removeRegisteredDevice(odinClient, key);
  };

  const getNotificationClients = async () => {
    return await getRegisteredDevices(odinClient);
  };

  const removeAllClients = async () => {
    return await removeAllRegisteredDevice(odinClient);
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
