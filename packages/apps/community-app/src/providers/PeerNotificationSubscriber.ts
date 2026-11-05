import { DotYouClient } from '@homebase-id/js-lib/core';

export const SubscribeToPeerNotifications = async (
  dotYouClient: DotYouClient,
  peerOdinId: string,
  peerSubscriptionId: string
): Promise<boolean> => {
  const axiosClient = dotYouClient.createAxiosClient({ v2: true });

  return await axiosClient
    .post(`/peer/notify/subscriptions/push-notification`, {
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
