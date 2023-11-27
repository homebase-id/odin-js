import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import {
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

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div>
        <p className="mb-2 text-lg">{t('Recipients')}</p>
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
                state={messageContent.deliveryDetails?.[recipient] || messageContent.deliveryStatus}
              />
            </div>
          ))}
        </div>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
