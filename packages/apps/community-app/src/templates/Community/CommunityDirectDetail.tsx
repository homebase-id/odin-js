import { useCommunity } from '../../hooks/community/useCommunity';
import { COMMUNITY_ROOT_PATH, ErrorBoundary } from '@homebase-id/common-app';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { ChatDetail } from '@homebase-id/chat-app/src/templates/Chat/ChatDetail';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getNewXorId } from '@homebase-id/js-lib/helpers';
import { ConversationWithYourselfId } from '@homebase-id/chat-app/src/providers/ConversationProvider';
import { useConversation } from '@homebase-id/chat-app/src/hooks/chat/useConversation';
import { CommunityDirectComposer } from '../../components/Community/Message/CommunityDirectComposer';

export const CommunityDirectDetail = () => {
  const identity = useDotYouClientContext().getIdentity();

  const { odinKey, communityKey, dmKey } = useParams();
  const communityId = communityKey;
  const {
    data: community,
    isLoading,
    isFetched,
  } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const [conversationId, setConversationId] = useState<string | undefined>();
  useEffect(() => {
    if (!dmKey || !identity) return;
    (async () => {
      if (dmKey === identity) {
        setConversationId(ConversationWithYourselfId);
      } else {
        setConversationId(await getNewXorId(identity as string, dmKey));
      }
    })();
  }, [dmKey]);

  const {
    single: { data: conversation, isFetched: conversationFetched },
    create: { mutate: createConversation },
  } = useConversation({
    conversationId,
  });

  useEffect(() => {
    if (dmKey && !conversation && conversationFetched) {
      createConversation({ recipients: [dmKey] });
    }
  }, [conversation, conversationFetched]);

  if (!communityId || isLoading || (!community && isFetched) || !conversation)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="h-full w-full flex-grow bg-background">
        {conversationId ? (
          <ChatDetail
            conversationId={conversationId}
            communityTagId={communityId}
            key={conversationId || dmKey}
            options={{
              rootPath: `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityId}`,
              composer: CommunityDirectComposer,
            }}
          />
        ) : null}
      </div>
    </ErrorBoundary>
  );
};