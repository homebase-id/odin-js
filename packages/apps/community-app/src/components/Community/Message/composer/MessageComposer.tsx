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

import { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';

import { getNewId, isTouchDevice } from '@homebase-id/js-lib/helpers';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { useCommunityMessage } from '../../../../hooks/community/messages/useCommunityMessage';
import { useCommunityMetadata } from '../../../../hooks/community/useCommunityMetadata';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { CommunityMetadata, Draft } from '../../../../providers/CommunityMetadataProvider';
import { CommunityChannel } from '../../../../providers/CommunityProvider';
import { ChannelPlugin } from '../RTEChannelDropdown/RTEChannelDropdownPlugin';
import { Mentionable } from '@homebase-id/rich-text-editor/src/components/plate-ui/mention-input-element';

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
  const volatileRef = useRef<VolatileInputRef>(null);

  const [message, setMessage] = useState<RichText | undefined>(undefined);
  const [files, setFiles] = useState<NewMediaFile[]>();
  const { linkPreviews, setLinkPreviews } = useLinkPreviewBuilder(
    (message && getTextRootsRecursive(message)?.join(' ')) || ''
  );

  const { draft, isLoaded: isDraftLoaded } = useMessageDraft(
    !message ? { community, channel, thread } : undefined
  );

  const addError = useErrors().add;
  const { mutateAsync: sendMessage } = useCommunityMessage().send;

  const doSend = useCallback(async () => {
    const plainVal = (message && getTextRootsRecursive(message).join(' ')) || '';
    const newFiles = [...(files || [])];

    if (((!message || !plainVal) && !files?.length) || !community || !channel) return;

    // Clear internal state and allow excessive senders
    setMessage([]);
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
  }, [
    addError,
    channel,
    community,
    files,
    linkPreviews,
    message,
    onSend,
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
            key: `${content.odinId} (${name})`,
            value: content.odinId,
            text: content.odinId,
            label: `${content.odinId} (${name})`,
          };
        })
        .filter(Boolean) as Mentionable[]) || [];

    filteredContacts.push({ key: '@channel', text: '@channel' });
    return filteredContacts;
  }, [contacts]);

  const plainMessage = useMemo(
    () => (message && getTextRootsRecursive(message).join(' ')) || '',
    [message]
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

  const onSubmit = useMemo(() => (isTouchDevice() ? undefined : doSend), [doSend]);
  return (
    <>
      {isDraftLoaded ? (
        <DraftSaver
          community={community}
          channel={channel}
          thread={thread}
          message={message || draft?.message}
        />
      ) : null}
      <div className={`bg-background pb-[env(safe-area-inset-bottom)] ${className || ''}`}>
        <div
          className="flex flex-shrink-0 flex-row gap-2 px-0 md:px-3 md:pb-2 lg:pb-5"
          data-default-value={message || draft?.message}
          onPaste={(e) => {
            const mediaFiles = [...getImagesFromPasteEvent(e)].map((file) => ({ file }));

            if (mediaFiles.length) {
              setFiles([...(files ?? []), ...mediaFiles]);
              e.preventDefault();
            }
          }}
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
              placeholder={
                thread
                  ? t(`Reply...`)
                  : channel?.fileMetadata.appData.content.title
                    ? `${t('Message')} # ${channel.fileMetadata.appData.content.title}`
                    : `${t('Message')} "${community?.fileMetadata.appData.content.title}"`
              }
              autoFocus={!isTouchDevice()}
              ref={volatileRef}
              onSubmit={onSubmit}
              onKeyDown={onKeyDown}
              disableHeadings={true}
              mentionables={mentionables}
              plugins={plugins}
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

const useMessageDraft = (props?: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  thread: HomebaseFile<CommunityMessage> | undefined;
}) => {
  const { community, channel, thread } = props || {};
  const threadId = thread?.fileMetadata.globalTransitId;

  const {
    single: { data: metadata },
  } = useCommunityMetadata(
    props
      ? {
          odinId: community?.fileMetadata.senderOdinId,
          communityId: community?.fileMetadata.appData.uniqueId,
        }
      : undefined
  );

  const draftsKey = useMemo(
    () => threadId || channel?.fileMetadata.appData.uniqueId,
    [threadId, channel]
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | undefined>(undefined);

  useEffect(() => {
    if (!draftsKey || !metadata || draft) return;

    setIsLoaded(true);
    const drafts = metadata?.fileMetadata.appData.content.drafts || {};
    setDraft(draftsKey ? drafts[draftsKey] : undefined);
  }, [draftsKey, metadata]);

  return { isLoaded, draft };
};

const DraftSaver = ({
  community,
  channel,
  thread,
  message,
}: {
  community: HomebaseFile<CommunityDefinition> | undefined;
  channel: HomebaseFile<CommunityChannel> | undefined;
  thread: HomebaseFile<CommunityMessage> | undefined;
  message: RichText | undefined;
}) => {
  const threadId = thread?.fileMetadata.globalTransitId;

  const {
    single: { data: metadata },
    update: { mutate: updateMetadata },
  } = useCommunityMetadata({
    odinId: community?.fileMetadata.senderOdinId,
    communityId: community?.fileMetadata.appData.uniqueId,
  });

  const drafts = metadata?.fileMetadata.appData.content.drafts || {};
  const draftsKey = useMemo(
    () => threadId || channel?.fileMetadata.appData.uniqueId,
    [threadId, channel]
  );

  const [toSaveMeta, setToSaveMeta] = useState<
    HomebaseFile<CommunityMetadata> | NewHomebaseFile<CommunityMetadata> | undefined
  >();

  const debouncedSave = useDebounce(() => toSaveMeta && updateMetadata({ metadata: toSaveMeta }), {
    timeoutMillis: 2000,
  });

  useEffect(() => {
    if (metadata && draftsKey) {
      if (drafts[draftsKey]?.message === message) return;

      const newDrafts: Record<string, Draft | undefined> = {
        ...drafts,
        [draftsKey]: {
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

      if (message === undefined || message.length === 0) {
        updateMetadata({ metadata: newMeta });
        return;
      } else {
        setToSaveMeta(newMeta);
        debouncedSave();
      }
    }
  }, [threadId, channel, message, debouncedSave]);

  return null;
};
