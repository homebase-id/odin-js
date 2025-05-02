import { useOdinClientContext } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  UnifiedConversation,
} from '../../../../providers/ConversationProvider';
import { GroupConversationItem, SingleConversationItem } from './ConversationItem';

export const ConversationListItem = ({
  conversation,
  onClick,
  isActive,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  onClick: () => void;
  isActive: boolean;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const recipients = conversation.fileMetadata.appData.content.recipients.filter(
    (recipient) => recipient !== loggedOnIdentity
  );

  if (recipients && recipients.length > 1)
    return (
      <GroupConversationItem
        onClick={onClick}
        title={conversation.fileMetadata.appData.content.title}
        conversation={conversation}
        isActive={isActive}
      />
    );

  return (
    <SingleConversationItem
      onClick={onClick}
      odinId={recipients[0]}
      conversationId={conversation.fileMetadata.appData.uniqueId}
      isActive={isActive}
    />
  );
};
