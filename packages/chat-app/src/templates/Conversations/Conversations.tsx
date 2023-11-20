import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  EmojiSelector,
  ErrorNotification,
  FileSelector,
  ImageIcon,
  Input,
  OwnerName,
  SubtleMessage,
  VolatileInput,
  t,
  useAllContacts,
  useDotYouClient,
  useSiteData,
} from '@youfoundation/common-app';
import { useConversations } from '../../hooks/chat/useConversations';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Conversation,
  ChatMessage,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { OdinImage } from '@youfoundation/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { ContactFile } from '@youfoundation/js-lib/network';
import React from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { useChatMessage } from '../../hooks/chat/useChatMessage';
import { useChatMessages } from '../../hooks/chat/useChatMessages';
import { useChatTransitProcessor } from '../../hooks/chat/useChatTransitProcessor';
import { useJoinConversation } from '../../hooks/chat/useJoinConversation';
import { useNavigate, useParams } from 'react-router-dom';

const ConversationsOverview = () => {
  useChatTransitProcessor(true);
  useJoinConversation();

  const { conversationKey } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <div className="h-screen w-full max-w-xs flex-shrink-0 border-r bg-page-background dark:border-r-slate-800">
        <ProfileHeader />
        <ConversationsList
          activeConversationId={conversationKey}
          openConversation={(newId) => navigate(`/${newId}`)}
        />
      </div>
      <div className="h-screen w-full flex-grow bg-background">
        <Chat conversationId={conversationKey} />
      </div>
    </div>
  );
};

const ProfileHeader = () => {
  const { data } = useSiteData();
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const odinId = getIdentity() || undefined;

  return (
    <div className="flex flex-row items-center gap-2 p-5">
      <OdinImage
        dotYouClient={dotYouClient}
        targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
        fileId={data?.owner.profileImageFileId}
        fileKey={data?.owner.profileImageFileKey}
        lastModified={data?.owner.profileImageLastModified}
        previewThumbnail={data?.owner.profileImagePreviewThumbnail}
        className="aspect-square max-h-[2.5rem] w-full max-w-[2.5rem] rounded-full border border-neutral-200 dark:border-neutral-800"
        fit="cover"
        odinId={odinId}
      />
      <OwnerName />
    </div>
  );
};

const ConversationsList = ({
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
          <Input onChange={(e) => setQuery(e.target.value)} />
          <ActionButton type="secondary">{t('Search')}</ActionButton>
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

const Chat = ({ conversationId }: { conversationId: string | undefined }) => {
  const { data: conversation } = useConversation({ conversationId }).single;

  if (!conversationId)
    return (
      <div className="flex h-full flex-grow flex-col items-center justify-center">
        <p className="text-4xl">Homebase Chat</p>
      </div>
    );

  return (
    <div className="flex h-screen flex-grow flex-col overflow-hidden">
      <ChatHeader conversation={conversation?.fileMetadata.appData.content} />
      <ChatHistory conversationId={conversation?.fileMetadata.appData.content?.conversationId} />
      <ChatComposer conversation={conversation?.fileMetadata.appData.content} />
    </div>
  );
};

const ChatHeader = ({
  conversation,
}: {
  conversation: Conversation | GroupConversation | undefined;
}) => {
  const recipients = (conversation as SingleConversation)?.recipient;

  return (
    <div className="flex flex-row items-center gap-2 bg-page-background p-5 ">
      <ConnectionImage
        odinId={recipients}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConnectionName odinId={recipients} />
    </div>
  );
};

const ChatHistory = ({ conversationId }: { conversationId: string | undefined }) => {
  const { data: messages } = useChatMessages({ conversationId }).all;
  const flattenedMsgs = messages?.pages.flatMap((page) => page.searchResults) || [];

  return (
    <div className="flex h-full flex-grow flex-col-reverse gap-2 overflow-auto p-5">
      {flattenedMsgs?.map((msg) =>
        msg ? <ChatMessageItem key={msg.fileId} msg={msg} isGroupChat={false} /> : null
      )}
    </div>
  );
};

const ChatMessageItem = ({
  msg,
  isGroupChat,
}: {
  msg: DriveSearchResult<ChatMessage>;
  isGroupChat: boolean;
}) => {
  const content = msg.fileMetadata.appData.content;
  const authorOdinId = msg.fileMetadata.senderOdinId;

  return (
    <div className={`flex gap-2 ${authorOdinId ? 'flex-row' : 'flex-row-reverse text-right'}`}>
      {isGroupChat && authorOdinId ? (
        <ConnectionImage
          odinId={authorOdinId}
          className="border border-neutral-200 dark:border-neutral-800"
          size="sm"
        />
      ) : null}

      <div
        className={`rounded-lg px-2 py-1 ${
          authorOdinId ? 'bg-gray-500/10  dark:bg-gray-300/20' : 'bg-primary/10 dark:bg-primary/30'
        }`}
      >
        {isGroupChat && authorOdinId ? <ConnectionName odinId={authorOdinId} /> : null}
        <p>{content.message.text}</p>
      </div>
    </div>
  );
};

const ChatComposer = ({
  conversation,
}: {
  conversation: Conversation | GroupConversation | undefined;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input
  const [message, setMessage] = useState<string | undefined>();

  const {
    mutate: sendMessage,
    status: sendMessageState,
    reset: resetState,
    error: sendMessageError,
  } = useChatMessage().send;
  const doSend = () => {
    if (!message || !conversation) return;
    sendMessage({
      conversationId: conversation.conversationId,
      message: { text: message },
      recipients: (conversation as GroupConversation).recipients || [
        (conversation as SingleConversation).recipient,
      ],
    });
  };

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMessageState === 'success') {
      setMessage('');
      setStateIndex((oldIndex) => oldIndex + 1);
      resetState();
    }
  }, [sendMessageState]);

  return (
    <>
      <ErrorNotification error={sendMessageError} />
      <div className="flex flex-shrink-0 flex-row gap-2 bg-page-background px-5 py-3">
        <div className="my-auto flex flex-row items-center gap-1">
          <EmojiSelector
            size="none"
            className="px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
            onInput={(val) => setMessage((oldVal) => `${oldVal} ${val}`)}
          />
          <FileSelector
            // onChange={(newFiles) => setAttachment(newFiles?.[0])}
            className="text-foreground text-opacity-30 hover:text-opacity-100"
          >
            <ImageIcon className="h-5 w-5" />
          </FileSelector>
        </div>
        <VolatileInput
          key={stateIndex}
          placeholder="Your message"
          defaultValue={message}
          className="rounded-md border bg-background p-2 dark:border-slate-800"
          onChange={setMessage}
          onSubmit={(val) => {
            setMessage(val);
            doSend();
          }}
        />
        <ActionButton type="secondary" onClick={doSend} state={sendMessageState}>
          {t('Send')}
        </ActionButton>
      </div>
    </>
  );
};

export default ConversationsOverview;
