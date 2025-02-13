import { useState } from 'react';
import {
  ActionButton,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ImageSelector,
  Input,
  Label,
  t,
} from '@homebase-id/common-app';
import { Arrow, Times } from '@homebase-id/common-app/icons';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { GroupContactSearch } from './ConversationGroupFIelds';

export const NewConversationGroup = () => {
  const [isStepOne, setIsStepOne] = useState<boolean>(true);
  const [newRecipients, setNewRecipients] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState<string>();
  const [groupImage, setGroupImage] = useState<Blob>();

  const navigate = useNavigate();

  const { mutateAsync: createNew, status: createStatus } = useConversation().create;
  const doCreate = async () => {
    if (!newRecipients?.length) return;
    try {
      const result = await createNew({
        recipients: newRecipients,
        title: groupTitle,
        imagePayload: groupImage,
      });
      navigate(`${CHAT_ROOT_PATH}/${result.newConversationId}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">{t('New Group')}</h2>
        <ActionButton onClick={() => navigate(`${CHAT_ROOT_PATH}/`)} icon={Times} type="mute" />
      </div>
      {newRecipients?.length ? (
        <div className="flex flex-col gap-2 bg-primary/10 p-5">
          {isStepOne ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <Label>
                  {t('Group photo')}{' '}
                  <small className="text-sm text-foreground/80">({t('optional')})</small>
                </Label>
                <ImageSelector
                  defaultValue={groupImage}
                  className="overflow-hidden rounded-full"
                  onChange={(e) => {
                    setGroupImage(e.target.value);
                  }}
                  expectedAspectRatio={1}
                />
              </div>
              <div>
                <Label>
                  {t('Group name')}{' '}
                  <small className="text-sm text-foreground/80">({t('optional')})</small>
                </Label>
                <Input onChange={(e) => setGroupTitle(e.target.value)} defaultValue={groupTitle} />
              </div>
            </>
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

      <GroupContactSearch
        addContact={(newContact) => {
          setNewRecipients([...newRecipients.filter((x) => x !== newContact), newContact]);
        }}
        defaultValue={newRecipients}
      />
    </ErrorBoundary>
  );
};
