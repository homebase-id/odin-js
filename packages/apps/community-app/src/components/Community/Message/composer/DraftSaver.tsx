import { useDebounce } from '@homebase-id/common-app';
import { HomebaseFile, RichText, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { useState, useEffect } from 'react';
import { useCommunityMetadata } from '../../../../hooks/community/useCommunityMetadata';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMetadata, Draft } from '../../../../providers/CommunityMetadataProvider';

export const DraftSaver = ({
  community,
  draftKey,
  message,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  draftKey: string | undefined;
  message: RichText | undefined;
}) => {
  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
  });

  const drafts = metadata?.fileMetadata.appData.content.drafts || {};

  const [toSaveMeta, setToSaveMeta] = useState<
    HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata> | undefined
  >();

  const debouncedSave = useDebounce(
    () => {
      toSaveMeta && updateMetadata({ metadata: toSaveMeta });
    },
    {
      timeoutMillis: 2000,
    }
  );

  useEffect(() => {
    if (metadata && draftKey) {
      if (drafts[draftKey]?.message === message) return;

      const newDrafts: Record<string, Draft | undefined> = {
        ...drafts,
        [draftKey]: {
          message,
          updatedAt: new Date().getTime(),
        },
      };

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
        updateMetadata({ metadata: newMeta });
        return;
      } else {
        setToSaveMeta(newMeta);
        debouncedSave();
      }
    }
  }, [draftKey, message, debouncedSave]);

  return null;
};
