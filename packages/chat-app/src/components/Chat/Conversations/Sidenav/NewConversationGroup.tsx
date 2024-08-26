import { useState } from 'react';
import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  Input,
  Label,
  t,
  useAllContacts,
} from '@homebase-id/common-app';
import { Arrow, Times } from '@homebase-id/common-app/icons';
import { useNavigate } from 'react-router-dom';
import { ContactFile } from '@homebase-id/js-lib/network';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { ROOT_PATH } from '../../../../app/App';
import { SingleConversationItem } from '../Item/ConversationItem';

export const NewConversationGroup = () => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  const [isStepOne, setIsStepOne] = useState<boolean>(true);
  const [newRecipients, setNewRecipients] = useState<ContactFile[]>([]);
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

  const { mutateAsync: createNew, status: createStatus } = useConversation().create;
  const doCreate = async () => {
    const recipients = newRecipients.map((x) => x.odinId).filter(Boolean) as string[];
    if (!recipients?.length) return;
    try {
      const result = await createNew({ recipients: recipients, title: groupTitle });
      navigate(`${ROOT_PATH}/${result.newConversationId}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">{t('New Group')}</h2>
        <ActionButton onClick={() => navigate(`${ROOT_PATH}/`)} icon={Times} type="mute" />
      </div>
      {newRecipients?.length ? (
        <div className="flex flex-col gap-2 bg-primary/10 p-5">
          {isStepOne ? (
            <>
              {newRecipients.map((recipient, index) => (
                <div
                  className="flex flex-row items-center gap-1 rounded-lg bg-background px-2 py-1 "
                  key={recipient.odinId || index}
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
            </>
          ) : (
            <div>
              <Label>
                {t('Group name')}{' '}
                <small className="text-sm text-foreground/80">({t('optional')})</small>
              </Label>
              <Input onChange={(e) => setGroupTitle(e.target.value)} defaultValue={groupTitle} />
            </div>
          )}
          <div className="mt-3">
            {isStepOne ? (
              <ActionButton className="w-full" icon={Arrow} onClick={() => setIsStepOne(false)}>
                {t('Next')}
              </ActionButton>
            ) : (
              <div className="flex w-full flex-row gap-2">
                <ActionButton
                  className="w-full"
                  type="secondary"
                  onClick={() => setIsStepOne(true)}
                >
                  {t('Back')}
                </ActionButton>
                <ActionButton
                  className="w-full"
                  icon={Arrow}
                  onClick={doCreate}
                  state={createStatus}
                >
                  {t('Create')}
                </ActionButton>
              </div>
            )}
          </div>
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
        {contactResults.map((result, index) => (
          <SingleConversationItem
            odinId={result.odinId as string}
            isActive={false}
            key={result.odinId || index}
            onClick={() =>
              setNewRecipients([...newRecipients.filter((x) => x.odinId !== result.odinId), result])
            }
          />
        ))}
      </div>
    </ErrorBoundary>
  );
};
