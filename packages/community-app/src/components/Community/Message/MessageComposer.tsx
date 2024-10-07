import {
  FileOverview,
  FileSelector,
  ActionButton,
  getImagesFromPasteEvent,
  useErrors,
  t,
  ellipsisAtMaxChar,
  VolatileInputRef,
  LinkOverview,
  useLinkPreviewBuilder,
  getTextRootsRecursive,
  useAllContacts,
} from '@homebase-id/common-app';
import { PaperPlane, Plus } from '@homebase-id/common-app/icons';
import { HomebaseFile, NewMediaFile, RichText } from '@homebase-id/js-lib/core';

import { useState, useEffect, useRef, useMemo } from 'react';

import { getNewId, isTouchDevice, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useCommunityMessage } from '../../../hooks/community/messages/useCommunityMessage';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { RichTextEditor } from '@homebase-id/rich-text-editor';

import {
  ChannelPlugin,
  ELEMENT_CHANNEL,
  ELEMENT_CHANNEL_INPUT,
} from './RTEChannelDropdown/RTEChannelDropdownPlugin';
import { RTEChannelDropdownElement } from './RTEChannelDropdown/RTEChannelDropdownElement';
import { RTEChannelDropdownInputElement } from './RTEChannelDropdown/RTEChannelDropdownInputElement';

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
  const [message, setMessage] = useState<RichText | undefined>(
    groupId ? drafts[groupId] || undefined : undefined
  );

  const [files, setFiles] = useState<NewMediaFile[]>();

  useEffect(() => {
    if (groupId) {
      drafts[groupId] = message;
      try {
        localStorage.setItem(CHAT_DRAFTS_KEY, JSON.stringify(drafts));
      } catch {
        /* empty */
      }
    }
  }, [groupId, message]);

  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(
    (message && getTextRootsRecursive(message)?.join(' ')) || ''
  );

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useCommunityMessage().send;

  const doSend = async () => {
    const plainVal = (message && getTextRootsRecursive(message).join(' ')) || '';
    const newFiles = [...(files || [])];

    if (((!message || !plainVal) && !files?.length) || !community) return;

    // Clear internal state and allow excessive senders
    setMessage(undefined);
    setFiles([]);
    volatileRef.current?.clear();

    try {
      await sendMessage({
        community,
        channel,
        groupId,
        message: message || '',
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
        t('Your message "{0}" was not sent', ellipsisAtMaxChar(plainVal || '', 20) || '')
      );
    }
  };

  const { data: contacts } = useAllContacts(true);
  const mentionables: { key: string; text: string }[] = useMemo(
    () =>
      (contacts
        ?.filter(
          (contact) =>
            contact.fileMetadata.appData.content.odinId &&
            community?.fileMetadata.appData.content.recipients.includes(
              contact.fileMetadata.appData.content.odinId
            )
        )
        ?.map((contact) =>
          contact.fileMetadata.appData.content.odinId
            ? {
                key: contact.fileMetadata.appData.content.odinId,
                text: contact.fileMetadata.appData.content.odinId,
              }
            : undefined
        )
        .filter(Boolean) as { key: string; text: string }[]) || [],
    [contacts]
  );

  return (
    <>
      <div className={`bg-background pb-[env(safe-area-inset-bottom)] ${className || ''}`}>
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
            onChange={(newVal) => setMessage(newVal.target.value)}
            defaultValue={message}
            placeholder={
              !stringGuidsEqual(community?.fileMetadata.appData.uniqueId, groupId)
                ? t(`Reply...`)
                : channel?.fileMetadata.appData.content.title
                  ? `${t('Message')} # ${channel.fileMetadata.appData.content.title}`
                  : `${t('Message')} "${community?.fileMetadata.appData.content.title}"`
            }
            autoFocus={!isTouchDevice()}
            ref={volatileRef}
            onSubmit={isTouchDevice() ? undefined : doSend}
            disableHeadings={true}
            mentionables={mentionables}
            plugins={[ChannelPlugin]}
            components={{
              [ELEMENT_CHANNEL]: RTEChannelDropdownElement,
              [ELEMENT_CHANNEL_INPUT]: RTEChannelDropdownInputElement,
            }}
          >
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
                  isDisabled={!message && !files?.length}
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
