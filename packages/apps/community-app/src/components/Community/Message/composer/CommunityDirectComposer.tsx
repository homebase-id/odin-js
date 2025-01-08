import {
  ActionButton,
  ellipsisAtMaxChar,
  FileOverview,
  FileSelector,
  getImagesFromPasteEvent,
  getTextRootsRecursive,
  LinkOverview,
  t,
  trimRichText,
  useErrors,
  useLinkPreviewBuilder,
  VolatileInputRef,
} from '@homebase-id/common-app';
import { useState, FC, useRef, lazy, useMemo, useCallback } from 'react';

import { getNewId, isTouchDevice } from '@homebase-id/js-lib/helpers';
import { ChatComposerProps } from '@homebase-id/chat-app/src/components/Chat/Composer/ChatComposer';
import { HomebaseFile, NewMediaFile, RichText } from '@homebase-id/js-lib/core';
import { useChatMessage } from '@homebase-id/chat-app/src/hooks/chat/useChatMessage';
import { Plus, PaperPlane, Times } from '@homebase-id/common-app/icons';
import { LinkPreview } from '@homebase-id/js-lib/media';
const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RichTextEditor,
  }))
);
import { EmbeddedMessage } from '@homebase-id/chat-app/src/components/Chat/Detail/EmbeddedMessage';
import { ChatMessage } from '@homebase-id/chat-app/src/providers/ChatProvider';
import { useParams } from 'react-router-dom';
import { DraftSaver } from './DraftSaver';
import { useCommunity } from '../../../../hooks/community/useCommunity';
import { useMessageDraft } from './useMessageDraft';

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;

export const CommunityDirectComposer: FC<ChatComposerProps> = ({
  conversation,
  clearReplyMsg,
  replyMsg,
  onSend,
}) => {
  const { odinKey, communityKey } = useParams();
  const volatileRef = useRef<VolatileInputRef>(null);

  const { data: community } = useCommunity({
    odinId: odinKey,
    communityId: communityKey,
  }).fetch;

  const [message, setMessage] = useState<RichText | undefined>(undefined);
  const [files, setFiles] = useState<NewMediaFile[]>();

  const draft = useMessageDraft(
    !message
      ? {
          community,
          draftKey: conversation?.fileMetadata.appData.uniqueId,
        }
      : undefined
  );

  const plainMessage = useMemo(
    () =>
      ((message || draft?.message) && getTextRootsRecursive(message || draft?.message).join(' ')) ||
      '',
    [message, draft]
  );
  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(plainMessage || '');

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useChatMessage().send;

  const conversationContent = conversation?.fileMetadata.appData.content;
  const doSend = async () => {
    const toSendMessage = message || draft?.message;

    const trimmedVal = plainMessage?.trim();
    const replyId = replyMsg?.fileMetadata.appData.uniqueId;
    const newFiles = [...(files || [])];

    if (
      (!trimmedVal && !files?.length) ||
      !conversationContent ||
      !conversation.fileMetadata.appData.uniqueId
    )
      return;

    // Clear internal state and allow excessive senders
    setMessage([]);
    setFiles([]);
    volatileRef.current?.clear();
    volatileRef.current?.focus();
    clearReplyMsg();

    try {
      await sendMessage({
        conversation,
        message: trimRichText(toSendMessage) || '',
        replyId: replyId,
        files: newFiles,
        chatId: getNewId(),
        userDate: new Date().getTime(),
        linkPreviews: Object.values(linkPreviews).filter(Boolean) as LinkPreview[],
        tags: communityKey ? [communityKey] : undefined,
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

  const changeHandler = useCallback(
    (newVal: {
      target: {
        name: string;
        value: RichText;
      };
    }) => setMessage(newVal.target.value),
    []
  );

  const onSubmit = useMemo(() => (isTouchDevice() ? undefined : doSend), [doSend]);

  return (
    <>
      <DraftSaver
        community={community}
        draftKey={conversation?.fileMetadata.appData.uniqueId}
        message={message || draft?.message}
      />

      <div className={`bg-background pb-[env(safe-area-inset-bottom)]`}>
        <div
          className="flex flex-shrink-0 flex-row gap-2 px-0 md:px-3 md:pb-2 lg:pb-5"
          data-default-value={message}
          onPaste={(e) => {
            const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));

            if (mediaFiles.length) {
              setFiles([...(files ?? []), ...mediaFiles]);
              e.preventDefault();
            }
          }}
        >
          <RichTextEditor
            className="relative w-8 flex-grow border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border"
            contentClassName="max-h-[50vh] overflow-auto"
            onChange={changeHandler}
            defaultValue={message || draft?.message}
            autoFocus={!isTouchDevice()}
            onSubmit={onSubmit}
            placeholder={t('Your message')}
            ref={volatileRef}
          >
            <div className="max-h-[30vh] overflow-auto">
              {replyMsg ? <MessageForReply msg={replyMsg} onClear={clearReplyMsg} /> : null}
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
            <div className="-mx-1 flex flex-row justify-between">
              <FileSelector
                onChange={(files) => setFiles(files.map((file) => ({ file })))}
                className="my-auto px-2 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
                accept="image/png, image/jpeg, image/tiff, image/webp, image/svg+xml, image/gif, video/mp4, audio/mp3, application/pdf"
                maxSize={HUNDRED_MEGA_BYTES}
              >
                <Plus className="h-5 w-5" />
              </FileSelector>
              <span className="my-auto">
                <ActionButton
                  type="mute"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    doSend();
                  }}
                  className={`flex-shrink opacity-40 ${!message && !files?.length ? '' : 'hover:opacity-100'}`}
                  icon={PaperPlane}
                  size="square"
                  disabled={!message && !files?.length}
                  onMouseDown={(e) => e.preventDefault()}
                />
              </span>
            </div>
          </RichTextEditor>
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
    <div className="flex flex-row gap-2 py-3">
      <EmbeddedMessage msg={msg} />
      <ActionButton icon={Times} type="mute" onClick={onClear}></ActionButton>
    </div>
  );
};
