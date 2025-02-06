import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useState, useEffect } from 'react';
import { useCommunityMetadata } from '../../../../hooks/community/useCommunityMetadata';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { Draft } from '../../../../providers/CommunityMetadataProvider';

export const useMessageDraft = (props?: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  draftKey: string | undefined;
}) => {
  const { community, draftKey } = props || {};

  const {
    single: { data: metadata },
  } = useCommunityMetadata(
    props
      ? {
          odinId: community?.fileMetadata.senderOdinId,
          communityId: community?.fileMetadata.appData.uniqueId,
        }
      : undefined
  );

  const [draft, setDraft] = useState<Draft | undefined>(undefined);
  const drafts = metadata?.fileMetadata.appData.content.drafts || {};
  useEffect(() => {
    if (!draftKey || !metadata || draft?.updatedAt === drafts[draftKey]?.updatedAt) return;

    setDraft(draftKey ? drafts[draftKey] : undefined);
  }, [draftKey, metadata, draft]);

  return draft || (draftKey && drafts[draftKey]) || undefined;
};
