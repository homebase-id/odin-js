import { useOdinClientContext } from '@homebase-id/common-app';
import {
  getCommunityMetadataQueryOptions,
  useCommunityMetadata,
  useCommunityMetadataSavedOnly,
} from './useCommunityMetadata';
import { SystemFileType } from '@homebase-id/js-lib/core';
import { formatGuidId, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const useCommunityLater = (props?: { messageId?: string }) => {
  const { messageId } = props || {};

  const { odinKey, communityKey } = useParams();
  const { data: savedMessages } = useCommunityMetadataSavedOnly({
    odinId: odinKey,
    communityId: communityKey,
  });
  const isSaved = useMemo(
    () => savedMessages?.some((saved) => stringGuidsEqual(saved.messageId, messageId)),
    [savedMessages, messageId]
  );

  return {
    isSaved,
  };
};

export const useManageCommunityLater = (props?: {
  messageId?: string;
  systemFileType?: SystemFileType;
}) => {
  const { messageId, systemFileType } = props || {};
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();
  const { odinKey, communityKey } = useParams();
  const { mutate: updateMeta, ...saveProps } = useCommunityMetadata().update;

  const mutate = useCallback(() => {
    queryClient
      .fetchQuery(
        getCommunityMetadataQueryOptions(odinClient, queryClient, odinKey, communityKey)
      )
      .then((communityMetadata) => {
        if (!messageId || !systemFileType || !communityMetadata) return;

        const isSaved = communityMetadata?.fileMetadata.appData.content.savedMessages?.some(
          (saved) => stringGuidsEqual(saved.messageId, messageId)
        );
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
      })
      .then(() => {
        queryClient.refetchQueries({
          queryKey: ['community-metadata-saved', odinKey, formatGuidId(communityKey)],
        });
      });
  }, [messageId, systemFileType, updateMeta]);

  return {
    toggleSave: {
      mutate,
      ...saveProps,
    },
  };
};
