import { useState } from 'react';

import {
  useDotYouClient,
  ActionGroupOptionProps,
  t,
  ActionGroup,
  ChevronDown,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import { Conversation } from '../../../providers/ConversationProvider';
import { ChatMessageInfo } from './ChatMessageInfo';
import { EditChatMessage } from './EditChatMessage';

export interface ChatActions {
  doReply: (msg: DriveSearchResult<ChatMessage>) => void;
  doDelete: (msg: DriveSearchResult<ChatMessage>) => void;
}

export const ContextMenu = ({
  msg,
  conversation,
  chatActions,
}: {
  msg: DriveSearchResult<ChatMessage>;
  conversation?: DriveSearchResult<Conversation>;
  chatActions?: ChatActions;
}) => {
  if (!chatActions) return null;
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [editMessage, setEditMessage] = useState(false);

  const identity = useDotYouClient().getIdentity();
  const authorOdinId = msg.fileMetadata.senderOdinId;

  const messageFromMe = !authorOdinId || authorOdinId === identity;

  const optionalOptions: ActionGroupOptionProps[] = [];
  if (messageFromMe) {
    optionalOptions.push({
      label: t('Edit'),
      onClick: () => setEditMessage(true),
    });
    optionalOptions.push({
      label: t('Delete'),
      confirmOptions: {
        title: t('Delete message'),
        body: t('Are you sure you want to delete this message?'),
        buttonText: t('Delete'),
      },
      onClick: () => chatActions.doDelete(msg),
    });
  }
  if (conversation)
    optionalOptions.push({
      label: t('Message info'),
      onClick: () => setShowMessageInfo(true),
    });

  return (
    <>
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
        className="absolute right-1 top-[0.125rem] z-10 rounded-full bg-background/60 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        type={'mute'}
        size="square"
      >
        <>
          <ChevronDown className="h-3 w-3" />
          <span className="sr-only ml-1">{t('More')}</span>
        </>
      </ActionGroup>
    </>
  );
};
