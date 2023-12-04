import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  Input,
  MagnifyingGlass,
  Persons,
  SubtleMessage,
  Times,
  ellipsisAtMaxChar,
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
import { useConversation } from '../../hooks/chat/useConversation';
import { useChatMessages } from '../../hooks/chat/useChatMessages';

import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ChatDeletedArchivalStaus } from '../../providers/ChatProvider';
import { ChatDeliveryIndicator } from '../../components/Chat/Detail/ChatDeliveryIndicator';
import { MessageDeletedInnerBody } from '../../components/Chat/Detail/ChatMessageItem';
import { ChatSentTimeIndicator } from '../../components/Chat/Detail/ChatSentTimeIndicator';
import { useNavigate } from 'react-router-dom';
import { CHAT_ROOT } from './ChatHome';

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
        isSearchActive={isSearchActive}
        openConversation={(id) => {
          setIsSearchActive(false);
          openConversation(id);
        }}
        conversations={flatConversations}
        activeConversationId={activeConversationId}
      />
      {!isSearchActive ? (
        <div className="flex-grow overflow-auto ">
          {!flatConversations?.length ? (
            <SubtleMessage className="px-5">{t('No conversations found')}</SubtleMessage>
          ) : null}
          {flatConversations?.map((conversation) => (
            <ConversationListItem
              key={conversation.fileId}
              conversation={conversation}
              onClick={() => openConversation(conversation.fileMetadata.appData.uniqueId)}
              isActive={stringGuidsEqual(
                activeConversationId,
                conversation.fileMetadata.appData.uniqueId
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ConversationListItem = ({
  conversation,
  onClick,
  isActive,
}: {
  conversation: DriveSearchResult<Conversation>;
  onClick: () => void;
  isActive: boolean;
}) => {
  const groupContent = conversation.fileMetadata.appData.content as GroupConversation;
  if ('recipients' in groupContent)
    return (
      <GroupConversationItem
        onClick={onClick}
        title={groupContent.title}
        conversationId={conversation.fileMetadata.appData.uniqueId}
        isActive={isActive}
      />
    );

  const singleContent = conversation.fileMetadata.appData.content as SingleConversation;
  return (
    <SingleConversationItem
      onClick={onClick}
      odinId={singleContent.recipient}
      conversationId={conversation.fileMetadata.appData.uniqueId}
      isActive={isActive}
    />
  );
};

const GroupConversationItem = ({
  onClick,
  title,
  conversationId,
  isActive,
}: {
  onClick: (() => void) | undefined;
  title: string | undefined;
  conversationId?: string;
  isActive: boolean;
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 px-5 py-2 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : ''
      }`}
    >
      <div className="rounded-full bg-primary/20 p-4">
        <Persons className="h-4 w-4" />
      </div>
      <ConversationBody title={title} conversationId={conversationId} />
    </div>
  );
};

export const SingleConversationItem = ({
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
  return (
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 px-5 py-2 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : ''
      }`}
    >
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConversationBody title={odinId} conversationId={conversationId} />
    </div>
  );
};

const ConversationBody = ({
  title,
  conversationId,
}: {
  title: string | undefined;
  conversationId?: string;
}) => {
  const { data } = useChatMessages({ conversationId }).all;
  const lastMessage = data?.pages
    .flatMap((page) => page.searchResults)
    ?.filter(Boolean)
    .slice(0, 1)?.[0];

  const lastMessageContent = lastMessage?.fileMetadata.appData.content;

  return (
    <>
      <div className="flex w-full flex-col gap-1">
        <div className="flex flex-row justify-between gap-2">
          <p className="font-semibold">{ellipsisAtMaxChar(title, 25)}</p>
          {lastMessage ? <ChatSentTimeIndicator msg={lastMessage} isShort={true} /> : null}
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
        </div>
      </div>
    </>
  );
};

const SearchConversation = ({
  isSearchActive,
  setIsSearchActive,
  openConversation,
  activeConversationId,
  conversations,
}: {
  isSearchActive: boolean;
  setIsSearchActive: (isActive: boolean) => void;
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
  conversations: DriveSearchResult<Conversation>[];
}) => {
  const navigate = useNavigate();
  const [stateIndex, setStateIndex] = useState(0);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const isActive = !!(query && query.length > 1);
  useEffect(() => {
    if (isActive) setIsSearchActive(isActive);
    else setIsSearchActive(false);
  }, [query]);

  useEffect(() => {
    if (!isSearchActive) {
      setQuery(undefined);
      setStateIndex(stateIndex + 1);
    }
  }, [isSearchActive]);

  const { data: contacts } = useAllContacts(isActive);

  const conversationResults =
    query && conversations
      ? conversations.filter((conversation) => {
          const content = conversation.fileMetadata.appData.content;
          return (
            (content as GroupConversation).recipients?.some((recipient) =>
              recipient.includes(query)
            ) || (content as SingleConversation).recipient?.includes(query)
          );
        })
      : [];

  const contactResults =
    query && contacts
      ? contacts.filter(
          (contact) =>
            contact.odinId &&
            (contact.odinId?.includes(query) || contact.name?.displayName.includes(query))
        )
      : [];

  const contactsWithoutAConversation = contactResults.filter(
    (contact) =>
      contact.odinId &&
      !conversationResults.some((conversation) => {
        const content = conversation.fileMetadata.appData.content;
        return (content as SingleConversation).recipient === contact.odinId;
      })
  );

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
            type="mute"
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
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                navigate(`${CHAT_ROOT}/new-group`);
              }}
              className="flex w-full flex-row items-center gap-3 px-5 py-2 hover:bg-primary/20"
            >
              <div className="rounded-full bg-primary/20 p-4">
                <Persons className="h-4 w-4" />
              </div>
              {t('New group')}
            </button>

            {!conversationResults?.length && !contactsWithoutAConversation?.length ? (
              <SubtleMessage className="px-5">{t('No contacts found')}</SubtleMessage>
            ) : (
              <>
                {conversationResults?.length ? (
                  <p className="mt-2 px-5 font-semibold">{t('Chats')}</p>
                ) : null}
                {conversationResults.map((result) => (
                  <ConversationListItem
                    conversation={result}
                    onClick={() => openConversation(result.fileMetadata.appData.uniqueId)}
                    isActive={
                      activeConversationId ===
                      (result as DriveSearchResult<Conversation>).fileMetadata?.appData?.uniqueId
                    }
                    key={result.fileId}
                  />
                ))}
                {contactsWithoutAConversation?.length ? (
                  <p className="mt-2 px-5 font-semibold">{t('Contacts')}</p>
                ) : null}
                {contactsWithoutAConversation.map((result) => (
                  <NewConversationSearchResult
                    onOpen={(id) => openConversation(id)}
                    result={result as ContactFile}
                    key={result.fileId}
                  />
                ))}
              </>
            )}
          </>
        ) : null}
      </div>
    </>
  );
};

export const NewConversationSearchResult = ({
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
      const result = await createNew({ recipients: [odinId] });
      onOpen(result.newConversationId);
    } catch (e) {
      console.error(e);
    }
  };

  return <SingleConversationItem odinId={odinId} isActive={false} onClick={onClick} />;
};
