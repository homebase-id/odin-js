import { OdinClient } from '@homebase-id/js-lib/core';

export const SubscribeToPeerNotifications = async (
  odinClient: OdinClient,
  peerOdinId: string,
  peerSubscriptionId: string
): Promise<boolean> => {
  const axiosClient = odinClient.createAxiosClient();

  ///api/apps/v1/notify/peer/subscriptions/push-notification
  return await axiosClient
    .post(`notify/peer/subscriptions/push-notification`, {
      identity: peerOdinId,
      subscriptionId: peerSubscriptionId,
    })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};
