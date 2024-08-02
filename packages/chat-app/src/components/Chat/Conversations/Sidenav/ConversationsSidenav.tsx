import {
  ActionButton,
  ActionLink,
  ErrorBoundary,
  Input,
  MagnifyingGlass,
  Persons,
  Plus,
  SubtleMessage,
  Times,
  t,
  useAllContacts,
  useDotYouClient,
} from '@youfoundation/common-app';

import { useEffect, useState } from 'react';
import { ContactFile } from '@youfoundation/js-lib/network';

import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '../../../../hooks/chat/useConversations';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
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
      ?.flatMap((page) => page?.searchResults)
      ?.filter(Boolean) as HomebaseFile<UnifiedConversation>[]) || [];

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

const ConversationList = ({
  conversations,
  openConversation,
  activeConversationId,
}: {
  conversations: HomebaseFile<UnifiedConversation>[];
  openConversation: (id: string | undefined) => void;
  activeConversationId: string | undefined;
}) => {
  const { data: contacts } = useAllContacts(!conversations || !conversations?.length);
  const noContacts = !contacts || contacts.length === 0;

  return (
    <div className="flex flex-grow flex-col">
      <div className="flex flex-grow flex-col">
        <ConversationListItemWithYourself
          onClick={() => openConversation(ConversationWithYourselfId)}
          isActive={stringGuidsEqual(activeConversationId, ConversationWithYourselfId)}
        />
        {!conversations?.length ? (
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

                <ActionLink
                  href={`${CHAT_ROOT}/new`}
                  icon={Plus}
                  type="secondary"
                  className="ml-auto"
                >
                  {t('New conversation')}
                </ActionLink>
              </>
            )}
          </div>
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
      {conversations?.length && conversations?.length < 15 ? (
        <div className="flex flex-row justify-center p-5">
          <ActionLink href={`${CHAT_ROOT}/new`} icon={Plus} type="secondary">
            {t('New conversation')}
          </ActionLink>
        </div>
      ) : null}
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
  conversation: HomebaseFile<UnifiedConversation>;
  onClick: () => void;
  isActive: boolean;
}) => {
  const identity = useDotYouClient().getIdentity();
  const recipients = conversation.fileMetadata.appData.content.recipients.filter(
    (recipient) => recipient !== identity
  );

  if (recipients && recipients.length > 1)
    return (
      <GroupConversationItem
        onClick={onClick}
        title={conversation.fileMetadata.appData.content.title}
        conversationId={conversation.fileMetadata.appData.uniqueId}
        isActive={isActive}
      />
    );

  return (
    <SingleConversationItem
      onClick={onClick}
      odinId={recipients[0]}
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
  conversations: HomebaseFile<UnifiedConversation>[];
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
            content.recipients?.some((recipient) => recipient?.toLowerCase().includes(query)) ||
            content.title?.toLowerCase().includes(query)
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
              (contact.odinId?.toLowerCase().includes(query) ||
                contact.name?.displayName?.toLowerCase().includes(query))
          )
      : [];

  const contactsWithoutAConversation = contactResults.filter(
    (contact) =>
      contact.odinId &&
      !conversationResults.some((conversation) => {
        const content = conversation.fileMetadata.appData.content;
        return content.recipients.includes(contact.odinId as string);
      })
  );

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-row gap-1 px-2 pb-2 pt-1 lg:px-5 lg:pb-5 lg:pt-3">
          <Input
            onChange={(e) => setQuery(e.target.value?.toLowerCase())}
            onKeyDown={(e) => e.key === 'Escape' && setIsSearchActive(false)}
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
              order={1}
              onClick={() => {
                navigate(`${CHAT_ROOT}/new-group`);
              }}
              isActive={false}
            >
              <div className="rounded-full bg-primary/20 p-4">
                <Persons className="h-5 w-5" />
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
                      (result as HomebaseFile<UnifiedConversation>).fileMetadata?.appData?.uniqueId
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
