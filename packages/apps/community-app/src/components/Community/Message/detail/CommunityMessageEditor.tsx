import { DEFAULT_PAYLOAD_KEY, HomebaseFile } from '@homebase-id/js-lib/core';

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

  const { data: fullMessageContent, isFetching: fetchingMoreContent } =
    useContentFromPayload<CommunityMessage>(
      hasMoreContent && community
        ? {
            odinId: community?.fileMetadata.senderOdinId,
            targetDrive: getTargetDriveFromCommunityId(
              community.fileMetadata.appData.uniqueId as string
            ),
            fileId: msg.fileId,
            payloadKey: DEFAULT_PAYLOAD_KEY,
            lastModified: msg.fileMetadata.payloads?.find(
              (pyld) => pyld.key === DEFAULT_PAYLOAD_KEY
            )?.lastModified,
            systemFileType: msg.fileSystemType,
          }
        : undefined
    );

  const [message, setMessage] = useState(
    hasMoreContent ? fullMessageContent?.message : messageContent.message
  );
  useEffect(
    () => setMessage(hasMoreContent ? fullMessageContent?.message : messageContent.message),
    [fullMessageContent]
  );

  const {
    mutate: updateChatMessage,
    status: updateStatus,
    error: updateError,
  } = useCommunityMessage().update;

  const doSend = () => {
    if (!message) return;

    const updatedMessage: HomebaseFile<CommunityMessage> = {
      ...msg,
      fileMetadata: {
        ...msg.fileMetadata,
        appData: {
          ...msg.fileMetadata.appData,
          content: { ...msg.fileMetadata.appData.content, message },
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

  if (hasMoreContent && fetchingMoreContent) return <div>{t('Loading')}...</div>;

  return (
    <div>
      <ErrorNotification error={updateError} />
      <Suspense>
        <RichTextEditor
          disableHeadings={true}
          placeholder="Your message"
          defaultValue={message}
          className="min-h-[10rem] w-full border bg-background p-2 dark:border-slate-800"
          contentClassName="max-h-[50vh] overflow-auto"
          onChange={(e) => setMessage(e.target.value)}
          autoFocus={!isTouchDevice()}
          onSubmit={isTouchDevice() ? undefined : doSend}
          mentionables={mentionables}
          onKeyDown={(e) => {
            if (e.key === 'Escape')
              confirm(t('Are you sure? You will lose any pending changes')) && onClose();
          }}
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
