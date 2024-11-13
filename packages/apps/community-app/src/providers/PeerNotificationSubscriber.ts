import { DotYouClient } from '@homebase-id/js-lib/core';

export const SubscribeToPeerNotifications = async (
  dotYouClient: DotYouClient,
  peerOdinId: string,
  peerSubscriptionId: string
): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient();

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
