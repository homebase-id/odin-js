import { useState } from 'react';
import { ActionButton, Input, Times, t, useAllContacts } from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { InnerConversationItem } from './Conversations';

export const NewConversationGroup = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [newRecipients, setNewRecipients] = useState<string[]>([]);

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
        <h2 className="font-semibold">{t('New Group')}</h2>
        <ActionButton onClick={() => navigate('/')} icon={Times} type="mute" />
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
        {contactResults.map((result) => (
          <InnerConversationItem
            odinId={result.odinId as string}
            isActive={false}
            key={result.fileId}
            onClick={() => {
              setNewRecipients([...newRecipients, result.odinId as string]);
              // add to new group
            }}
          />
        ))}
      </div>
    </>
  );
};
