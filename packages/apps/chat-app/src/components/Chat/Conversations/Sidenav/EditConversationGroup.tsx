import { useEffect, useState } from 'react';
import {
  ActionButton,
  ActionLink,
  AuthorImage,
  AuthorName,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  ImageSelector,
  Input,
  Label,
  NotFound,
  t,
  useOdinClientContext,
  useIntroductions,
  useRawImage,
} from '@homebase-id/common-app';
import { Save, Times } from '@homebase-id/common-app/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { GroupContactSearch } from './ConversationGroupFIelds';
import { ChatDrive, CONVERSATION_IMAGE_KEY } from '../../../../providers/ConversationProvider';

export const EditConversationGroup = () => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const { conversationKey } = useParams();
  const {
    single: { data: conversation, isFetched: isConversationFetched },
    update: { mutate: updateConversation, status: updateStatus },
  } = useConversation({ conversationId: conversationKey });
  const { mutate: introduceIdentities } = useIntroductions().introduceIdentities;

  const [newRecipients, setNewRecipients] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState<string>();
  const [groupImage, setGroupImage] = useState<Blob | null>();

  const navigate = useNavigate();

  const doUpdate = async () => {
    if (!conversation) return;
    const newConversation = { ...conversation };

    if (groupTitle) newConversation.fileMetadata.appData.content.title = groupTitle.trim();

    if (newRecipients.length) {
      newConversation.fileMetadata.appData.content.recipients = [
        ...newConversation.fileMetadata.appData.content.recipients,
        ...newRecipients,
      ];

      introduceIdentities({
        recipients: newRecipients,
        message: t('{0} has added you to a group chat', loggedOnIdentity || ''),
      });
    }

    updateConversation({
      conversation: newConversation,
      distribute: true,
      imagePayload: groupImage,
    });
  };

  useEffect(() => {
    if (updateStatus === 'success') {
      navigate(`${CHAT_ROOT_PATH}/${conversationKey}`);
    }
  }, [updateStatus]);

  const { data: imageData } = useRawImage({
    imageFileId: conversation?.fileId,
    imageFileKey: CONVERSATION_IMAGE_KEY,
    imageDrive: ChatDrive,
    lastModified: conversation?.fileMetadata.updated,
  }).fetch;

  if (
    (!conversation && isConversationFetched) ||
    conversation?.fileMetadata.senderOdinId !== loggedOnIdentity
  )
    return <NotFound />;
  if (!conversation) return null;

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col overflow-auto">
        <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
          <h2 className="font-semibold">
            {t('Edit')} &quot;{conversation?.fileMetadata.appData.content.title}&quot;:
          </h2>
          <ActionButton onClick={() => navigate(`${CHAT_ROOT_PATH}/`)} icon={Times} type="mute" />
        </div>

        <div className="flex flex-col gap-2 bg-primary/10 p-5">
          <div>
            <Label>
              {t('Group photo')}{' '}
              <small className="text-sm text-foreground/80">({t('optional')})</small>
            </Label>
            <ImageSelector
              defaultValue={groupImage || imageData?.url}
              className="overflow-hidden rounded-full"
              onChange={(e) => {
                setGroupImage(e.target.value || null);
              }}
              expectedAspectRatio={1}
            />
          </div>

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
              <AuthorImage odinId={recipient} size="xs" />
              <AuthorName odinId={recipient} />
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

        <GroupContactSearch
          addContact={(newContact) => {
            setNewRecipients([...newRecipients.filter((x) => x !== newContact), newContact]);
          }}
          defaultValue={[...newRecipients, ...conversation.fileMetadata.appData.content.recipients]}
        />
      </div>
    </ErrorBoundary>
  );
};
