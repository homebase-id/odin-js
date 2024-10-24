import { Input, t, useAllContacts } from '@homebase-id/common-app';
import { useState } from 'react';
import { SingleConversationItem } from '../Item/ConversationItem';

export const GroupContactSearch = ({
  addContact,
  defaultValue,
}: {
  addContact: (newOdinId: string) => void;
  defaultValue: string[];
}) => {
  const [query, setQuery] = useState<string | undefined>(undefined);

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
        .filter((contact) => contact.odinId && !defaultValue.includes(contact.odinId))
    : [];

  return (
    <>
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
      {contactResults?.length ? (
        <div className="flex-grow overflow-auto">
          {contactResults.map((result, index) => (
            <SingleConversationItem
              odinId={result.odinId as string}
              isActive={false}
              key={result.odinId || index}
              onClick={() => {
                if (!result.odinId) return;
                addContact(result.odinId);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('No contacts found')}</p>
        </div>
      )}
    </>
  );
};
