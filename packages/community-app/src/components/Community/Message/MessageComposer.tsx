import {
  FileOverview,
  EmojiSelector,
  FileSelector,
  VolatileInput,
  ActionButton,
  PaperPlane,
  getImagesFromPasteEvent,
  Plus,
  useErrors,
  t,
  ellipsisAtMaxChar,
  VolatileInputRef,
  LinkOverview,
  useLinkPreviewBuilder,
} from '@youfoundation/common-app';
import { HomebaseFile, NewMediaFile } from '@youfoundation/js-lib/core';

import { useState, useEffect, useRef } from 'react';

import { getNewId, isTouchDevice } from '@youfoundation/js-lib/helpers';
import { LinkPreview } from '@youfoundation/js-lib/media';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { ChannelAutocompleteDropdown } from './ChannelAutocompleteDropdown';

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;
const CHAT_DRAFTS_KEY = 'COMMUNITY_LOCAL_DRAFTS';

export const MessageComposer = ({
  community,
  channel,
  groupId,
  onSend,
  className,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  groupId: string | undefined;
  onSend?: () => void;
  className?: string;
}) => {
  const volatileRef = useRef<VolatileInputRef>(null);

  const drafts = JSON.parse(localStorage.getItem(CHAT_DRAFTS_KEY) || '{}');
  const [message, setMessage] = useState<string | undefined>(
    groupId ? drafts[groupId] || undefined : undefined
  );
  const [files, setFiles] = useState<NewMediaFile[]>();

  useEffect(() => {
    if (groupId) {
      drafts[groupId] = message;
      try {
        localStorage.setItem(CHAT_DRAFTS_KEY, JSON.stringify(drafts));
      } catch (e) {
        /* empty */
      }
    }
  }, [groupId, message]);

  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(message || '');

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useCommunityMessage().send;

  const doSend = async (forcedVal?: string) => {
    const trimmedVal = (forcedVal || message)?.trim();
    const newFiles = [...(files || [])];

    if ((!trimmedVal && !files?.length) || !community || !channel) return;

    // Clear internal state and allow excessive senders
    setMessage('');
    setFiles([]);
    volatileRef.current?.clear();

    try {
      await sendMessage({
        community,
        channel,
        groupId,
        message: trimmedVal || '',
        files: newFiles,
        chatId: getNewId(),
        userDate: new Date().getTime(),
        linkPreviews: Object.values(linkPreviews).filter(Boolean) as LinkPreview[],
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

  return (
    <>
      <div className={`bg-background pb-[env(safe-area-inset-bottom)] ${className || ''}`}>
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
            placeholder={
              community?.fileMetadata.appData.uniqueId === groupId
                ? `Message "${community?.fileMetadata.appData.content.title}"`
                : `Reply`
            }
            defaultValue={message}
            className="relative w-8 flex-grow rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={(newVal) => setMessage(newVal)}
            autoFocus={!isTouchDevice()}
            ref={volatileRef}
            onPaste={(e) => {
              const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));

              if (mediaFiles.length) {
                setFiles([...(files ?? []), ...mediaFiles]);
                e.preventDefault();
              }
            }}
            onSubmit={isTouchDevice() ? undefined : doSend}
            autoCompleters={[ChannelAutocompleteDropdown]}
          />
          <span className="my-auto">
            <ActionButton
              type="mute"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                doSend();
              }}
              className="flex-shrink opacity-40 hover:opacity-100"
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
