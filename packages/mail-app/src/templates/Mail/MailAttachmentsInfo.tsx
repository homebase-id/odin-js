import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ConnectionName, DialogWrapper, t, usePortal } from '@youfoundation/common-app';
import { MailConversation } from '../../providers/MailProvider';
import { AttachmentFile } from './MailAttachmentOverview';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

export const MailAttachmentsInfo = ({
  mailThread,
  onClose,
}: {
  mailThread: DriveSearchResult<MailConversation>[];
  onClose: () => void;
}) => {
  const identity = useDotYouClientContext().getIdentity();
  const target = usePortal('modal-container');
  const lastMessage = mailThread[mailThread.length - 1];

  const lastMessageContent = lastMessage.fileMetadata.appData.content;

  const allAttachmentsChronologically = mailThread.flatMap((conversation) =>
    conversation.fileMetadata.payloads.map((payload) => ({
      ...payload,
      fileId: conversation.fileId,
      created: conversation.fileMetadata.created,
      sender:
        conversation.fileMetadata.senderOdinId || conversation.fileMetadata.appData.content.sender,
    }))
  );

  const groupedWithFileName = allAttachmentsChronologically.reduce(
    (acc, file) => {
      const fileName = file.descriptorContent || file.key;
      if (!acc[fileName]) acc[fileName] = [];
      acc[fileName].push(file);
      return acc;
    },
    {} as Record<string, typeof allAttachmentsChronologically>
  );

  const dialog = (
    <DialogWrapper
      onClose={onClose}
      title={
        <>
          {t('Attachments')}{' '}
          <small className="block text-sm text-slate-400">
            &quot;{lastMessageContent.subject}&quot;
          </small>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {allAttachmentsChronologically.map((file) => (
          <AttachmentFile
            file={file}
            key={file.key}
            className={`rounded-full border border-slate-200 bg-background px-3 py-2 dark:border-slate-700`}
          >
            <div className="ml-auto flex-shrink-0 text-slate-400">
              <span>
                {identity === file.sender ? t('You') : <ConnectionName odinId={file.sender} />}
              </span>{' '}
              {t('on')}{' '}
              <span>{new Date(file.created).toLocaleDateString(undefined, dateTimeFormat)}</span>
            </div>
          </AttachmentFile>
        ))}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
