import { useState } from 'react';
import { ActionButton, Input, Persons, Times, t, useAllContacts } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { NewConversationSearchResult } from './Conversations';
import { CHAT_ROOT } from './ChatHome';

export const NewConversation = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  const navigate = useNavigate();

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts.filter(
        (contact) =>
          contact.odinId &&
          (!query || contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
      )
    : [];

  return (
    <>
      <div className=" flex flex-row items-center justify-between bg-primary/20 p-5">
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
      <div>
        <button
          onClick={(e) => {
            e.preventDefault();
            navigate(`${CHAT_ROOT}/new-group`);
          }}
          className="flex w-full flex-row items-center gap-3 px-5 py-2 hover:bg-primary/20"
        >
          <div className="rounded-full bg-primary/20 p-4">
            <Persons className="h-4 w-4" />
          </div>
          {t('New group')}
        </button>
        {contactResults.map((result) => (
          <NewConversationSearchResult
            key={result.fileId}
            result={result}
            onOpen={(newId) => navigate(`${CHAT_ROOT}/${newId}`)}
          />
        ))}
      </div>
    </>
  );
};
