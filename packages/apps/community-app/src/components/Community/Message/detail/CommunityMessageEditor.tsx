import { HomebaseFile } from '@homebase-id/js-lib/core';

import { ActionButton, ErrorNotification, t } from '@homebase-id/common-app';

import { useEffect, useState } from 'react';

import { isTouchDevice } from '@homebase-id/js-lib/helpers';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { useCommunityMessage } from '../../../../hooks/community/messages/useCommunityMessage';
import { RichTextEditor } from '@homebase-id/rich-text-editor';

export const CommunityMessageEditor = ({
  msg,
  community,
  onClose,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition>;
  onClose: () => void;
}) => {
  const messageContent = msg.fileMetadata.appData.content;

  const [message, setMessage] = useState(messageContent.message);
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

  return (
    <div>
      <ErrorNotification error={updateError} />
      <RichTextEditor
        placeholder="Your message"
        defaultValue={message}
        className="min-h-[10rem] w-full border bg-background p-2 dark:border-slate-800"
        contentClassName="max-h-[50vh] overflow-auto"
        onChange={(e) => setMessage(e.target.value)}
        autoFocus={!isTouchDevice()}
        onSubmit={isTouchDevice() ? undefined : doSend}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
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
    </div>
  );
};
