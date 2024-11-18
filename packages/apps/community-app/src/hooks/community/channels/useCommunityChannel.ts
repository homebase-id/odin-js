import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  COMMUNITY_GENERAL_CHANNEL,
  CommunityChannel,
  saveCommunityChannel,
} from '../../../providers/CommunityProvider';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import { formatGuidId, stringGuidsEqual, toGuidId } from '@homebase-id/js-lib/helpers';
import { updateCacheCommunityChannels, useCommunityChannels } from './useCommunityChannels';

export const useCommunityChannel = (props?: {
  odinId?: string;
  communityId?: string;
  channelId?: string;
}) => {
  const { odinId, communityId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const channelsQuery = useCommunityChannels({ odinId, communityId }).fetch;
  const createChannel = async ({
    community,
    channelName,
  }: {
    community: HomebaseFile<CommunityDefinition>;
    channelName: string;
  }) => {
    return await saveCommunityChannel(dotYouClient, community, channelName);
  };

  return {
    fetch: {
      ...channelsQuery,
      data: stringGuidsEqual(channelId, COMMUNITY_GENERAL_CHANNEL.fileMetadata.appData.uniqueId)
        ? COMMUNITY_GENERAL_CHANNEL
        : channelsQuery.data?.find((channel) =>
            stringGuidsEqual(channel.fileMetadata.appData.uniqueId, channelId)
          ),
    },
    create: useMutation({
      mutationFn: createChannel,
      onMutate: async ({ channelName, community }) => {
        const newChannel: NewHomebaseFile<CommunityChannel> = {
          fileMetadata: {
            appData: {
              uniqueId: formatGuidId(toGuidId(channelName)),
              content: {
                title: channelName,
                description: '',
              },
            },
          },
          serverMetadata: {
            accessControlList: community.fileMetadata.appData.content.acl || {
              requiredSecurityGroup: SecurityGroupType.Owner,
            },
          },
        };

        updateCacheCommunityChannels(
          queryClient,
          community.fileMetadata.appData.uniqueId as string,
          (data) => [...data, newChannel]
        );
      },
    }),
  };
};
