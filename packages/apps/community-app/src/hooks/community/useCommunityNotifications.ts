import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useMutation } from '@tanstack/react-query';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { SubscribeToPeerNotifications } from '../../providers/PeerNotificationSubscriber';

export const useCommunityNotifications = ({
  community,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined | null;
}) => {
  const dotYouClient = useDotYouClientContext();

  const enableCommunityNotifications = async () => {
    if (!community) return;

    return await SubscribeToPeerNotifications(
      dotYouClient,
      community.fileMetadata.senderOdinId,
      community.fileMetadata.appData.uniqueId as string
    );
  };

  return {
    enable: useMutation({
      mutationFn: enableCommunityNotifications,
    }),
  };
};
