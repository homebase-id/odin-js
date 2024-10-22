import { useEffect, useState } from 'react';
import {
  ActionButton,
  ActionLink,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  Input,
  Label,
  NotFound,
  t,
  useAllContacts,
  useDotYouClient,
} from '@homebase-id/common-app';
import { Save, Times } from '@homebase-id/common-app/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { SingleConversationItem } from '../Item/ConversationItem';

export const EditConversationGroup = () => {
  const identity = useDotYouClient().getIdentity();
  const { conversationKey } = useParams();
  const {
    single: { data: conversation, isFetched: isConversationFetched },
    update: { mutate: updateConversation, status: updateStatus },
  } = useConversation({ conversationId: conversationKey });

  const [query, setQuery] = useState<string | undefined>(undefined);

  const [newRecipients, setNewRecipients] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState<string>();

  const navigate = useNavigate();

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts
        .map((dsr) => dsr.fileMetadata.appData.content)
        .filter(
          (contact) =>
            contact.odinId &&
            (!query ||
              contact.odinId?.includes(query) ||
              contact.name?.displayName?.includes(query))
        )
    : [];

  const doUpdate = async () => {
    if (!conversation) return;
    const newConversation = { ...conversation };

    if (groupTitle) {
      newConversation.fileMetadata.appData.content.title = groupTitle;
    }

    if (newRecipients.length) {
      newConversation.fileMetadata.appData.content.recipients = [
        ...newConversation.fileMetadata.appData.content.recipients,
        ...newRecipients,
      ];
    }

    updateConversation({ conversation: newConversation, distribute: true });
  };

  useEffect(() => {
    if (updateStatus === 'success') {
      navigate(`${CHAT_ROOT_PATH}/${conversationKey}`);
    }
  }, [updateStatus]);

  if (
    (!conversation && isConversationFetched) ||
    conversation?.fileMetadata.senderOdinId !== identity
  )
    return <NotFound />;
  if (!conversation) return null;

  return (
    <ErrorBoundary>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">
          {t('Edit')} &quot;{conversation?.fileMetadata.appData.content.title}&quot;:
        </h2>
        <ActionButton onClick={() => navigate(`${CHAT_ROOT_PATH}/`)} icon={Times} type="mute" />
      </div>

      <div className="flex flex-col gap-2 bg-primary/10 p-5">
        <div>
          <Label>
            {t('Group name')}{' '}
            <small className="text-sm text-foreground/80">({t('optional')})</small>
          </Label>
          <Input
            onChange={(e) => setGroupTitle(e.target.value)}
            defaultValue={groupTitle || conversation?.fileMetadata.appData.content.title}
          />
        </div>

        {conversation.fileMetadata.appData.content.recipients.map((recipient) => (
          <div
            className="flex flex-row items-center gap-1 rounded-lg bg-background px-2 py-1 opacity-70"
            key={recipient}
          >
            <ConnectionImage odinId={recipient} size="xs" />
            <ConnectionName odinId={recipient} />
          </div>
        ))}

        {newRecipients.map((recipient, index) => (
          <div
            className="flex flex-row items-center gap-1 rounded-lg bg-background px-2 py-1"
            key={recipient || index}
          >
            <ConnectionImage odinId={recipient} size="xs" />
            <ConnectionName odinId={recipient} />
            <ActionButton
              icon={Times}
              type="mute"
              className="ml-auto"
              onClick={() => setNewRecipients(newRecipients.filter((x) => x !== recipient))}
            />
          </div>
        ))}

        <div className="mt-3">
          <div className="flex w-full flex-row gap-2">
            <ActionLink className="w-full" onClick={() => navigate(-1)} type="secondary">
              {t('Cancel')}
            </ActionLink>
            <ActionButton className="w-full" icon={Save} onClick={doUpdate} state={updateStatus}>
              {t('Save')}
            </ActionButton>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="w-full">
        <div className="flex w-full flex-col gap-2 p-5">
          <Input
            onChange={(e) => setQuery(e.target.value)}
            defaultValue={query}
            className="w-full"
            placeholder={t('Search for contacts')}
          />
        </div>
      </form>
      <div className="flex-grow overflow-auto">
        {contactResults.map((result, index) => (
          <SingleConversationItem
            odinId={result.odinId as string}
            isActive={false}
            key={result.odinId || index}
            onClick={() => {
              if (!result.odinId) return;
              setNewRecipients([
                ...newRecipients.filter((x) => x !== result.odinId),
                result.odinId,
              ]);
            }}
          />
        ))}
      </div>
    </ErrorBoundary>
  );
};
