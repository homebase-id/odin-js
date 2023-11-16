import { useDotYouClient } from '@youfoundation/common-app';
import {
  GetApplicationServerKey,
  GetCurrentDeviceDetails,
  GetRegisteredDevices,
  RegisterNewDevice,
  RemoveAllRegisteredDevice,
  RemoveRegisteredDevice,
} from '../../provider/notifications/PushProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const usePushNotifications = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  // Register the push Application Server
  // Use serviceWorker.ready to ensure that you can subscribe for push

  return {
    isEnabled: 'Notification' in document && Notification.permission === 'granted',
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
    }),
    removeCurrent: useMutation({
      mutationFn: () => removeCurrentDevice(),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['notification-clients'], exact: false });
      },
    }),
  };
};
