import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { CommunityChannel, saveCommunityChannel } from '../../../providers/CommunityProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual, toGuidId } from '@youfoundation/js-lib/helpers';
import { useCommunityChannels } from './useCommunityChannels';

export const useCommunityChannel = (props?: { communityId?: string; channelId?: string }) => {
  const { communityId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getIdentity();
  const queryClient = useQueryClient();

  const channelsQuery = useCommunityChannels({ communityId }).fetch;
  const createChannel = async ({
    community,
    channelName,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channelName: string;
  }) => {
    const recipients = community.fileMetadata.appData.content.recipients.filter(
      (recipient) => recipient !== identity
    );
    return await saveCommunityChannel(
      dotYouClient,
      community.fileMetadata.appData.uniqueId as string,
      recipients,
      channelName
    );
  };

  return {
    fetch: {
      ...channelsQuery,
      data: channelsQuery.data?.find((channel) =>
        stringGuidsEqual(channel.fileMetadata.appData.uniqueId, channelId)
      ),
    },
    create: useMutation({
      mutationFn: createChannel,
      onMutate: async ({ channelName, community }) => {
        const existingChannels = queryClient.getQueryData<HomebaseFile<CommunityChannel>[]>([
          'community-channels',
          community.fileMetadata.appData.uniqueId,
        ]);
        if (!existingChannels) return;

        const newChannel: NewHomebaseFile<CommunityChannel> = {
          fileMetadata: {
            appData: {
              uniqueId: toGuidId(channelName),
              content: {
                title: channelName,
                description: '',
              },
            },
          },
          serverMetadata: {
            accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
          },
        };

        queryClient.setQueryData<
          (HomebaseFile<CommunityChannel> | NewHomebaseFile<CommunityChannel>)[]
        >(
          ['community-channels', community.fileMetadata.appData.uniqueId],
          [...existingChannels, newChannel]
        );
      },
    }),
  };
};
