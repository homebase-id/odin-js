import {
  ActionButton,
  CHAT_ROOT_PATH,
  Input,
  SubtleMessage,
  t,
  useAllContacts,
} from '@homebase-id/common-app';
import { MagnifyingGlass, Persons, Times } from '@homebase-id/common-app/icons';

import { useEffect, useState } from 'react';
import { ContactFile } from '@homebase-id/js-lib/network';

import { useNavigate } from 'react-router-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ConversationMetadata,
  UnifiedConversation,
} from '../../../../providers/ConversationProvider';
import { ConversationListItemWrapper } from '../Item/ConversationItem';
import { NewConversationSearchItem } from '../Item/NewConversationSearchItem';
import { ConversationListItem } from '../Item/ConversationListItem';

export const ConversationSearch = ({
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
  conversations: HomebaseFile<UnifiedConversation, ConversationMetadata>[];
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

      {isActive ? (
        <div>
          <ConversationListItemWrapper
            onClick={() => {
              navigate(`${CHAT_ROOT_PATH}/new-group`);
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
                    (result as HomebaseFile<UnifiedConversation, ConversationMetadata>).fileMetadata
                      ?.appData?.uniqueId
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
        </div>
      ) : null}
    </>
  );
};
