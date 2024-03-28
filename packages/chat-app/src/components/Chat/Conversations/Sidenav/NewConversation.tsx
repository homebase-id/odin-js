import { useState } from 'react';
import {
  ActionButton,
  ErrorBoundary,
  Input,
  Persons,
  Times,
  t,
  useAllContacts,
} from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { CHAT_ROOT } from '../../../../templates/Chat/ChatHome';
import { ConversationListItemWrapper } from '../Item/ConversationItem';
import { NewConversationSearchItem } from '../Item/NewConversationSearchItem';

export const NewConversation = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts
        .map((dsr) => dsr.fileMetadata.appData.content)
        .filter(
          (contact) =>
            contact.odinId &&
            (!query || contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
        )
    : [];

  return (
    <ErrorBoundary>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">{t('New Conversation')}</h2>
        <ActionButton onClick={() => navigate(`${CHAT_ROOT}/`)} icon={Times} type="mute" />
      </div>
      <form onSubmit={(e) => e.preventDefault()} className="w-full">
        <div className="flex w-full flex-row items-center p-5">
          <Input
            onChange={(e) => setQuery(e.target.value)}
            defaultValue={query}
            className="w-full"
            placeholder={t('Search for contacts')}
          />
        </div>
      </form>
      <div className="overflow-auto">
        <ConversationListItemWrapper
          order={1}
          onClick={() => {
            navigate(`${CHAT_ROOT}/new-group`);
          }}
          isActive={false}
        >
          <div className="rounded-full bg-primary/20 p-4">
            <Persons className="h-4 w-4" />
          </div>
          {t('New group')}
        </ConversationListItemWrapper>
        {contactResults.map((result, index) => (
          <NewConversationSearchItem
            key={result.odinId || index}
            result={result}
            onOpen={(newId) => navigate(`${CHAT_ROOT}/${newId}`)}
          />
        ))}
      </div>
    </ErrorBoundary>
  );
};
