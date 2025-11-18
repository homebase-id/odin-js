import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage, transferHistoryToChatDeliveryStatus } from '../../../providers/ChatProvider';
import {
  AuthorImage,
  AuthorName,
  DialogWrapper,
  OWNER_ROOT,
  t,
  useDotYouClientContext,
  usePortal,
  useTransferHistory,
} from '@homebase-id/common-app';
import { FailedDeliveryDetails, InnerDeliveryIndicator } from './ChatDeliveryIndicator';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import {
  ChatDrive,
  ConversationMetadata,
  UnifiedConversation,
} from '../../../providers/ConversationProvider';

export const ChatMessageInfo = ({
  msg,
  conversation,
  onClose,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  onClose: () => void;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const target = usePortal('modal-container');
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient && recipient !== (msg.fileMetadata.senderOdinId || loggedOnIdentity)
  );

  const isAuthor =
    msg.fileMetadata.senderOdinId === loggedOnIdentity || !msg.fileMetadata.senderOdinId;

  const { data: reactions } = useChatReaction({
    messageFileId: msg.fileId,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const { data: transferHistory } = useTransferHistory({
    fileId: msg.fileId,
    targetDrive: ChatDrive,
  }).fetch;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>

          <p>
            {t('Created')}:
            {formatDateExludingYearIfCurrent(
              new Date(msg.fileMetadata.appData.userDate || msg.fileMetadata.created)
            )}
          </p>

          {msg.fileMetadata.updated !== msg.fileMetadata.created ? (
            <p>
              {t('Updated')}: {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.updated))}
            </p>
          ) : null}
          {msg.fileMetadata.transitCreated ? (
            <p>
              {t('Received ')}:
              {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.transitCreated))}
            </p>
          ) : null}

          <a
            href={`${OWNER_ROOT}/drives/${ChatDrive.alias}_${ChatDrive.type}/${msg.fileId}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {t('See file on your drive')}
          </a>
        </div>

        {recipients?.length ? (
          <div>
            <p className="mb-2 text-xl">{t('Recipients')}</p>
            <div className="flex flex-col gap-4">
              {recipients.map((recipient) => {
                const recipientTransferHistory = transferHistory?.history.results.find(
                  (result) => result.recipient === recipient
                );
                const deliveryStatus =
                  transferHistoryToChatDeliveryStatus(recipientTransferHistory);

                return (
                  <div
                    className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
                    key={recipient}
                  >
                    <div className="flex flex-row items-center gap-2">
                      <AuthorImage
                        odinId={recipient}
                        className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
                        size="sm"
                      />
                      <AuthorName odinId={recipient} />
                    </div>
                    {isAuthor && recipientTransferHistory ? (
                      <div className="flex flex-row justify-end gap-2 sm:contents">
                        <FailedDeliveryDetails
                          transferHistory={recipientTransferHistory}
                          className="sm:ml-auto"
                        />
                        <InnerDeliveryIndicator state={deliveryStatus} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {reactions?.length ? (
          <div>
            <p className="mb-2 text-xl">{t('Reactions')}</p>
            <div className="flex flex-col gap-4">
              {reactions?.map((reaction) => {
                return (
                  <div className="flex flex-row items-center text-lg" key={reaction.body}>
                    <AuthorImage odinId={reaction.authorOdinId} size="xs" className="mr-2" />
                    <AuthorName odinId={reaction.authorOdinId} />
                    <p className="ml-auto text-3xl">{reaction.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
