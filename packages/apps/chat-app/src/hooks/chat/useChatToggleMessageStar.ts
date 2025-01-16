import { HomebaseFile, uploadLocalMetadataTags } from '@homebase-id/js-lib/core';
import { useMutation } from '@tanstack/react-query';
import { ChatMessage } from '../../providers/ChatProvider';
import {
  getRandom16ByteArray,
  stringGuidsEqual,
  toGuidId,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { ChatDrive } from '../../providers/ConversationProvider';

export const STARRED_MSG_TAG = toGuidId('starred');
export const useChatToggleMessageStar = (props?: { msg: HomebaseFile<ChatMessage> }) => {
  const dotYouClient = useDotYouClientContext();

  const toggleStar = async (msg: HomebaseFile<ChatMessage>) => {
    uploadLocalMetadataTags(
      dotYouClient,
      {
        fileId: msg.fileId,
        targetDrive: ChatDrive,
      },
      {
        iv: uint8ArrayToBase64(getRandom16ByteArray()),
        versionTag: msg.fileMetadata.localAppData?.versionTag,
        tags: msg.fileMetadata.localAppData?.tags?.includes(STARRED_MSG_TAG)
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
    }),
  };
};
