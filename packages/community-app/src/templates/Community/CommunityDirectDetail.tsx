import { useCommunity } from '../../hooks/community/useCommunity';
import { ErrorBoundary } from '@youfoundation/common-app';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { ChatDetail } from '@youfoundation/chat-app/src/templates/Chat/ChatDetail';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { getNewXorId } from '@youfoundation/js-lib/helpers';
import { ConversationWithYourselfId } from '@youfoundation/chat-app/src/providers/ConversationProvider';
import { useConversation } from '@youfoundation/chat-app/src/hooks/chat/useConversation';

export const CommunityDirectDetail = () => {
  const identity = useDotYouClientContext().getIdentity();

  const { communityKey, dmKey } = useParams();
  const communityId = communityKey;
  const { data: community, isLoading, isFetched } = useCommunity({ communityId }).fetch;

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
      // TODO: Check if we can do this better; Can be slow to create a conversation as fetching has a retry mechanism
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
      {conversationId ? (
        <ChatDetail conversationId={conversationId} key={conversationId || dmKey} />
      ) : null}
    </ErrorBoundary>
  );
};
