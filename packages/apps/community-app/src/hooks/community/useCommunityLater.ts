import { useParams } from 'react-router-dom';
import { useCommunityMetadata } from './useCommunityMetadata';
import { SystemFileType } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

export const useCommunityLater = (props?: {
  messageId?: string;
  systemFileType?: SystemFileType;
}) => {
  const { messageId, systemFileType } = props || {};

  const { odinKey, communityKey } = useParams();
  const {
    single: { data: communityMetadata },
    update: { mutate: updateMeta, ...saveProps },
  } = useCommunityMetadata({ odinId: odinKey, communityId: communityKey });

  const isSaved = communityMetadata?.fileMetadata.appData.content.savedMessages.some((saved) =>
    stringGuidsEqual(saved.messageId, messageId)
  );

  return {
    isSaved,
    toggleSave: {
      mutate: () => {
        if (!messageId || !systemFileType || !communityMetadata) return;

        const savedMessages = communityMetadata.fileMetadata.appData.content.savedMessages || [];
        const newSavedMessages = isSaved
          ? savedMessages.filter((saved) => !stringGuidsEqual(saved.messageId, messageId))
          : [...savedMessages, { messageId, systemFileType }];

        updateMeta({
          metadata: {
            ...communityMetadata,
            fileMetadata: {
              ...communityMetadata.fileMetadata,
              appData: {
                ...communityMetadata.fileMetadata.appData,
                content: {
                  ...communityMetadata.fileMetadata.appData.content,
                  savedMessages: newSavedMessages,
                },
              },
            },
          },
        });
      },
      ...saveProps,
    },
  };
};
