import { DEFAULT_PAYLOAD_KEY, HomebaseFile, RichText } from '@homebase-id/js-lib/core';

import {
  ActionButton,
  ErrorNotification,
  t,
  useAllContacts,
  useContentFromPayload,
} from '@homebase-id/common-app';

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { isTouchDevice } from '@homebase-id/js-lib/helpers';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import {
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../../../providers/CommunityDefinitionProvider';
import { useCommunityMessage } from '../../../../hooks/community/messages/useCommunityMessage';
import { ChannelPlugin } from '../RTEChannelDropdown/RTEChannelDropdownPlugin';
import type { Mentionable } from '@homebase-id/rich-text-editor';
import {TableFlipPlugin} from "../RTETableFlipDropdown/RTEChannelDropdownPlugin";

const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RichTextEditor,
  }))
);

export const CommunityMessageEditor = ({
  msg,
  community,
  onClose,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition>;
  onClose: () => void;
}) => {
  const hasMoreContent = msg.fileMetadata.payloads?.some(
    (payload) => payload.key === DEFAULT_PAYLOAD_KEY
  );

  const messageContent = msg.fileMetadata.appData.content;

  const {
    data: fullMessageContent,
    isFetching: fetchingMoreContent,
    refetch,
  } = useContentFromPayload<CommunityMessage>(
    hasMoreContent && community
      ? {
          odinId: community?.fileMetadata.senderOdinId,
          targetDrive: getTargetDriveFromCommunityId(
            community.fileMetadata.appData.uniqueId as string
          ),
          fileId: msg.fileId,
          payloadKey: DEFAULT_PAYLOAD_KEY,
          lastModified: msg.fileMetadata.payloads?.find((pyld) => pyld.key === DEFAULT_PAYLOAD_KEY)
            ?.lastModified,
          systemFileType: msg.fileSystemType,
        }
      : undefined
  );

  const [newMessage, setNewMessage] = useState<RichText>();
  const defaultValue = useMemo(() => {
    return hasMoreContent ? fullMessageContent?.message : messageContent.message;
  }, [hasMoreContent, fullMessageContent, messageContent]);

  const [forcedUpdate, setForcedUpdate] = useState(0);
  useEffect(() => setForcedUpdate(forcedUpdate - 1), [defaultValue]);

  const {
    mutate: updateChatMessage,
    status: updateStatus,
    error: updateError,
  } = useCommunityMessage().update;

  const doSend = () => {
    if (!newMessage) return;

    const updatedMessage: HomebaseFile<CommunityMessage> = {
      ...msg,
      fileMetadata: {
        ...msg.fileMetadata,
        appData: {
          ...msg.fileMetadata.appData,
          content: { ...msg.fileMetadata.appData.content, message: newMessage },
        },
      },
    };

    updateChatMessage({
      community,
      updatedChatMessage: updatedMessage,
    });
  };

  useEffect(() => {
    if (updateStatus === 'success') onClose();
  }, [updateStatus]);

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

  const plugins = useMemo(() => {
    return [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ChannelPlugin.configure({ options: { insertSpaceAfterChannel: true } } as any),
      TableFlipPlugin.configure({ options: { insertSpaceAfterChannel: true } } as any),
    ];
  }, []);

  if (hasMoreContent && fetchingMoreContent) return <div>{t('Loading')}...</div>;
  if (hasMoreContent && !fullMessageContent)
    return (
      <div>
        {t('Failed to load the full message to edit')}{' '}
        <ActionButton onClick={() => refetch()} type="secondary">
          {t('Retry')}
        </ActionButton>
      </div>
    );

  return (
    <div>
      <ErrorNotification error={updateError} />
      <Suspense>
        <RichTextEditor
          disableHeadings={true}
          placeholder="Your message"
          defaultValue={newMessage || defaultValue}
          className="min-h-[10rem] w-full border bg-background p-2 dark:border-slate-800"
          contentClassName="max-h-[50vh] overflow-auto"
          onChange={(e) => setNewMessage(e.target.value)}
          autoFocus={!isTouchDevice()}
          onSubmit={isTouchDevice() ? undefined : doSend}
          mentionables={mentionables}
          plugins={plugins}
          onKeyDown={(e) => {
            if (e.key === 'Escape')
              confirm(t('Are you sure? You will lose any pending changes')) && onClose();
          }}
          key={`${msg.fileMetadata.versionTag || msg.fileId}_${forcedUpdate}`}
        >
          <div className="">
            <div className="flex flex-row-reverse gap-2">
              <ActionButton
                type="primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  doSend();
                }}
                state={updateStatus}
                size="square"
                onMouseDown={(e) => e.preventDefault()}
              >
                {t('Save')}
              </ActionButton>
              <ActionButton
                type="mute"
                onClick={onClose}
                size="square"
                onMouseDown={(e) => e.preventDefault()}
              >
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </RichTextEditor>
      </Suspense>
    </div>
  );
};
