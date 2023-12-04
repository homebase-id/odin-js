import {
  ErrorNotification,
  FileOverview,
  EmojiSelector,
  FileSelector,
  ImageIcon,
  VolatileInput,
  ActionButton,
  t,
  Times,
} from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { NewMediaFile } from '@youfoundation/js-lib/dist';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';
import {
  Conversation,
  GroupConversation,
  SingleConversation,
} from '../../../providers/ConversationProvider';
import { useState, useEffect } from 'react';
import { EmbeddedMessage } from '../Detail/EmbeddedMessage';

export const ChatComposer = ({
  conversation,
  replyMsg,
  clearReplyMsg,
}: {
  conversation: DriveSearchResult<Conversation> | undefined;
  replyMsg: DriveSearchResult<ChatMessage> | undefined;
  clearReplyMsg: () => void;
}) => {
  const [stateIndex, setStateIndex] = useState(0); // Used to force a re-render of the component, to reset the input
  const [message, setMessage] = useState<string | undefined>();
  const [files, setFiles] = useState<NewMediaFile[]>();

  const {
    mutate: sendMessage,
    status: sendMessageState,
    reset: resetState,
    error: sendMessageError,
  } = useChatMessage().send;

  const conversationContent = conversation?.fileMetadata.appData.content;
  const doSend = () => {
    if ((!message && !files) || !conversationContent || !conversation.fileMetadata.appData.uniqueId)
      return;
    sendMessage({
      conversationId: conversation.fileMetadata.appData.uniqueId as string,
      message: message || '',
      replyId: replyMsg?.fileMetadata?.appData?.uniqueId,
      files,
      recipients: (conversationContent as GroupConversation).recipients || [
        (conversationContent as SingleConversation).recipient,
      ],
    });
  };

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMessageState === 'success') {
      setMessage('');
      setStateIndex((oldIndex) => oldIndex + 1);
      setFiles([]);
      clearReplyMsg();
      resetState();
    }
  }, [sendMessageState]);

  useEffect(() => {
    if (replyMsg) setFiles([]);
  }, [replyMsg]);

  useEffect(() => {
    if (files?.length) clearReplyMsg();
  }, [files]);

  return (
    <>
      <ErrorNotification error={sendMessageError} />
      <div className="bg-page-background">
        <FileOverview files={files} setFiles={setFiles} className="mt-2" />
        {replyMsg ? <MessageForReply msg={replyMsg} onClear={clearReplyMsg} /> : null}
        <div className="flex flex-shrink-0 flex-row gap-2 px-5 py-3">
          <div className="my-auto flex flex-row items-center gap-1">
            <EmojiSelector
              size="none"
              className="px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
              onInput={(val) => setMessage((oldVal) => (oldVal ? `${oldVal} ${val}` : val))}
            />
            <FileSelector
              onChange={(files) => setFiles(files.map((file) => ({ file })))}
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
            autoFocus={true}
            onSubmit={(val) => {
              setMessage(val);
              doSend();
            }}
          />
          <ActionButton
            type="secondary"
            onClick={doSend}
            state={sendMessageState}
            className="mt-auto"
          >
            {t('Send')}
          </ActionButton>
        </div>
      </div>
    </>
  );
};

const MessageForReply = ({
  msg,
  onClear,
}: {
  msg: DriveSearchResult<ChatMessage>;
  onClear: () => void;
}) => {
  return (
    <div className="flex flex-row gap-2 px-5 py-3">
      <EmbeddedMessage msg={msg} />
      <ActionButton icon={Times} type="mute" onClick={onClear}></ActionButton>
    </div>
  );
};
