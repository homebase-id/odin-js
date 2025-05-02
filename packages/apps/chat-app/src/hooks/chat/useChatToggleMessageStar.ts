import { HomebaseFile, uploadLocalMetadataTags } from '@homebase-id/js-lib/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatMessage } from '../../providers/ChatProvider';
import {
  getRandom16ByteArray,
  stringGuidsEqual,
  toGuidId,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { useOdinClientContext } from '@homebase-id/common-app';
import { ChatDrive } from '../../providers/ConversationProvider';
import { insertNewMessage } from './useChatMessages';
import { invalidateStarredMessages } from './useStarredMessages';

export const STARRED_MSG_TAG = toGuidId('starred');
export const useChatToggleMessageStar = (props?: { msg: HomebaseFile<ChatMessage> }) => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const toggleStar = async (msg: HomebaseFile<ChatMessage>) => {
    return uploadLocalMetadataTags(
      odinClient,
      {
        fileId: msg.fileId,
        targetDrive: ChatDrive,
      },
      {
        iv: uint8ArrayToBase64(getRandom16ByteArray()),
        versionTag: msg.fileMetadata.localAppData?.versionTag,
        tags: msg.fileMetadata.localAppData?.tags?.some((tag) =>
          stringGuidsEqual(STARRED_MSG_TAG, tag)
        )
          ? []
          : [STARRED_MSG_TAG],
      }
    );
  };

  return {
    isStarred: props?.msg.fileMetadata.localAppData?.tags?.some((tag) =>
      stringGuidsEqual(tag, STARRED_MSG_TAG)
    ),
    toggleStar: useMutation({
      mutationFn: toggleStar,
      onMutate: async (msg) => {
        if (!msg) return;
        const updatedChatMessage: HomebaseFile<ChatMessage> = {
          ...msg,
          fileMetadata: {
            ...msg.fileMetadata,
            localAppData: {
              ...msg.fileMetadata.localAppData,
              tags: msg.fileMetadata.localAppData?.tags?.some((tag) =>
                stringGuidsEqual(STARRED_MSG_TAG, tag)
              )
                ? []
                : [STARRED_MSG_TAG],
            },
          },
        };

        insertNewMessage(queryClient, updatedChatMessage);
      },
      onSuccess: (data, msg) => {
        if (!data) return;
        const updatedChatMessage: HomebaseFile<ChatMessage> = {
          ...msg,
          fileMetadata: {
            ...msg.fileMetadata,
            localAppData: {
              ...msg.fileMetadata.localAppData,
              tags: msg.fileMetadata.localAppData?.tags?.some((tag) =>
                stringGuidsEqual(STARRED_MSG_TAG, tag)
              )
                ? []
                : [STARRED_MSG_TAG],
              versionTag: data.newLocalVersionTag,
            },
          },
        };

        insertNewMessage(queryClient, updatedChatMessage);
        invalidateStarredMessages(queryClient);
      },
    }),
  };
};
