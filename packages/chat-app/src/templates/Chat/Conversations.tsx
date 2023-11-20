import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  Input,
  MagnifyingGlass,
  SubtleMessage,
  Times,
  t,
  useAllContacts,
} from '@youfoundation/common-app';
import { useConversations } from '../../hooks/chat/useConversations';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { ContactFile } from '@youfoundation/js-lib/network';
import React from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { useChatMessages } from '../../hooks/chat/useChatMessages';

export const ConversationsList = ({
  openConversation,
  activeConversationId,
}: {
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { data: conversations } = useConversations().all;

  const flatConversations =
    (conversations?.pages
      ?.flatMap((page) => page.searchResults)
      ?.filter(Boolean) as DriveSearchResult<Conversation>[]) || [];

  return (
    <div className="flex flex-grow flex-col ">
      <SearchConversation
        setIsSearchActive={setIsSearchActive}
        openConversation={openConversation}
        conversations={flatConversations}
        activeConversationId={activeConversationId}
      />
      {!isSearchActive ? (
        <div className="flex-grow overflow-auto ">
          {!flatConversations?.length ? (
            <SubtleMessage className="px-5">{t('No conversations found')}</SubtleMessage>
          ) : null}
          {flatConversations?.map((conversation) => (
            <ConversationItem
              key={conversation.fileId}
              conversation={conversation}
              onClick={() =>
                openConversation(conversation.fileMetadata.appData.content.conversationId)
              }
              isActive={
                activeConversationId === conversation.fileMetadata.appData.content.conversationId
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ConversationItem = ({
  conversation,
  onClick,
  isActive,
}: {
  conversation: DriveSearchResult<Conversation>;
  onClick: () => void;
  isActive: boolean;
}) => {
  const groupContent = conversation.fileMetadata.appData.content as GroupConversation;
  if ('recipients' in groupContent) return <>Group conversation</>;

  const singleContent = conversation.fileMetadata.appData.content as SingleConversation;
  return (
    <InnerConversationItem
      onClick={onClick}
      odinId={singleContent.recipient}
      conversationId={singleContent.conversationId}
      isActive={isActive}
    />
  );
};

const InnerConversationItem = ({
  onClick,
  odinId,
  conversationId,
  isActive,
}: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  const { data } = useChatMessages({ conversationId }).all;
  const lastMessage = data?.pages
    .flatMap((page) => page.searchResults)
    ?.filter(Boolean)
    .slice(0, 1)?.[0];

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer flex-row items-center gap-3 px-5 py-2 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : ''
      }`}
    >
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <p className="text-lg">
        <span>
          <ConnectionName odinId={odinId} />
        </span>

        {/* TODO: Add latest message with fallback to odinId*/}
        {lastMessage ? (
          <small className="block leading-none">
            {/* <ConnectionName odinId={lastMessage?.fileMetadata?.senderOdinId} />:{' '} */}
            {lastMessage?.fileMetadata?.appData?.content?.message?.text}
          </small>
        ) : (
          <small className="block leading-none">{odinId}</small>
        )}
      </p>
    </div>
  );
};

const SearchConversation = ({
  setIsSearchActive,
  openConversation,
  activeConversationId,
  conversations,
}: {
  setIsSearchActive: (isActive: boolean) => void;
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
  conversations: DriveSearchResult<Conversation>[];
}) => {
  const [stateIndex, setStateIndex] = useState(0);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const isActive = !!(query && query.length > 1);
  useEffect(() => {
    if (isActive) setIsSearchActive(isActive);
    else setIsSearchActive(false);
  }, [query]);

  const { data: contacts } = useAllContacts(isActive);

  const results = query
    ? [
        ...(conversations?.filter((conversation) => {
          const content = conversation.fileMetadata.appData.content;
          return (
            (content as GroupConversation).recipients?.some((recipient) =>
              recipient.includes(query)
            ) || (content as SingleConversation).recipient?.includes(query)
          );
        }) || []),
        ...(contacts?.filter(
          (contact) =>
            contact.odinId &&
            (contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
        ) || []),
      ]
    : [];

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-row gap-1 px-5 pb-5">
          <Input
            onChange={(e) => setQuery(e.target.value)}
            key={stateIndex}
            defaultValue={query}
            placeholder={t('Search or start a new chat')}
          />
          <ActionButton
            type="secondary"
            icon={isActive ? Times : MagnifyingGlass}
            onClick={() => {
              if (!isActive) return null;

              setQuery('');
              setStateIndex(stateIndex + 1);
            }}
          />
        </div>
      </form>
      <div>
        {isActive ? (
          results?.length ? (
            results.map((result) => (
              <SearchResult
                result={result}
                onOpen={(id) => openConversation(id)}
                isActive={
                  activeConversationId ===
                  (result as DriveSearchResult<Conversation>).fileMetadata?.appData?.content
                    ?.conversationId
                }
                key={result.fileId}
              />
            ))
          ) : (
            <SubtleMessage className="px-5">{t('No contacts found')}</SubtleMessage>
          )
        ) : null}
      </div>
    </>
  );
};

const SearchResult = (props: {
  result: DriveSearchResult<Conversation> | ContactFile;
  onOpen: (conversationId: string) => void;
  isActive: boolean;
}) => {
  if ('odinId' in props.result)
    return <NewConversationSearchResult {...props} result={props.result as ContactFile} />;

  const { onOpen, isActive } = props;
  const result: DriveSearchResult<Conversation> = props.result as DriveSearchResult<Conversation>;

  const { odinId, onClick } = React.useMemo(() => {
    const groupConversation = (result as DriveSearchResult<Conversation>).fileMetadata.appData
      .content as GroupConversation;
    if (groupConversation.recipients?.length)
      return {
        odinId: groupConversation.recipients.join(', '),
        onClick: () => onOpen(groupConversation.conversationId),
      };

    const conversation = (result as DriveSearchResult<Conversation>).fileMetadata.appData
      .content as SingleConversation;
    if (conversation)
      return { odinId: conversation.recipient, onClick: () => onOpen(conversation.conversationId) };

    return { odinId: undefined, onClick: undefined };
  }, [result]);

  return <InnerConversationItem odinId={odinId} onClick={onClick} isActive={isActive} />;
};

const NewConversationSearchResult = ({
  result,
  onOpen,
}: {
  result: ContactFile;
  onOpen: (conversationId: string) => void;
}) => {
  const { mutateAsync: createNew } = useConversation().create;

  const contactFile = result as ContactFile;
  const odinId = contactFile.odinId;

  const onClick = async () => {
    if (!odinId) return;
    try {
      const result = await createNew({ odinId });
      onOpen(result.newConversationId);
    } catch (e) {
      console.error(e);
    }
  };

  return <InnerConversationItem odinId={odinId} isActive={false} onClick={onClick} />;
};
