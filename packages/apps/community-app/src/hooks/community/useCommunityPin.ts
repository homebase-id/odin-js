import { DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  COMMUNITY_PINNED_TAG,
  CommunityMessage,
  getCommunityMessages,
} from '../../providers/CommunityMessageProvider';
import { useCommunityMessage } from './messages/useCommunityMessage';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useCommunityPin = ({
  msg,
  community,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community?: HomebaseFile<CommunityDefinition>;
}) => {
  const { mutate, ...updateProps } = useCommunityMessage().update;
  const isPinned = msg.fileMetadata.appData.tags?.some((tag) =>
    stringGuidsEqual(tag, COMMUNITY_PINNED_TAG)
  );

  return {
    isPinned,
    togglePin: {
      mutate: () => {
        if (!msg || !community) return;

        const tags = msg.fileMetadata.appData.tags || [];
        const newTags = isPinned
          ? tags.filter((tag) => !stringGuidsEqual(tag, COMMUNITY_PINNED_TAG))
          : [...tags, COMMUNITY_PINNED_TAG];

        mutate({
          updatedChatMessage: {
            ...msg,
            fileMetadata: {
              ...msg.fileMetadata,
              appData: {
                ...msg.fileMetadata.appData,
                tags: newTags,
              },
            },
          },
          community,
        });
      },
      updateProps,
    },
  };
};

export const useCommunityPins = (props?: {
  odinId: string | undefined;
  communityId: string | undefined;
  channelId?: string;
}) => {
  const { odinId, communityId, channelId } = props || {};
  const dotYouClient = useDotYouClientContext();

  return {
    all: useQuery(getFetchPinnedMessagesQueryOptions(dotYouClient, odinId, communityId, channelId)),
  };
};

const PAGE_SIZE = 100;
const fetchPinnedMessages = async (
  dotYouClient: DotYouClient,
  odinId: string,
  communityId: string,
  channelId: string | undefined,
  cursorState: string | undefined
) => {
  const groupIds = channelId ? [channelId] : undefined;

  return await getCommunityMessages(
    dotYouClient,
    odinId,
    communityId,
    groupIds,
    [COMMUNITY_PINNED_TAG],
    cursorState,
    PAGE_SIZE
  );
};

const getFetchPinnedMessagesQueryOptions = (
  dotYouClient: DotYouClient,
  odinId?: string,
  communityId?: string,
  channelId?: string
): UseQueryOptions<{
  searchResults: HomebaseFile<CommunityMessage>[];
  cursorState: string;
  queryTime: number;
  includeMetadataHeader: boolean;
}> => {
  return {
    queryKey: ['community-pinned-messages'],
    queryFn: () =>
      fetchPinnedMessages(
        dotYouClient,
        odinId as string,
        communityId as string,
        channelId,
        undefined
      ),
    enabled: !!odinId && !!communityId,
    staleTime: 1000, // 1 second
  };
};
