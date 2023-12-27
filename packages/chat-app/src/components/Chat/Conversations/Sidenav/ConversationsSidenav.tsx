import {
  ActionButton,
  Input,
  MagnifyingGlass,
  Persons,
  SubtleMessage,
  Times,
  t,
  useAllContacts,
} from '@youfoundation/common-app';

import { useEffect, useState } from 'react';
import { ContactFile } from '@youfoundation/js-lib/network';

import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '../../../../hooks/chat/useConversations';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Conversation,
  ConversationWithYourselfId,
  GroupConversation,
  SingleConversation,
} from '../../../../providers/ConversationProvider';
import { CHAT_ROOT } from '../../../../templates/Chat/ChatHome';
import {
  GroupConversationItem,
  SingleConversationItem,
  ConversationListItemWrapper,
  ConversationWithYourselfItem,
} from '../Item/ConversationItem';
import { NewConversationSearchItem } from '../Item/NewConversationSearchItem';

export const ConversationsSidebar = ({
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
    <div className="flex flex-grow flex-col overflow-auto">
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
        <ConversationList
          openConversation={(id) => openConversation(id)}
          conversations={flatConversations.filter(
            (chat) =>
              chat.fileMetadata.appData.archivalStatus !== 2 ||
              chat.fileMetadata.appData.uniqueId === activeConversationId
          )}
          activeConversationId={activeConversationId}
        />
      ) : null}
    </div>
  );
};

const ConversationList = ({
  conversations,
  openConversation,
  activeConversationId,
}: {
  conversations: DriveSearchResult<Conversation>[];
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
}) => {
  return (
    <div className="flex-grow overflow-auto ">
      <ConversationListItemWithYourself
        onClick={() => openConversation(ConversationWithYourselfId)}
        isActive={stringGuidsEqual(activeConversationId, ConversationWithYourselfId)}
      />
      {!conversations?.length ? (
        <SubtleMessage className="px-5">{t('No conversations found')}</SubtleMessage>
      ) : null}
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
      ))}
    </div>
  );
};

const ConversationListItemWithYourself = ({
  onClick,
  isActive,
}: {
  onClick: () => void;
  isActive: boolean;
}) => {
  return <ConversationWithYourselfItem onClick={onClick} isActive={isActive} />;
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
      ? contacts
          .map((contact) => contact.fileMetadata.appData.content)
          .filter(
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
            <ConversationListItemWrapper
              onClick={() => {
                navigate(`${CHAT_ROOT}/new-group`);
              }}
              isActive={false}
            >
              <div className="rounded-full bg-primary/20 p-4">
                <Persons className="h-4 w-4" />
              </div>
              {t('New group')}
            </ConversationListItemWrapper>

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
                  <NewConversationSearchItem
                    onOpen={(id) => openConversation(id)}
                    result={result as ContactFile}
                    key={result.odinId}
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
