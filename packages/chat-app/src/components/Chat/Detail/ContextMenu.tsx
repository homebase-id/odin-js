import { useState } from 'react';

import {
  useDotYouClient,
  ActionGroupOptionProps,
  t,
  ActionGroup,
  ChevronDown,
  ErrorNotification,
} from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { ChatDeliveryStatus, ChatMessage } from '../../../providers/ChatProvider';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../../providers/ConversationProvider';
import { ChatMessageInfo } from './ChatMessageInfo';
import { EditChatMessage } from './EditChatMessage';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export interface ChatActions {
  doReply: (msg: HomebaseFile<ChatMessage>) => void;
  doDelete: (msg: HomebaseFile<ChatMessage>, deleteForEveryone: boolean) => void;
}

export const ContextMenu = ({
  msg,
  conversation,
  chatActions,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation?: HomebaseFile<UnifiedConversation>;
  chatActions?: ChatActions;
}) => {
  if (!chatActions) return null;
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [editMessage, setEditMessage] = useState(false);

  const { mutate: resend, error: resendError } = useChatMessage().update;

  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;
  const conversationWithYourself = stringGuidsEqual(
    conversation?.fileMetadata.appData.uniqueId,
    ConversationWithYourselfId
  );

  const optionalOptions: ActionGroupOptionProps[] = [];
  if (messageFromMe) {
    optionalOptions.push({
      label: t('Edit'),
      onClick: () => setEditMessage(true),
    });
    optionalOptions.push({
      label: conversationWithYourself ? t('Delete') : t('Delete for everyone'),
      confirmOptions: {
        title: t('Delete message'),
        body: t('Are you sure you want to delete this message?'),
        buttonText: t('Delete'),
      },
      onClick: () => chatActions.doDelete(msg, true),
    });
  }

  if (!conversationWithYourself) {
    optionalOptions.push({
      label: t('Delete for me'),
      confirmOptions: {
        title: t('Delete message'),
        body: t('Are you sure you want to delete this message?'),
        buttonText: t('Delete'),
      },
      onClick: () => chatActions.doDelete(msg, false),
    });
  }

  if (conversation)
    optionalOptions.push({
      label: t('Message info'),
      onClick: () => setShowMessageInfo(true),
    });

  if (
    conversation &&
    msg.fileMetadata.appData.content.deliveryStatus === ChatDeliveryStatus.Failed
  ) {
    optionalOptions.push({
      label: t('Retry sending'),
      onClick: () => resend({ updatedChatMessage: msg, conversation: conversation }),
    });
  }

  return (
    <>
      <ErrorNotification error={resendError} />
      {showMessageInfo && conversation ? (
        <ChatMessageInfo
          msg={msg}
          conversation={conversation}
          onClose={() => setShowMessageInfo(false)}
        />
      ) : null}
      {editMessage && conversation ? (
        <EditChatMessage
          msg={msg}
          conversation={conversation}
          onClose={() => setEditMessage(false)}
        />
      ) : null}
      <ActionGroup
        options={[
          {
            label: t('Reply'),
            onClick: () => chatActions.doReply(msg),
          },
          ...optionalOptions,
        ]}
        className="absolute right-1 top-[0.125rem] z-10 rounded-full bg-transparent group-hover:pointer-events-auto group-hover:bg-background/60"
        type={'mute'}
        size="square"
      >
        <span className="opacity-0 group-hover:opacity-100">
          <ChevronDown className="h-3 w-3" />
          <span className="sr-only ml-1">{t('More')}</span>
        </span>
      </ActionGroup>
    </>
  );
};
