import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';
import {
  ActionButton,
  DialogWrapper,
  ErrorNotification,
  VolatileInput,
  getPlainTextFromRichText,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { UnifiedConversation } from '../../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { useChatMessage } from '../../../hooks/chat/useChatMessage';
import { isTouchDevice } from '@homebase-id/js-lib/helpers';
import { RichTextEditor } from '@homebase-id/rich-text-editor';

export const EditChatMessage = ({
  msg,
  conversation,
  onClose,
}: {
  msg: HomebaseFile<ChatMessage>;
  conversation: HomebaseFile<UnifiedConversation>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const messageContent = msg.fileMetadata.appData.content;

  const [message, setMessage] = useState(messageContent.message);
  const {
    mutate: updateChatMessage,
    status: updateStatus,
    error: updateError,
  } = useChatMessage().update;

  const doSend = () => {
    const plainMessage = getPlainTextFromRichText(message);
    if (!plainMessage.trim()) return;

    const updatedMessage: HomebaseFile<ChatMessage> = {
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
      conversation,
      updatedChatMessage: updatedMessage,
    });
  };

  useEffect(() => {
    if (updateStatus === 'success') onClose();
  }, [updateStatus]);

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Edit message')} isSidePanel={false}>
      <>
        <ErrorNotification error={updateError} />
        {typeof message === 'string' ? (
          <VolatileInput
            placeholder="Your message"
            defaultValue={message}
            className="relative w-full rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={setMessage}
            autoFocus={!isTouchDevice()}
            onSubmit={
              isTouchDevice()
                ? undefined
                : (val) => {
                    setMessage(val);
                    doSend();
                  }
            }
          />
        ) : (
          <RichTextEditor
            placeholder="Your message"
            defaultValue={message}
            className="relative w-full rounded-md border bg-background p-2 dark:border-slate-800"
            onChange={(e) => setMessage(e.target.value)}
            autoFocus={!isTouchDevice()}
            onSubmit={isTouchDevice() ? undefined : () => doSend()}
          />
        )}
        <div className="mt-4 flex flex-row-reverse gap-2">
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
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};