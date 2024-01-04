import {
  Persons,
  ConnectionImage,
  ConnectionName,
  ellipsisAtMaxChar,
  t,
  OwnerImage,
  OwnerName,
} from '@youfoundation/common-app';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useChatMessages } from '../../../../hooks/chat/useChatMessages';
import { ChatDeletedArchivalStaus, ChatMessage } from '../../../../providers/ChatProvider';
import { ChatDeliveryIndicator } from '../../Detail/ChatDeliveryIndicator';
import { MessageDeletedInnerBody } from '../../Detail/ChatMessageItem';
import { ChatSentTimeIndicator } from '../../Detail/ChatSentTimeIndicator';
import { useConversation } from '../../../../hooks/chat/useConversation';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ConversationWithYourselfId } from '../../../../providers/ConversationProvider';

const ListItemWrapper = ({
  onClick,
  isActive,
  children,
  order,
}: {
  onClick: (() => void) | undefined;
  isActive: boolean;
  children: ReactNode;
  order?: number;
}) => (
  <div className="px-2" style={{ order: order }}>
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : ''
      }`}
    >
      {children}
    </div>
  </div>
);
export const ConversationListItemWrapper = ListItemWrapper;

export const GroupConversationItem = ({
  title,
  conversationId,
  ...props
}: {
  onClick: (() => void) | undefined;
  title: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  const [order, setOrder] = useState<number>();

  return (
    <ListItemWrapper {...props} order={order}>
      <div className="rounded-full bg-primary/20 p-4">
        <Persons className="h-4 w-4" />
      </div>
      <ConversationBody title={title} conversationId={conversationId} setOrder={setOrder} />
    </ListItemWrapper>
  );
};

export const SingleConversationItem = ({
  odinId,
  conversationId,
  ...props
}: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  const [order, setOrder] = useState<number>();

  return (
    <ListItemWrapper {...props} order={order}>
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConversationBody
        setOrder={setOrder}
        title={<ConnectionName odinId={odinId} />}
        conversationId={conversationId}
      />
    </ListItemWrapper>
  );
};

export const ConversationWithYourselfItem = ({
  onClick,
  isActive,
}: {
  onClick: () => void;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper isActive={isActive} onClick={onClick}>
      <OwnerImage
        className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConversationBody
        title={
          <>
            <OwnerName /> <span className="text-sm text-foreground/50">({t('you')})</span>
          </>
        }
        conversationId={ConversationWithYourselfId}
      />
    </ListItemWrapper>
  );
};

const ConversationBody = ({
  title,
  conversationId,
  setOrder,
}: {
  title: string | ReactNode | undefined;
  conversationId?: string;
  setOrder?: (order: number) => void;
}) => {
  const { data: conversation } = useConversation({ conversationId }).single;
  const { data } = useChatMessages({ conversationId }).all;
  const flatMessages = useMemo(
    () =>
      data?.pages
        .flatMap((page) => page.searchResults)
        ?.filter(Boolean) as DriveSearchResult<ChatMessage>[],
    [data]
  );
  const lastMessage = flatMessages?.[0];

  const lastReadTime = conversation?.fileMetadata.appData.content.lastReadTime;
  const unreadCount =
    flatMessages && lastReadTime
      ? flatMessages.filter(
          (msg) => msg.fileMetadata.senderOdinId && msg.fileMetadata.created >= lastReadTime
        ).length
      : 0;

  const lastMessageContent = lastMessage?.fileMetadata.appData.content;

  useEffect(() => {
    const date = lastMessage?.fileMetadata.appData.userDate || lastMessage?.fileMetadata.created;
    setOrder && date && setOrder(new Date().getTime() - date);
  }, [flatMessages]);

  return (
    <>
      <div className="flex w-full flex-col gap-1">
        <div className="flex flex-row justify-between gap-2">
          <p className="font-semibold">
            {typeof title === 'string' ? ellipsisAtMaxChar(title, 25) : title}
          </p>

          {lastMessage ? <ChatSentTimeIndicator msg={lastMessage} keepDetail={false} /> : null}
        </div>
        <div className="flex flex-row items-center gap-1">
          {lastMessage ? <ChatDeliveryIndicator msg={lastMessage} /> : null}

          <div className="leading-tight text-foreground/80">
            {lastMessage && lastMessageContent ? (
              lastMessage.fileMetadata.appData.archivalStatus === ChatDeletedArchivalStaus ? (
                <MessageDeletedInnerBody />
              ) : lastMessageContent.message ? (
                <p>{ellipsisAtMaxChar(lastMessageContent.message, 30)}</p>
              ) : (
                <p>📷 {t('Media')}</p>
              )
            ) : null}
          </div>

          {unreadCount ? (
            <div className="ml-auto flex h-5 w-5 flex-row items-center justify-center rounded-full bg-primary text-xs text-primary-contrast">
              {unreadCount}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
