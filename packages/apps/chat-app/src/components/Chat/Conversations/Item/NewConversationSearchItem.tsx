import { ContactFile } from '@homebase-id/js-lib/network';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { SingleConversationItem } from './ConversationItem';

export const NewConversationSearchItem = ({
  result,
  onOpen,
}: {
  result: ContactFile;
  onOpen: (conversationId: string) => void;
}) => {
  const { mutateAsync: createNew } = useConversation().create;

  const contactFile = result as ContactFile;
  const odinId = contactFile.odinId;

  const onClick = async () => {
    if (!odinId) return;
    try {
      const result = await createNew({ recipients: [odinId], imagePayload: undefined });
      onOpen(result.newConversationId);
    } catch (e) {
      console.error(e);
    }
  };

  return <SingleConversationItem odinId={odinId} isActive={false} onClick={onClick} />;
};
