import { getBrowser, getOperatingSystem } from '@youfoundation/js-lib/auth';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';
import { assertIfDefined } from '@youfoundation/js-lib/helpers';

export const GetApplicationServerKey = async () => {
  const dotYouClient = new DotYouClient({ api: ApiType.Guest });
  const client = dotYouClient.createAxiosClient();
  return await client
    .get<string>('/public/keys/notifications_pk', {
      validateStatus: () => true,
    })
    .then((response) => response.data);

  // const APPLICATION_PUBLIC_KEY_BASE64 =
  //   'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

  // return base64ToBase64url(APPLICATION_PUBLIC_KEY_BASE64);
};

export const RegisterNewDevice = async (
  dotYouClient: DotYouClient,
  subscription: PushSubscription,
  clientFriendlyName?: string
) => {
  const jsonObject = subscription.toJSON();
  if (!subscription || !jsonObject.keys) throw new Error('Invalid subscription');

  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post('/notify/push/subscribe', {
    friendlyName: clientFriendlyName || `${getBrowser()} ${getOperatingSystem().name}`,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    auth: jsonObject.keys.auth,
    p256DH: jsonObject.keys.p256dh,
  });
};

export interface PushNotificationSubscription {
  accessRegistrationId: string;
  friendlyName: string;
  expirationTime: number;
  subscriptionStartedDate: number;
}

export const GetCurrentDeviceDetails = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<PushNotificationSubscription>('/notify/push/subscription')
    .then((response) => response.data)
    .catch(() => null);
};

export const GetRegisteredDevices = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<PushNotificationSubscription[]>('/notify/push/list')
    .then((response) => response.data);
};

export const RemoveCurrentRegisteredDevice = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribe/`);
};

export const RemoveRegisteredDevice = async (dotYouClient: DotYouClient, key: string) => {
  const axiosClient = dotYouClient.createAxiosClient();
  assertIfDefined('key', key);

  return await axiosClient.delete(`/notify/push/subscription?key=${key}`);
};

export const RemoveAllRegisteredDevice = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribeAll/`);
};
