import { useDotYouClient } from '@youfoundation/common-app';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import {
  GetApplicationServerKey,
  RegisterNewDevice,
} from '../../provider/notifications/pushProvider';

export const usePushNotifications = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const getPublicKey = async (): Promise<string> => {
    const dotYouClient = new DotYouClient({ api: ApiType.Guest });
    const client = dotYouClient.createAxiosClient();
    return await client
      .get('/public/keys/offline', {
        validateStatus: () => true,
      })
      .then((response) => response.data.publicKey);
  };

  // Register the push Application Server
  // Use serviceWorker.ready to ensure that you can subscribe for push

  return {
    isEnabled: Notification.permission === 'granted',
    enableOnThisDevice: () => {
      navigator.serviceWorker.ready.then(async (serviceWorkerRegistration) => {
        const publicKey = await GetApplicationServerKey(dotYouClient);

        const options = {
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        };

        serviceWorkerRegistration.pushManager.subscribe(options).then(
          (pushSubscription) => {
            RegisterNewDevice(dotYouClient, pushSubscription);
          },
          (error) => {
            console.error(error);
          }
        );
      });
    },
  };
};
