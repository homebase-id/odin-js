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
  findMentionedInRichText,
  trimRichText,
  useDebounce,
} from '@homebase-id/common-app';
import { PaperPlane, Plus } from '@homebase-id/common-app/icons';
import { HomebaseFile, NewHomebaseFile, NewMediaFile, RichText } from '@homebase-id/js-lib/core';

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';

import { getNewId, isTouchDevice } from '@homebase-id/js-lib/helpers';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useCommunityMessage } from '../../../../hooks/community/messages/useCommunityMessage';
import { useCommunityMetadata } from '../../../../hooks/community/useCommunityMetadata';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { CommunityMetadata, Draft } from '../../../../providers/CommunityMetadataProvider';
import { CommunityChannel } from '../../../../providers/CommunityProvider';
import { ChannelPlugin } from '../RTEChannelDropdown/RTEChannelDropdownPlugin';

const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RichTextEditor,
  }))
);

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;
export const MessageComposer = ({
  community,
  channel,
  thread,
  threadParticipants,
  onSend,
  onKeyDown,
  className,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  thread?: HomebaseFile<CommunityMessage> | undefined;
  threadParticipants?: string[];
  onSend?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}) => {
  const threadId = thread?.fileMetadata.globalTransitId;
  const volatileRef = useRef<VolatileInputRef>(null);

  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
  });

  const [toSaveMeta, setToSaveMeta] = useState<
    HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata> | undefined
  >();
  const drafts = (toSaveMeta || metadata)?.fileMetadata.appData.content.drafts || {};
  const [message, setMessage] = useState<RichText | undefined>(
    threadId || (channel && channel.fileMetadata.appData.uniqueId)
      ? drafts[(threadId || channel?.fileMetadata.appData.uniqueId) as string]?.message
      : undefined
  );

  const [files, setFiles] = useState<NewMediaFile[]>();

  const instantSave = (
    toSaveMeta: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata>
  ) => updateMetadata({ metadata: toSaveMeta });
  const debouncedSave = useDebounce(() => toSaveMeta && updateMetadata({ metadata: toSaveMeta }), {
    timeoutMillis: 2000,
  });
  useEffect(() => {
    if (metadata && (threadId || (channel && channel.fileMetadata.appData.uniqueId))) {
      if (
        drafts[threadId || ((channel && channel.fileMetadata.appData.uniqueId) as string)]
          ?.message === message
      )
        return;

      const newDrafts: Record<string, Draft | undefined> = {
        ...drafts,
        [threadId || ((channel && channel.fileMetadata.appData.uniqueId) as string)]: {
          message,
          updatedAt: new Date().getTime(),
        },
      };

      const newMeta: NewHomebaseFile<CommunityMetadata> | HomebaseFile<CommunityMetadata> = {
        ...metadata,
        fileMetadata: {
          ...metadata?.fileMetadata,
          appData: {
            ...metadata?.fileMetadata.appData,
            content: { ...metadata?.fileMetadata.appData.content, drafts: newDrafts },
          },
        },
      };

      if (message === undefined) {
        instantSave(newMeta);
        return;
      }
      setToSaveMeta(newMeta);
      debouncedSave();
    }
  }, [threadId, channel, message, debouncedSave]);

  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(
    (message && getTextRootsRecursive(message)?.join(' ')) || ''
  );

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useCommunityMessage().send;

  const doSend = async () => {
    const plainVal = (message && getTextRootsRecursive(message).join(' ')) || '';
    const newFiles = [...(files || [])];

    if (((!message || !plainVal) && !files?.length) || !community || !channel) return;

    // Clear internal state and allow excessive senders
    setMessage(undefined);
    setFiles([]);
    volatileRef.current?.clear();
    volatileRef.current?.focus();

    const mentionedOdinIds = findMentionedInRichText(message);
    const extendedParticipants = mentionedOdinIds.includes('@channel')
      ? community.fileMetadata.appData.content.members
      : Array.from(new Set(threadParticipants?.concat(mentionedOdinIds) || mentionedOdinIds));

    try {
      await sendMessage({
        community,
        channel,
        thread,
        threadParticipants: extendedParticipants,
        message: trimRichText(message),
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
  const mentionables: { key: string; text: string }[] = useMemo(() => {
    const filteredContacts =
      (contacts
        ?.filter(
          (contact) =>
            contact.fileMetadata.appData.content.odinId &&
            community?.fileMetadata.appData.content.members.includes(
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
        .filter(Boolean) as { key: string; text: string }[]) || [];

    filteredContacts.push({ key: '@channel', text: '@channel' });
    return filteredContacts;
  }, [contacts]);

  const plainMessage = useMemo(
    () => (message && getTextRootsRecursive(message).join(' ')) || '',
    [message]
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
          <Suspense>
            <RichTextEditor
              className="relative w-8 flex-grow border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border"
              contentClassName="max-h-[50vh] overflow-auto"
              onChange={(newVal) => setMessage(newVal.target.value)}
              defaultValue={message}
              placeholder={
                threadId
                  ? t(`Reply...`)
                  : channel?.fileMetadata.appData.content.title
                    ? `${t('Message')} # ${channel.fileMetadata.appData.content.title}`
                    : `${t('Message')} "${community?.fileMetadata.appData.content.title}"`
              }
              autoFocus={!isTouchDevice()}
              ref={volatileRef}
              onSubmit={isTouchDevice() ? undefined : doSend}
              onKeyDown={onKeyDown}
              disableHeadings={true}
              mentionables={mentionables}
              plugins={[
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ChannelPlugin.configure({ options: { insertSpaceAfterChannel: true } } as any),
              ]}
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
                  accept="*"
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
                    className={`flex-shrink opacity-40 transition-colors ${!plainMessage && !files?.length ? '' : 'bg-primary text-primary-contrast opacity-90 hover:opacity-100'}`}
                    icon={PaperPlane}
                    size="square"
                    disabled={!plainMessage && !files?.length}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                </span>
              </div>
            </RichTextEditor>
          </Suspense>
        </div>
      </div>
    </>
  );
};
