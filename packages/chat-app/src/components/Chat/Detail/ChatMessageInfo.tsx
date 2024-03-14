import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import {
  AuthorImage,
  AuthorName,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  t,
  usePortal,
} from '@youfoundation/common-app';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../../providers/ConversationProvider';
import { InnerDeliveryIndicator } from './ChatDeliveryIndicator';
import { useChatReaction } from '../../../hooks/chat/useChatReaction';

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

export const ChatMessageInfo = ({
  msg,
  conversation,
  onClose,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation: DriveSearchResult<Conversation>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const messageContent = msg.fileMetadata.appData.content;
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = (conversationContent as GroupConversation).recipients || [
    (conversationContent as SingleConversation).recipient,
  ];

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
            {t('Sent')}:{' '}
            {new Date(msg.fileMetadata.created).toLocaleDateString(undefined, dateTimeFormat)}
          </p>
          {msg.fileMetadata.updated !== msg.fileMetadata.created ? (
            <p>
              {t('Updated')}:{' '}
              {new Date(msg.fileMetadata.updated).toLocaleDateString(undefined, dateTimeFormat)}
            </p>
          ) : null}
          {msg.fileMetadata.transitCreated ? (
            <p>
              {t('Received')}:{' '}
              {new Date(msg.fileMetadata.transitCreated).toLocaleDateString(
                undefined,
                dateTimeFormat
              )}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xl">{t('Recipients')}</p>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <div className="flex flex-row items-center justify-between" key={recipient}>
                <div className="flex flex-row items-center gap-2">
                  <ConnectionImage
                    odinId={recipient}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                  />
                  <ConnectionName odinId={recipient} />
                </div>
                <InnerDeliveryIndicator
                  state={
                    messageContent.deliveryDetails?.[recipient] || messageContent.deliveryStatus
                  }
                />
              </div>
            ))}
          </div>
        </div>

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
