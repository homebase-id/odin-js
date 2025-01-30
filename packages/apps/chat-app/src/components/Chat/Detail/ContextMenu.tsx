import { useState } from 'react';

import {
  ActionGroupOptionProps,
  t,
  ActionGroup,
  ErrorNotification,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { ChevronDown } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatDeliveryStatus, ChatMessage } from '../../../providers/ChatProvider';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../../providers/ConversationProvider';
import { ChatMessageInfo } from './ChatMessageInfo';
import { EditChatMessage } from './EditChatMessage';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useChatToggleMessageStar } from '../../../hooks/chat/useChatToggleMessageStar';

export interface ChatActions {
  doReply: (msg: HomebaseFile<ChatMessage>) => void;
  toggleStar: (msg: HomebaseFile<ChatMessage>) => void;
  doDelete: (msg: HomebaseFile<ChatMessage>, deleteForEveryone: boolean) => void;
}

export const ContextMenu = ({
  msg,
  conversation,
  chatActions,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation?: HomebaseFile<UnifiedConversation, unknown>;
  chatActions?: ChatActions;
}) => {
  if (!chatActions) return null;
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [editMessage, setEditMessage] = useState(false);
  const { isStarred } = useChatToggleMessageStar({ msg });
  const { mutate: resend, error: resendError } = useChatMessage().update;

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === loggedOnIdentity;
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
          {
            label: isStarred ? t('Unstar') : t('Star'),
            onClick: () => chatActions.toggleStar(msg),
          },
          ...optionalOptions,
        ]}
        className="absolute right-[0.325rem] top-[0.4rem] z-10 flex-shrink-0 rounded-md bg-background p-1 opacity-0 transition-opacity group-hover:opacity-100"
        type={'mute'}
        size="none"
      >
        <ChevronDown className="h-4 w-4" />
        <span className="sr-only ml-1">{t('More')}</span>
      </ActionGroup>
    </>
  );
};
