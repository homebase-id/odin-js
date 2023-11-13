import { getBrowser, getOperatingSystem } from '@youfoundation/js-lib/auth';
import { DotYouClient } from '@youfoundation/js-lib/core';

const base64ToBase64url = (base64: string) => {
  return base64.replaceAll(/\+/g, '-').replaceAll(/\//g, '_').replaceAll(/=/g, '');
};
export const GetApplicationServerKey = async (dotYouClient: DotYouClient) => {
  const APPLICATION_PUBLIC_KEY_BASE64 =
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

  return base64ToBase64url(APPLICATION_PUBLIC_KEY_BASE64);
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
    friendlyName: clientFriendlyName || `${getBrowser()} ${getOperatingSystem()}`,
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
    .then((response) => response.data);
};

export const GetRegisteredDevices = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient
    .get<PushNotificationSubscription[]>('/notify/push/list')
    .then((response) => response.data);
};

export const RemoveRegisteredDevice = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribe/`);
};

export const RemoveAllRegisteredDevice = async (dotYouClient: DotYouClient) => {
  const axiosClient = dotYouClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribeAll/`);
};
