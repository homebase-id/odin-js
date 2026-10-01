import { useMemo } from 'react';
import {
  BaseMentionDropdown,
  VolatileInputAutoCompleteProps,
  useAllContacts,
} from '@homebase-id/common-app';
import { useParams } from 'react-router-dom';
import { useConversation } from '../../../hooks/chat/useConversation';

export const ConversationMentionDropdown = (props: VolatileInputAutoCompleteProps) => {
  const conversationKey = useParams().conversationKey;
  const { data: conversation } = useConversation({ conversationId: conversationKey }).single;

  const enabled = !!(props.query && props.query.startsWith('@')) && !!conversation;

  const { data: allContacts } = useAllContacts(enabled);
  const mentionTargets = useMemo(() => {
    return allContacts
      ?.filter((contact) => {
        return (
          contact.fileMetadata.appData.content.odinId &&
          conversation?.fileMetadata.appData.content.recipients.includes(
            contact.fileMetadata.appData.content.odinId
          )
        );
      })
      ?.map((contact) => ({
        name:
          contact.fileMetadata.appData.content.name?.displayName ||
          contact.fileMetadata.appData.content.name?.surname ||
          contact.fileMetadata.appData.content.odinId,
        odinId: contact.fileMetadata.appData.content.odinId,
      }))
      .filter(Boolean) as { name: string; odinId: string }[];
  }, [allContacts]);

  return <BaseMentionDropdown {...props} mentionTargets={mentionTargets} />;
};
