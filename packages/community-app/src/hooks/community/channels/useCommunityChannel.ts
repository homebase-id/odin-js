import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@youfoundation/common-app';
import {
  CommunityChannel,
  getCommunityChannel,
  saveCommunityChannel,
} from '../../../providers/CommunityProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import { toGuidId } from '@youfoundation/js-lib/helpers';

export const useCommunityChannel = (props?: { communityId?: string; channelId?: string }) => {
  const { communityId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const identity = dotYouClient.getIdentity();
  const queryClient = useQueryClient();

  const fetchChannel = async (communityId: string, channelId: string) => {
    return await getCommunityChannel(dotYouClient, communityId, channelId);
  };

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
    fetch: useQuery({
      queryKey: ['community-channel', communityId, channelId],
      queryFn: async () => fetchChannel(communityId as string, channelId as string),
      enabled: !!communityId && !!channelId,
    }),
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
