import { HomebaseFile } from '@homebase-id/js-lib/core';
import { COMMUNITY_PINNED_TAG, CommunityMessage } from '../../providers/CommunityMessageProvider';
import { useCommunityMessage } from './messages/useCommunityMessage';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';

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
