import {
  ActionButton,
  ellipsisAtMaxChar,
  FileOverview,
  FileSelector,
  getImagesFromPasteEvent,
  getPlainTextFromRichText,
  LinkOverview,
  t,
  trimRichText,
  useErrors,
  useLinkPreviewBuilder,
  VolatileInputRef,
} from '@homebase-id/common-app';
import { useState, FC, useRef, lazy, useMemo, useCallback, useEffect, Suspense, memo } from 'react';

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

export const CommunityDirectComposer: FC<ChatComposerProps> = memo(
  ({ conversation, clearReplyMsg, replyMsg, onSend }) => {
    const { odinKey, communityKey } = useParams();

    const formRef = useRef<HTMLFormElement>(null);
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

    const addError = useErrors().add;
    const { mutateAsync: sendMessage } = useChatMessage().send;

    const doSend = async () => {
      const toSendMessage = message || draft?.message;

      const trimmedVal = getPlainTextFromRichText(toSendMessage) || '';
      const replyId = replyMsg?.fileMetadata.appData.uniqueId;
      const newFiles = [...(files || [])];

      if (!conversation || (!trimmedVal && !files?.length)) return;

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

    const plainMessage = useMemo(
      () => getPlainTextFromRichText(message || draft?.message) || '',
      [message, draft]
    );
    const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(plainMessage || '');

    const changeHandler = useCallback(
      (newVal: {
        target: {
          name: string;
          value: RichText;
        };
      }) => setMessage(newVal.target.value),
      []
    );

    useEffect(() => {
      // focus, clear message to allow draft to be loaded
      const onFocus = () => setMessage(undefined);
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    });

    useEffect(() => {
      // When replying to a message, focus the input
      if (replyMsg) volatileRef.current?.focus();
    }, [replyMsg]);

    const isTouch = useMemo(isTouchDevice, [isTouchDevice]);
    const onRTESubmit = useMemo(
      () => (isTouch ? undefined : () => formRef.current?.requestSubmit()),
      [isTouch, formRef]
    );

    const canSend = useMemo(() => !!plainMessage || !!files?.length, [plainMessage, files]);
    const innerChildren = useMemo(() => {
      return (
        <>
          <div className="max-h-[30vh] overflow-auto">
            {replyMsg ? <MessageForReply msg={replyMsg} onClear={clearReplyMsg} /> : null}
            <FileOverview files={files} setFiles={setFiles} cols={8} />
            {files?.length ? null : (
              <LinkOverview
                linkPreviews={linkPreviews}
                setLinkPreviews={setLinkPreviews}
                cols={4}
                className="pt-2"
              />
            )}
          </div>
          <div className="-mx-1 flex flex-row justify-between md:pt-2">
            <FileSelector
              onChange={(files) => setFiles(files.map((file) => ({ file })))}
              className="my-auto px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
              accept="*"
              maxSize={HUNDRED_MEGA_BYTES}
            >
              <Plus className="h-5 w-5" />
            </FileSelector>
            <span className="my-auto">
              <ActionButton
                type="mute"
                className={`flex-shrink p-1 opacity-40 transition-colors ${!canSend ? '' : 'bg-primary text-primary-contrast opacity-90 hover:opacity-100'}`}
                icon={PaperPlane}
                size="none"
                disabled={!canSend}
                onMouseDown={(e) => e.preventDefault()}
              />
            </span>
          </div>
        </>
      );
    }, [files, setFiles, linkPreviews, setLinkPreviews, canSend, replyMsg, clearReplyMsg]);
    return (
      <>
        <DraftSaver
          community={community}
          draftKey={conversation?.fileMetadata.appData.uniqueId}
          message={message || draft?.message}
        />

        <div className={`bg-background pb-[env(safe-area-inset-bottom)]`}>
          <form
            className="flex flex-shrink-0 flex-row gap-2 px-0 md:px-3 md:pb-2 lg:pb-3"
            data-default-value={message}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));

              if (mediaFiles.length) {
                setFiles([...(files ?? []), ...mediaFiles]);
                e.preventDefault();
              }
            }}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();

              doSend();
            }}
            ref={formRef}
          >
            <Suspense
              fallback={
                <div className="relative h-[119px] w-full border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border" />
              }
            >
              <RichTextEditor
                className="relative w-8 flex-grow border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border"
                contentClassName="max-h-[50vh] overflow-auto"
                onChange={changeHandler}
                defaultValue={message || draft?.message}
                autoFocus={!isTouch}
                onSubmit={onRTESubmit}
                placeholder={t('Your message')}
                ref={volatileRef}
                key={draft?.updatedAt}
                children={innerChildren}
                disableHeadings={true}
              />
            </Suspense>
          </form>
        </div>
      </>
    );
  }
);

CommunityDirectComposer.displayName = 'CommunityDirectComposer';

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
