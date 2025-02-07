import { useCommunity } from '../../hooks/community/useCommunity';
import {
  CHAT_APP_ID,
  COMMUNITY_ROOT_PATH,
  ErrorBoundary,
  useRemoveNotifications,
} from '@homebase-id/common-app';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { ChatDetail } from '@homebase-id/chat-app/src/templates/Chat/ChatDetail';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getNewXorId, isAGuidId } from '@homebase-id/js-lib/helpers';
import { ConversationWithYourselfId } from '@homebase-id/chat-app/src/providers/ConversationProvider';
import { useConversation } from '@homebase-id/chat-app/src/hooks/chat/useConversation';
import { CommunityDirectComposer } from '../../components/Community/Message/composer/CommunityDirectComposer';

export const CommunityDirectDetail = () => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

  const { odinKey, communityKey, dmKey } = useParams();
  const communityId = communityKey;
  const {
    data: community,
    isLoading,
    isFetched,
  } = useCommunity({ odinId: odinKey, communityId }).fetch;

  const [conversationId, setConversationId] = useState<string | undefined>();
  useEffect(() => {
    if (!dmKey || !loggedOnIdentity) return;
    (async () => {
      if (dmKey === loggedOnIdentity) setConversationId(ConversationWithYourselfId);
      else setConversationId(isAGuidId(dmKey) ? dmKey : await getNewXorId(loggedOnIdentity, dmKey));
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
      createConversation({ recipients: [dmKey], imagePayload: undefined });
    }
  }, [conversation, conversationFetched]);

  useRemoveNotifications({ appId: CHAT_APP_ID, typeId: conversationId, disabled: !conversationId });

  if (!communityId || isLoading || (!community && isFetched) || !conversation)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Community</p>
      </div>
    );

  return (
    <ErrorBoundary>
      <div className="h-full w-20 flex-grow bg-background">
        {conversationId ? (
          <ChatDetail
            conversationId={conversationId}
            communityTagId={communityId}
            key={conversationId || dmKey}
            options={{
              rootPath: `${COMMUNITY_ROOT_PATH}/${odinKey}/${communityId}/direct`,
              composer: CommunityDirectComposer,
            }}
          />
        ) : null}
      </div>
    </ErrorBoundary>
  );
};
