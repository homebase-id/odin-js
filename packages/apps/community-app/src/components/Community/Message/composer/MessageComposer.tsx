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
  useAllContacts,
  findMentionedInRichText,
  trimRichText,
  getPlainTextFromRichText,
} from '@homebase-id/common-app';
import { PaperPlane, Plus } from '@homebase-id/common-app/icons';
import { HomebaseFile, NewMediaFile, RichText } from '@homebase-id/js-lib/core';

import { useState, useRef, useMemo, lazy, Suspense, useCallback, useEffect, memo } from 'react';

import { getNewId, isTouchDevice } from '@homebase-id/js-lib/helpers';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useCommunityMessage } from '../../../../hooks/community/messages/useCommunityMessage';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { CommunityChannel } from '../../../../providers/CommunityProvider';
import { ChannelPlugin } from '../RTEChannelDropdown/RTEChannelDropdownPlugin';
import { useMessageDraft } from './useMessageDraft';
import { DraftSaver } from './DraftSaver';
import React from 'react';
import type { Mentionable } from '@homebase-id/rich-text-editor';

const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RichTextEditor,
  }))
);

const HUNDRED_MEGA_BYTES = 100 * 1024 * 1024;
export const MessageComposer = memo(
  (props: {
    community: HomebaseFile<CommunityDefinition> | undefined;
    channel: HomebaseFile<CommunityChannel> | undefined;
    thread?: HomebaseFile<CommunityMessage> | undefined;
    threadParticipants?: string[];
    onKeyDown?: (e: React.KeyboardEvent) => void;
    autoFocus?: boolean;
    className?: string;
  }) => {
    const { community, channel, thread, threadParticipants, onKeyDown, className } = props;
    const autoFocus = props.autoFocus ?? true;

    const formRef = useRef<HTMLFormElement>(null);
    const volatileRef = useRef<VolatileInputRef>(null);

    const [message, setMessage] = useState<RichText | undefined>(undefined);
    const [files, setFiles] = useState<NewMediaFile[]>();
    const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(
      getPlainTextFromRichText(message) || ''
    );

    const draft = useMessageDraft(
      !message
        ? {
            community,
            draftKey:
              thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId,
          }
        : undefined
    );

    const addError = useErrors().add;
    const { mutateAsync: sendMessage } = useCommunityMessage().send;

    const doSend = useCallback(async () => {
      const toSendMessage = message || draft?.message;

      const trimmedVal = getPlainTextFromRichText(toSendMessage) || '';
      const newFiles = [...(files || [])];

      if (!community || !channel || (!trimmedVal && !files?.length)) return;

      // Clear internal state and allow excessive senders
      setMessage([]);
      setFiles([]);
      volatileRef.current?.clear();
      volatileRef.current?.focus();

      const mentionedOdinIds = findMentionedInRichText(toSendMessage);
      const extendedParticipants = mentionedOdinIds.includes('@channel')
        ? community.fileMetadata.appData.content.members
        : Array.from(new Set(threadParticipants?.concat(mentionedOdinIds) || mentionedOdinIds));

      try {
        await sendMessage({
          community,
          channel,
          thread,
          threadParticipants: extendedParticipants,
          message: trimRichText(toSendMessage),
          files: newFiles,
          chatId: getNewId(),
          userDate: new Date().getTime(),
          linkPreviews: Object.values(linkPreviews).filter(Boolean) as LinkPreview[],
        });
      } catch (err) {
        addError(
          err,
          t('Failed to send'),
          t('Your message "{0}" was not sent', ellipsisAtMaxChar(trimmedVal || '', 20) || '')
        );
      }
    }, [
      addError,
      channel,
      community,
      files,
      linkPreviews,
      message,
      sendMessage,
      thread,
      threadParticipants,
    ]);

    const { data: contacts } = useAllContacts(true);
    const mentionables: Mentionable[] = useMemo(() => {
      const filteredContacts =
        (contacts
          ?.filter(
            (contact) =>
              contact.fileMetadata.appData.content.odinId &&
              community?.fileMetadata.appData.content.members.includes(
                contact.fileMetadata.appData.content.odinId
              )
          )
          ?.map((contact) => {
            const content = contact.fileMetadata.appData.content;
            if (!content?.odinId) return;
            const name =
              content.name &&
              (content.name.displayName ??
                (content.name.givenName || content.name.surname
                  ? `${content.name.givenName ?? ''} ${content.name.surname ?? ''}`
                  : undefined));

            return {
              value: content.odinId,
              label: `${content.odinId} ${name ? `- ${name}` : ''}`,
            };
          })
          .filter(Boolean) as Mentionable[]) || [];

      filteredContacts.push({ value: '@channel', label: 'channel' });
      return filteredContacts;
    }, [contacts]);

    const plainMessage = useMemo(
      () => getPlainTextFromRichText(message || draft?.message) || '',
      [message, draft]
    );

    const changeHandler = useCallback(
      (newVal: {
        target: {
          name: string;
          value: RichText;
        };
      }) => setMessage(newVal.target.value),
      []
    );

    const plugins = useMemo(() => {
      return [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ChannelPlugin.configure({ options: { insertSpaceAfterChannel: true } } as any),
      ];
    }, []);

    useEffect(() => {
      // focus, clear message to allow draft to be loaded
      const onFocus = () => setMessage(undefined);
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    });

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
    }, [files, setFiles, linkPreviews, setLinkPreviews, canSend]);

    return (
      <>
        <DraftSaver
          community={community}
          draftKey={thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId}
          message={message || draft?.message}
        />
        <div className={`bg-background pb-[env(safe-area-inset-bottom)] ${className || ''}`}>
          <form
            className="flex flex-shrink-0 flex-row gap-2 px-0 md:px-3 md:pb-2 lg:pb-3"
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
                <div className="relative h-[111px] w-full border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border" />
              }
            >
              <RichTextEditor
                className="relative w-8 flex-grow border-t bg-background px-2 pb-1 dark:border-slate-800 md:rounded-md md:border"
                contentClassName="max-h-[50vh] overflow-auto"
                onChange={changeHandler}
                defaultValue={message || draft?.message}
                placeholder={
                  thread
                    ? t(`Reply...`)
                    : channel?.fileMetadata.appData.content.title
                      ? `${t('Message')} # ${channel.fileMetadata.appData.content.title}`
                      : `${t('Message')} "${community?.fileMetadata.appData.content.title}"`
                }
                autoFocus={!isTouch && autoFocus}
                ref={volatileRef}
                onSubmit={onRTESubmit}
                onKeyDown={onKeyDown}
                disableHeadings={true}
                mentionables={mentionables}
                plugins={plugins}
                uniqueId={
                  thread?.fileMetadata.globalTransitId || channel?.fileMetadata.appData.uniqueId
                }
                rteKey={draft?.updatedAt}
                children={innerChildren}
              />
            </Suspense>
          </form>
        </div>
      </>
    );
  }
);

MessageComposer.displayName = 'MessageComposer';
