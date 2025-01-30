import { isEmptyRichText, isRichTextEqual, useDebounce } from '@homebase-id/common-app';
import { HomebaseFile, RichText, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { useState, useEffect } from 'react';
import {
  insertNewcommunityMetadata,
  useCommunityMetadata,
} from '../../../../hooks/community/useCommunityMetadata';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMetadata, Draft } from '../../../../providers/CommunityMetadataProvider';
import { useQueryClient } from '@tanstack/react-query';

export const DraftSaver = ({
  community,
  draftKey,
  message,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  draftKey: string | undefined;
  message: RichText | undefined;
}) => {
  const queryClient = useQueryClient();
  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
  });

  const debouncedSave = useDebounce(
    () => {
      metadata && updateMetadata({ metadata: metadata });
    },
    {
      timeoutMillis: 1000,
    }
  );

  const [updatedAt, setUpdatedAt] = useState<number | undefined>(undefined);
  useEffect(() => {
    setUpdatedAt(new Date().getTime());
  }, [message]);

  useEffect(() => {
    const drafts = metadata?.fileMetadata.appData.content.drafts || {};

    if (metadata && draftKey && updatedAt) {
      if (
        isRichTextEqual(drafts[draftKey]?.message, message) ||
        (drafts[draftKey] && drafts[draftKey]?.updatedAt >= updatedAt)
      )
        return;

      const emptiedDraft = isEmptyRichText(message) ? undefined : message;
      if (drafts[draftKey]?.message === undefined && emptiedDraft === undefined) return;

      const newDrafts: Record<string, Draft | undefined> = {
        ...drafts,
        [draftKey]: {
          message: emptiedDraft,
          updatedAt: updatedAt || 0,
        },
      };

      if (message === undefined) {
        delete newDrafts[draftKey];
      }

      const newMeta: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata> = {
        ...metadata,
        fileMetadata: {
          ...metadata?.fileMetadata,
          appData: {
            ...metadata?.fileMetadata.appData,
            content: { ...metadata?.fileMetadata.appData.content, drafts: newDrafts },
          },
        },
      };

      if (message === undefined || message.length === 0) {
        insertNewcommunityMetadata(queryClient, newMeta as HomebaseFile<CommunityMetadata>);
        updateMetadata({ metadata: newMeta });
        return;
      } else {
        insertNewcommunityMetadata(queryClient, newMeta as HomebaseFile<CommunityMetadata>);
        debouncedSave();
      }
    }
  }, [metadata, draftKey, message, debouncedSave]);

  return null;
};
