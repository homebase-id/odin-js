import {
  ConnectionImage,
  ConnectionName,
  ellipsisAtMaxChar,
  t,
  OwnerImage,
  OwnerName,
  LoadingBlock,
  getPlainTextFromRichText,
  useDotYouClient,
} from '@homebase-id/common-app';
import { Persons } from '@homebase-id/common-app/icons';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useChatMessages } from '../../../../hooks/chat/useChatMessages';
import { ChatDeletedArchivalStaus, ChatMessage } from '../../../../providers/ChatProvider';
import { ChatDeliveryIndicator } from '../../Detail/ChatDeliveryIndicator';
import { MessageDeletedInnerBody } from '../../Detail/ChatMessageItem';
import { ChatSentTimeIndicator } from '../../Detail/ChatSentTimeIndicator';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ConversationWithYourselfId } from '../../../../providers/ConversationProvider';
import { useConversationMetadata } from '../../../../hooks/chat/useConversationMetadata';

const ListItemWrapper = ({
  onClick,
  isActive,
  children,
  order,
}: {
  onClick: (() => void) | undefined;
  isActive: boolean;
  children: ReactNode;
  order: number | undefined;
}) => (
  <div className="px-2" style={{ order: order, opacity: order ? 100 : 0 }}>
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-transparent'
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
        <Persons className="h-5 w-5" />
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
    <ListItemWrapper isActive={isActive} onClick={onClick} order={1}>
      <div className="h-[3rem] w-[3rem] flex-shrink-0">
        <OwnerImage
          className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
          size="sm"
        />
      </div>
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
  const identity = useDotYouClient().getIdentity();
  const { data: conversationMetadata } = useConversationMetadata({ conversationId }).single;
  const { data, isFetched: fetchedMessages } = useChatMessages({ conversationId }).all;
  const flatMessages = useMemo(
    () =>
      data?.pages
        ?.flatMap((page) => page?.searchResults)
        ?.filter(Boolean) as HomebaseFile<ChatMessage>[],
    [data]
  );
  const lastMessage = useMemo(() => flatMessages?.[0], [flatMessages]);

  const lastReadTime = conversationMetadata?.fileMetadata.appData.content.lastReadTime || 0;
  const unreadCount =
    conversationMetadata &&
    flatMessages &&
    lastMessage?.fileMetadata.senderOdinId &&
    lastMessage?.fileMetadata.senderOdinId !== identity
      ? flatMessages.filter(
          (msg) =>
            msg.fileMetadata.senderOdinId !== identity &&
            (msg.fileMetadata.transitCreated || msg.fileMetadata.created) > lastReadTime
        )?.length
      : 0;

  if (conversationId === '456894ee-9dcb-4b8d-9384-6a782025c031') {
    console.log('lastMessage', lastMessage);
    console.log('unreadCount', unreadCount);
  }

  const lastMessageContent = lastMessage?.fileMetadata.appData.content;
  const plainLastMessageContent = getPlainTextFromRichText(lastMessageContent?.message);

  useEffect(() => {
    if (!lastMessage) {
      setOrder && setOrder(2);
      return;
    }
    const date = lastMessage?.fileMetadata.created;
    setOrder && date && setOrder(Math.max(new Date().getTime() - date, 2));
  }, [lastMessage]);

  return (
    <>
      <div className="flex w-20 flex-grow flex-col gap-1">
        <div className="flex flex-row justify-between gap-2">
          <p className="font-semibold">
            {typeof title === 'string' ? ellipsisAtMaxChar(title, 25) : title}
          </p>

          {lastMessage ? <ChatSentTimeIndicator msg={lastMessage} keepDetail={false} /> : null}
        </div>
        <div className="flex flex-row items-center gap-1">
          {lastMessage ? <ChatDeliveryIndicator msg={lastMessage} /> : null}

          <div className="w-20 flex-grow leading-tight text-foreground/80">
            {lastMessage && lastMessageContent ? (
              lastMessage.fileMetadata.appData.archivalStatus === ChatDeletedArchivalStaus ? (
                <MessageDeletedInnerBody />
              ) : lastMessageContent.message ? (
                <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {plainLastMessageContent}
                </p>
              ) : (
                <p>📷 {t('Media')}</p>
              )
            ) : !fetchedMessages && conversationId ? (
              <LoadingBlock className="h-5 w-full flex-grow bg-slate-300 dark:bg-slate-200" />
            ) : null}
          </div>

          {unreadCount ? (
            <div className="ml-auto flex h-7 w-7 flex-shrink-0 flex-row items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
              {Math.min(unreadCount, 10)}
              {unreadCount >= 10 ? '+' : ''}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
