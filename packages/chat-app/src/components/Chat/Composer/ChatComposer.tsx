import {
  ErrorNotification,
  FileOverview,
  EmojiSelector,
  FileSelector,
  ImageIcon,
  VolatileInput,
  ActionButton,
  Times,
  PaperPlane,
  getImagesFromPasteEvent,
} from '@youfoundation/common-app';
import { HomebaseFile, NewMediaFile } from '@youfoundation/js-lib/core';

import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';
import { Conversation } from '../../../providers/ConversationProvider';
import { useState, useEffect } from 'react';
import { EmbeddedMessage } from '../Detail/EmbeddedMessage';
import { isTouchDevice } from '@youfoundation/js-lib/helpers';

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;

export const ChatComposer = ({
  conversation,
  replyMsg,
  clearReplyMsg,
  onSend,
}: {
  conversation: HomebaseFile<Conversation> | undefined;
  replyMsg: HomebaseFile<ChatMessage> | undefined;
  clearReplyMsg: () => void;
  onSend?: () => void;
}) => {
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
    if (
      (!message?.trim() && !files) ||
      !conversationContent ||
      !conversation.fileMetadata.appData.uniqueId
    )
      return;

    sendMessage({
      conversation,
      message: message?.trim() || '',
      replyId: replyMsg?.fileMetadata?.appData?.uniqueId,
      files,
    });
    onSend && onSend();
  };

  // Reset state, when the message was sent successfully
  useEffect(() => {
    if (sendMessageState === 'pending') {
      setMessage('');
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
      <div className="bg-page-background pb-[env(safe-area-inset-bottom)]">
        <div className="max-h-[30vh] overflow-auto">
          <FileOverview files={files} setFiles={setFiles} cols={8} />
        </div>
        {replyMsg ? <MessageForReply msg={replyMsg} onClear={clearReplyMsg} /> : null}
        <div className="flex flex-shrink-0 flex-row gap-2 px-2 py-3 md:px-5">
          <div className="my-auto flex flex-row items-center gap-1">
            <EmojiSelector
              size="none"
              className="px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
              onInput={(val) => setMessage((oldVal) => (oldVal ? `${oldVal} ${val}` : val))}
            />
            <FileSelector
              onChange={(files) => setFiles(files.map((file) => ({ file })))}
              className="px-2 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
              accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif, video/mp4, audio/mp3"
              maxSize={HUNDRED_MEGA_BYTES}
            >
              <ImageIcon className="h-5 w-5" />
            </FileSelector>
          </div>

          <VolatileInput
            placeholder="Your message"
            defaultValue={message}
            className="w-8 flex-grow rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={setMessage}
            autoFocus={!isTouchDevice()}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));

              if (mediaFiles.length) {
                setFiles([...(files ?? []), ...mediaFiles]);
                e.preventDefault();
              }
            }}
            onSubmit={
              isTouchDevice()
                ? undefined
                : (val) => {
                    setMessage(val);
                    doSend();
                  }
            }
          />
          <span className="my-auto">
            <ActionButton
              type="mute"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                doSend();
              }}
              state={sendMessageState}
              className="flex-shrink"
              icon={PaperPlane}
              size="square"
              onMouseDown={(e) => e.preventDefault()}
            />
          </span>
        </div>
      </div>
    </>
  );
};

const MessageForReply = ({
  msg,
  onClear,
}: {
  msg: HomebaseFile<ChatMessage>;
  onClear: () => void;
}) => {
  return (
    <div className="flex flex-row gap-2 px-5 py-3">
      <EmbeddedMessage msg={msg} />
      <ActionButton icon={Times} type="mute" onClick={onClear}></ActionButton>
    </div>
  );
};
