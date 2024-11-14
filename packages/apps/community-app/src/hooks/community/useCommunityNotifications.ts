import { useMutation } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { SubscribeToPeerNotifications } from '../../providers/PeerNotificationSubscriber';
import { useCommunityMetadata } from './useCommunityMetadata';
import { useEffect } from 'react';
import { useCommunity } from './useCommunity';

export const useCommunityNotifications = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const { data: community } = useCommunity({ odinId, communityId }).fetch;

  const {
    single: { data: communityMetadata },
    update: { mutate: updateMetadata },
  } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId as string,
  });

  const dotYouClient = useDotYouClientContext();

  const enableCommunityNotifications = async () => {
    if (!community) return;

    return await SubscribeToPeerNotifications(
      dotYouClient,
      community.fileMetadata.senderOdinId,
      community.fileMetadata.appData.uniqueId as string
    );
  };

  const enableMutation = useMutation({
    mutationFn: enableCommunityNotifications,
    onSuccess: () => {
      if (!communityMetadata) return;
      updateMetadata({
        metadata: {
          ...communityMetadata,
          fileMetadata: {
            ...communityMetadata.fileMetadata,
            appData: {
              ...communityMetadata.fileMetadata.appData,
              content: {
                ...communityMetadata.fileMetadata.appData.content,
                notifiationsEnabled: true,
              },
            },
          },
        },
      });
    },
  });

  useEffect(() => {
    if (
      communityMetadata &&
      !communityMetadata.fileMetadata.appData.content.notifiationsEnabled &&
      !enableMutation.isPending
    ) {
      enableMutation.mutate();
    }
  }, [communityMetadata, enableMutation]);
};
