import {
  FileOverview,
  EmojiSelector,
  FileSelector,
  VolatileInput,
  ActionButton,
  getImagesFromPasteEvent,
  useErrors,
  t,
  ellipsisAtMaxChar,
  VolatileInputRef,
  LinkOverview,
  useLinkPreviewBuilder,
} from '@homebase-id/common-app';
import { HomebaseFile, NewMediaFile } from '@homebase-id/js-lib/core';

import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { ChatMessage } from '../../../providers/ChatProvider';
import { ConversationMetadata, UnifiedConversation } from '../../../providers/ConversationProvider';
import { useState, useEffect, useRef } from 'react';
import { EmbeddedMessage } from '../Detail/EmbeddedMessage';
import { getNewId, isTouchDevice } from '@homebase-id/js-lib/helpers';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { Plus, PaperPlane, Times } from '@homebase-id/common-app/icons';
import { ConversationMentionDropdown } from './ConversationMentionDropdown';

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;
const CHAT_DRAFTS_KEY = 'CHAT_LOCAL_DRAFTS';

export interface ChatComposerProps {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata> | undefined;
  replyMsg: HomebaseFile<ChatMessage> | undefined;
  clearReplyMsg: () => void;
  onSend?: () => void;
  tags?: string[];
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  conversation,
  replyMsg,
  clearReplyMsg,
  onSend,
  tags,
}) => {
  const volatileRef = useRef<VolatileInputRef>(null);

  const drafts = JSON.parse(localStorage.getItem(CHAT_DRAFTS_KEY) || '{}');
  const [message, setMessage] = useState<string | undefined>(
    conversation?.fileMetadata.appData.uniqueId
      ? drafts[conversation.fileMetadata.appData.uniqueId] || undefined
      : undefined
  );
  const [files, setFiles] = useState<NewMediaFile[]>();

  useEffect(() => {
    if (conversation?.fileMetadata.appData.uniqueId) {
      drafts[conversation.fileMetadata.appData.uniqueId] = message;
      try {
        localStorage.setItem(CHAT_DRAFTS_KEY, JSON.stringify(drafts));
      } catch {
        /* empty */
      }
    }
  }, [conversation, message]);

  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(message || '');

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useChatMessage().send;

  const conversationContent = conversation?.fileMetadata.appData.content;
  const doSend = async (forcedVal?: string) => {
    const trimmedVal = (forcedVal || message)?.trim();
    const replyId = replyMsg?.fileMetadata.appData.uniqueId;
    const newFiles = [...(files || [])];

    if (
      (!trimmedVal && !files?.length) ||
      !conversationContent ||
      !conversation.fileMetadata.appData.uniqueId
    )
      return;

    // Clear internal state and allow excessive senders
    setMessage('');
    setFiles([]);
    clearReplyMsg();
    volatileRef.current?.clear();

    try {
      await sendMessage({
        conversation,
        message: trimmedVal || '',
        replyId: replyId,
        files: newFiles,
        chatId: getNewId(),
        userDate: new Date().getTime(),
        linkPreviews: Object.values(linkPreviews).filter(Boolean) as LinkPreview[],
        tags,
      });
      onSend && onSend();
    } catch (err) {
      addError(
        err,
        t('Failed to send'),
        t('Your message "{0}" was not sent', ellipsisAtMaxChar(trimmedVal || '', 20) || '')
      );
    }
  };

  useEffect(() => {
    // When replying to a message, focus the input
    if (replyMsg) volatileRef.current?.focus();
  }, [replyMsg]);

  return (
    <>
      <div className="bg-page-background pb-[env(safe-area-inset-bottom)]">
        <div className="max-h-[30vh] overflow-auto">
          <FileOverview files={files} setFiles={setFiles} cols={8} />
          {files?.length ? null : (
            <LinkOverview
              linkPreviews={linkPreviews}
              setLinkPreviews={setLinkPreviews}
              cols={4}
              className="p-2"
            />
          )}
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
              accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif, video/mp4, audio/mp3, application/pdf"
              maxSize={HUNDRED_MEGA_BYTES}
            >
              <Plus className="h-5 w-5" />
            </FileSelector>
          </div>

          <VolatileInput
            placeholder="Your message"
            defaultValue={message}
            className="relative max-h-[50vh] w-8 flex-grow overflow-auto rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={(newVal) => setMessage(newVal)}
            autoFocus={!isTouchDevice()}
            ref={volatileRef}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));
              if (mediaFiles.length) {
                setFiles([
                  ...(files ?? []),
                  ...mediaFiles.filter(
                    (newFile) =>
                      !files?.some(
                        (oldFile) =>
                          (oldFile.file as File).name === newFile.file.name &&
                          (oldFile.file as File).size === newFile.file.size
                      )
                  ),
                ]);
                e.preventDefault();
              }
            }}
            onSubmit={isTouchDevice() ? undefined : doSend}
            autoCompleters={[ConversationMentionDropdown]}
          />
          <span className="my-auto">
            <ActionButton
              type="mute"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                doSend();
              }}
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
