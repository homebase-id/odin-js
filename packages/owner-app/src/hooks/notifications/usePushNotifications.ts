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

const PAGE_SIZE = 50;
export const usePushNotifications = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const queryClient = useQueryClient();

  const getNotifications = async (cursor: number | undefined) => {
    return await GetNotifications(dotYouClient, PAGE_SIZE, cursor);
  };

  const markAsRead = async (notificationIds: string[]) => {
    return await MarkNotificationsAsRead(dotYouClient, notificationIds);
  };

  const removeNotifications = async (notificationIds: string[]) => {
    return await DeleteNotifications(dotYouClient, notificationIds);
  };

  // Register the push Application Server
  // Use serviceWorker.ready to ensure that you can subscribe for push
  return {
    fetch: useQuery({
      queryKey: ['push-notifications'],
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

export const usePushNotificationClient = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return {
    isSupported:
      'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window,
    isEnabled: Notification.permission === 'granted',
    enableOnThisDevice: async () => {
      await Notification.requestPermission();
      console.log('Notification permission granted.');
      await navigator.serviceWorker.ready.then(async (serviceWorkerRegistration) => {
        const publicKey = await GetApplicationServerKey();
        console.log(publicKey);
        const options = {
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        };

        serviceWorkerRegistration.pushManager.subscribe(options).then(
          async (pushSubscription) => {
            await RegisterNewDevice(dotYouClient, pushSubscription);
            alert('successfully registered');
          },
          (error) => {
            console.error(error);
          }
        );
      });
    },
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
