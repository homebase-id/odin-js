import { useState } from 'react';
import {
  ActionButton,
  Arrow,
  ConnectionImage,
  ConnectionName,
  Input,
  Times,
  t,
  useAllContacts,
} from '@youfoundation/common-app';
import { useNavigate } from 'react-router-dom';
import { InnerConversationItem } from './Conversations';
import { ContactFile } from '@youfoundation/js-lib/network';
import { useConversation } from '../../hooks/chat/useConversation';

export const NewConversationGroup = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);
  const [newRecipients, setNewRecipients] = useState<ContactFile[]>([]);

  const navigate = useNavigate();

  const { data: contacts } = useAllContacts(true);
  const contactResults = contacts
    ? contacts.filter(
        (contact) =>
          contact.odinId &&
          (!query || contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
      )
    : [];

  const { mutateAsync: createNew, status: createStatus } = useConversation().create;
  const doCreate = async () => {
    const recipients = newRecipients.map((x) => x.odinId).filter(Boolean) as string[];
    if (!recipients?.length) return;
    try {
      const result = await createNew({ recipients: recipients });
      navigate('/' + result.newConversationId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">{t('New Group')}</h2>
        <ActionButton onClick={() => navigate('/')} icon={Times} type="mute" />
      </div>
      {newRecipients?.length ? (
        <div className="flex flex-col gap-2 bg-primary/10 p-5">
          {newRecipients.map((recipient) => (
            <div
              className="flex flex-row items-center gap-1 rounded-lg bg-background px-2 py-1 "
              key={recipient.fileId}
            >
              <ConnectionImage odinId={recipient.odinId} size="xs" />
              <ConnectionName odinId={recipient.odinId} />
              <ActionButton
                icon={Times}
                type="mute"
                className="ml-auto"
                onClick={() =>
                  setNewRecipients(newRecipients.filter((x) => x.odinId !== recipient.odinId))
                }
              />
            </div>
          ))}
          <ActionButton
            className="mt-7 w-full"
            icon={Arrow}
            onClick={doCreate}
            state={createStatus}
          >
            {t('Create')}
          </ActionButton>
        </div>
      ) : null}

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
        {contactResults.map((result) => (
          <InnerConversationItem
            odinId={result.odinId as string}
            isActive={false}
            key={result.fileId}
            onClick={() =>
              setNewRecipients([...newRecipients.filter((x) => x.odinId !== result.odinId), result])
            }
          />
        ))}
      </div>
    </>
  );
};
