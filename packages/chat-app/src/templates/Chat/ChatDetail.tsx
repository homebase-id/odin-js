import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  EmojiSelector,
  ErrorNotification,
  FileSelector,
  ImageIcon,
  VolatileInput,
  t,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Conversation,
  ChatMessage,
  GroupConversation,
  SingleConversation,
} from '../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { useConversation } from '../../hooks/chat/useConversation';
import { useChatMessage } from '../../hooks/chat/useChatMessage';
import { useChatMessages } from '../../hooks/chat/useChatMessages';

export const ChatDetail = ({ conversationId }: { conversationId: string | undefined }) => {
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
