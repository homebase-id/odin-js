import { HomebaseFile } from '@youfoundation/js-lib/core';
import { useCommunity } from '../../hooks/community/useCommunity';
import { ErrorBoundary } from '@youfoundation/common-app';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { ChatMessage } from '@youfoundation/chat-app/src/providers/ChatProvider';
import { ChatDetail } from '@youfoundation/chat-app/src/templates/Chat/ChatDetail';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { getNewXorId } from '@youfoundation/js-lib/helpers';

export const CommunityDirectDetail = () => {
  const identity = useDotYouClientContext().getIdentity();

  const { communityKey, dmKey } = useParams();
  const communityId = communityKey;
  const { data: community, isLoading, isFetched } = useCommunity({ communityId }).fetch;

  const [conversationId, setConversationId] = useState<string | undefined>();
  useEffect(() => {
    if (!dmKey || !identity) return;
    (async () => {
      setConversationId(await getNewXorId(identity as string, dmKey));
    })();
  }, []);

  const [replyMsg, setReplyMsg] = useState<HomebaseFile<ChatMessage> | undefined>();

  if (!communityId || isLoading || (!community && isFetched))
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  console.log(conversationId);

  return (
    <ErrorBoundary>
      {conversationId ? <ChatDetail conversationId={conversationId} /> : null}
    </ErrorBoundary>
  );
};
