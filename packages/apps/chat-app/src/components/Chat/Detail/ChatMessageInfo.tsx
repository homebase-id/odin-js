import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import {
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  useDotYouClient,
  usePortal,
} from '@homebase-id/common-app';
import { FailedDeliveryDetails, InnerDeliveryIndicator } from './ChatDeliveryIndicator';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import { UnifiedConversation } from '../../../providers/ConversationProvider';

export const ChatMessageInfo = ({
  msg,
  conversation,
  onClose,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<UnifiedConversation>;
  onClose: () => void;
}) => {
  const identity = useDotYouClient().getIdentity();
  const target = usePortal('modal-container');
  const messageContent = msg.fileMetadata.appData.content;
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient && recipient !== msg.fileMetadata.originalAuthor
  );

  const isAuthor = msg.fileMetadata.senderOdinId === identity || !msg.fileMetadata.senderOdinId;

  const { data: reactions } = useChatReaction({
    messageFileId: msg.fileId,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>
          <p>
            {t('Sent')}: {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.created))}
          </p>
          {msg.fileMetadata.updated !== msg.fileMetadata.created ? (
            <p>
              {t('Updated')}: {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.updated))}
            </p>
          ) : null}
          {msg.fileMetadata.transitCreated ? (
            <p>
              {t('Received')}:{' '}
              {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.transitCreated))}
            </p>
          ) : null}
        </div>

        {recipients?.length ? (
          <div>
            <p className="mb-2 text-xl">{t('Recipients')}</p>
            <div className="flex flex-col gap-4">
              {recipients.map((recipient) => (
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
                  {isAuthor ? (
                    <div className="flex flex-row justify-end gap-2 sm:contents">
                      <FailedDeliveryDetails
                        msg={msg}
                        recipient={recipient}
                        className="sm:ml-auto"
                      />
                      <InnerDeliveryIndicator
                        state={
                          messageContent.deliveryDetails?.[recipient] ||
                          messageContent.deliveryStatus
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ))}
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