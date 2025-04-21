import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useState, useEffect } from 'react';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { Draft } from '../../../../providers/CommunityMetadataProvider';
import { useCommunityDrafts } from '../../../../hooks/community/useCommunityDrafts';

export const useMessageDraft = (props?: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  draftKey: string | undefined;
}) => {
  const { community, draftKey } = props || {};

  const {
    single: { data: communityDrafts },
  } = useCommunityDrafts(
    props
      ? {
        odinId: community?.fileMetadata.senderOdinId,
        communityId: community?.fileMetadata.appData.uniqueId,
      }
      : undefined
  );

  const [draft, setDraft] = useState<Draft | undefined>(undefined);
  const drafts = communityDrafts?.fileMetadata.appData.content.drafts || {};
  useEffect(() => {
    if (!draftKey || !communityDrafts || draft?.updatedAt === drafts[draftKey]?.updatedAt) return;

    setDraft(draftKey ? drafts[draftKey] : undefined);
  }, [draftKey, communityDrafts, draft]);

  return draft || (draftKey && drafts[draftKey]) || undefined;
};
