import {
  ActionLink,
  CHAT_ROOT_PATH,
  ErrorBoundary,
  SubtleMessage,
  t,
  useAllContacts,
} from '@homebase-id/common-app';
import { Persons, Plus } from '@homebase-id/common-app/icons';

import { RefObject, useMemo, useRef, useState } from 'react';

import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useSearchParams } from 'react-router-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../../../providers/ConversationProvider';
import { ConversationWithYourselfItem } from '../Item/ConversationItem';
import { ConversationSearch } from './ConversationSearch';
import { ConversationListItem } from '../Item/ConversationListItem';
import { useConversationsWithRecentMessage } from '../../../../hooks/chat/useConversationWithRecentMessage';
import { useVirtualizer } from '@tanstack/react-virtual';

export const ConversationsSidebar = ({
  openConversation,
  activeConversationId,
}: {
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { data: conversations } = useConversationsWithRecentMessage().all;

  const [searchParams] = useSearchParams();
  const isArchivedType = searchParams.get('type') === 'archived';

  const filteredConversations = useMemo(
    () =>
      (conversations || [])?.filter((con) =>
        isArchivedType
          ? con.fileMetadata.appData.archivalStatus === 3
          : !con.fileMetadata.appData.archivalStatus ||
            con.fileMetadata.appData.archivalStatus === 0
      ),
    [conversations, isArchivedType]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <ErrorBoundary>
      <div className="flex flex-grow flex-col overflow-auto" ref={wrapperRef}>
        <ConversationSearch
          setIsSearchActive={setIsSearchActive}
          isSearchActive={isSearchActive}
          openConversation={(id) => {
            setIsSearchActive(false);
            openConversation(id);
          }}
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
        />
        {!isSearchActive ? (
          <ListConversations
            openConversation={(id) => openConversation(id)}
            activeConversationId={activeConversationId}
            scrollRef={wrapperRef}
          />
        ) : null}
      </div>
    </ErrorBoundary>
  );
};

const ListConversations = ({
  openConversation,
  activeConversationId,
  scrollRef,
}: {
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
  scrollRef: RefObject<HTMLDivElement>;
}) => {
  const [searchParams] = useSearchParams();
  const isArchivedType = searchParams.get('type') === 'archived';

  const { data: conversations } = useConversationsWithRecentMessage().all;

  const filteredConversations = useMemo(
    () =>
      (conversations || []).filter((con) =>
        isArchivedType
          ? con.fileMetadata.appData.archivalStatus === 3
          : con.fileMetadata.appData.archivalStatus !== 2 ||
            con.fileMetadata.appData.uniqueId === activeConversationId
      ),
    [conversations, isArchivedType]
  );

  if (!filteredConversations?.length) return <EmptyConversations />;
  return (
    <ConversationList
      conversations={filteredConversations}
      openConversation={openConversation}
      activeConversationId={activeConversationId}
      scrollRef={scrollRef}
    />
  );
};

const EmptyConversations = () => {
  const [searchParams] = useSearchParams();
  const isArchivedType = searchParams.get('type') === 'archived';

  const { data: contacts } = useAllContacts(true);
  const noContacts = !contacts || contacts.length === 0;

  return (
    <div className="order-2 flex flex-row flex-wrap px-5">
      {noContacts ? (
        <SubtleMessage className="flex flex-row items-center gap-1">
          <span>{t('To chat with someone on Homebase you need to be connected first.')}</span>
          <ActionLink href="/owner/connections" type="secondary" icon={Persons}>
            {t('Connect')}
          </ActionLink>
        </SubtleMessage>
      ) : (
        <>
          <SubtleMessage className="">{t('No conversations found')}</SubtleMessage>

          {!isArchivedType ? (
            <ActionLink
              href={`${CHAT_ROOT_PATH}/new`}
              icon={Plus}
              type="secondary"
              className="ml-auto"
            >
              {t('New conversation')}
            </ActionLink>
          ) : null}
        </>
      )}
    </div>
  );
};

const ConversationList = ({
  conversations,
  openConversation,
  activeConversationId,
  scrollRef,
}: {
  conversations: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
  scrollRef: RefObject<HTMLDivElement>;
}) => {
  const [searchParams] = useSearchParams();
  const isArchivedType = searchParams.get('type') === 'archived';

  const virtualizer = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    count: conversations.length,
    estimateSize: () => 80,
    overscan: 2,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col">
        {!isArchivedType ? (
          <ConversationWithYourselfItem
            onClick={() => openConversation(ConversationWithYourselfId)}
            isActive={stringGuidsEqual(activeConversationId, ConversationWithYourselfId)}
          />
        ) : null}

        <div
          className="relative w-full"
          style={{
            height: virtualizer.getTotalSize(),
          }}
        >
          <div
            className="absolute left-0 top-0 z-10 w-full"
            style={{
              transform: `translateY(${items[0]?.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {items.map((item) => {
              const conversation = conversations[item.index];
              return (
                <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}>
                  <ConversationListItem
                    conversation={conversation}
                    onClick={() => openConversation(conversation.fileMetadata.appData.uniqueId)}
                    isActive={stringGuidsEqual(
                      activeConversationId,
                      conversation.fileMetadata.appData.uniqueId
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/*
        {conversations?.map((conversation) => (
          <ConversationListItem
            key={conversation.fileId}
            conversation={conversation}
            onClick={() => openConversation(conversation.fileMetadata.appData.uniqueId)}
            isActive={stringGuidsEqual(
              activeConversationId,
              conversation.fileMetadata.appData.uniqueId
            )}
          />
        ))} */}
      </div>
      {conversations?.length && conversations?.length < 15 ? (
        <div className="flex flex-row justify-center p-5">
          <ActionLink href={`${CHAT_ROOT_PATH}/new`} icon={Plus} type="secondary">
            {t('New conversation')}
          </ActionLink>
        </div>
      ) : null}
    </div>
  );
};
