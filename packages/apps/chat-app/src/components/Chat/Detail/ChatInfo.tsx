import { createPortal } from 'react-dom';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ActionLink,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  t,
  useDotYouClientContext,
  usePortal,
} from '@homebase-id/common-app';
import { ConversationMetadata, UnifiedConversation } from '../../../providers/ConversationProvider';
import { Pencil, Arrow } from '@homebase-id/common-app/icons';
import { Link } from 'react-router-dom';
import { ConversationAvatar } from '../Conversations/Item/ConversationAvatar';
import { ConversationTitle } from '../Conversations/Item/ConversationTitle';

export const ChatInfo = ({
  conversation,
  onClose,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  if (!loggedOnIdentity) return null;
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient !== loggedOnIdentity
  );

  const isAdmin = conversation.fileMetadata.senderOdinId === loggedOnIdentity;
  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Chat info')}>
      <div className="flex flex-col items-center gap-4">
        <ConversationAvatar conversation={conversation} sizeClassName={`h-36 w-36`} />

        {isAdmin && recipients?.length > 2 ? (
          <Link
            to={`${CHAT_ROOT_PATH}/${conversation.fileMetadata.appData.uniqueId}/edit`}
            className="flex cursor-pointer flex-row items-center gap-2"
          >
            <ConversationTitle conversation={conversation} includeLink={true} />
            <Pencil className="h-5 w-5" />
          </Link>
        ) : (
          <ConversationTitle conversation={conversation} includeLink={true} />
        )}
      </div>
      {recipients?.length > 1 ? (
        <div className="mt-10">
          <div className="flex flex-col items-center justify-between sm:flex-row">
            <p className="mb-4 text-lg">{t('Recipients')}</p>
            {isAdmin ? (
              <ActionLink
                type="mute"
                size="none"
                href={`${CHAT_ROOT_PATH}/${conversation.fileMetadata.appData.uniqueId}/edit`}
              >
                {t('Edit')}
              </ActionLink>
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <a
                href={`${new DotYouClient({ hostIdentity: loggedOnIdentity, api: ApiType.Guest }).getRoot()}/owner/connections/${recipient}`}
                rel="noreferrer noopener"
                target="_blank"
                className="group flex flex-row items-center gap-3"
                key={recipient}
              >
                <ConnectionImage
                  odinId={recipient}
                  className="border border-neutral-200 dark:border-neutral-800"
                  size="sm"
                />
                <div className="flex flex-col group-hover:underline">
                  <ConnectionName odinId={recipient} />
                  <p>{recipient}</p>
                </div>
                <Arrow className="ml-auto h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
