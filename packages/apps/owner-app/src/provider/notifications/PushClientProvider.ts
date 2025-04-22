import { getBrowser, getOperatingSystem } from '@homebase-id/js-lib/auth';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { assertIfDefined } from '@homebase-id/js-lib/helpers';

export const getApplicationServerKey = async () => {
  const odinClient = new OdinClient({
    hostIdentity: window.location.hostname,
    api: ApiType.Guest,
  });
  const client = odinClient.createAxiosClient();
  return await client
    .get<string>('/public/keys/notifications_pk', {
      validateStatus: () => true,
    })
    .then((response) => response.data);

  // const APPLICATION_PUBLIC_KEY_BASE64 =
  //   'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

  // return base64ToBase64url(APPLICATION_PUBLIC_KEY_BASE64);
};

export const registerNewDevice = async (
  odinClient: OdinClient,
  subscription: PushSubscription,
  clientFriendlyName?: string
) => {
  const jsonObject = subscription.toJSON();
  if (!subscription || !jsonObject.keys) throw new Error('Invalid subscription');

  const axiosClient = odinClient.createAxiosClient();

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

export const getCurrentDeviceDetails = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient
    .get<PushNotificationSubscription>('/notify/push/subscription')
    .then((response) => response.data)
    .catch(() => null);
};

export const getRegisteredDevices = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient
    .get<PushNotificationSubscription[]>('/notify/push/list')
    .then((response) => response.data);
};

export const removeCurrentRegisteredDevice = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribe/`);
};

export const removeRegisteredDevice = async (odinClient: OdinClient, key: string) => {
  const axiosClient = odinClient.createAxiosClient();
  assertIfDefined('key', key);

  return await axiosClient.delete(`/notify/push/subscription?key=${key}`);
};

export const removeAllRegisteredDevice = async (odinClient: OdinClient) => {
  const axiosClient = odinClient.createAxiosClient();

  return await axiosClient.post(`/notify/push/unsubscribeAll/`);
};
