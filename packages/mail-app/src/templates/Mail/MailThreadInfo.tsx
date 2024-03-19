import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Arrow,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  t,
  usePortal,
} from '@youfoundation/common-app';
import { MailConversation, getAllRecipients } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';

export const MailThreadInfo = ({
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
  const recipients = getAllRecipients(lastMessage, identity);

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Thread info')}>
      {'Subject'}: {lastMessageContent.subject}
      {recipients?.length ? (
        <div className="mt-10">
          <p className="mb-4 text-lg">{t('Recipients')}</p>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <a
                href={`https://${identity}/owner/connections/${recipient}`}
                rel="noreferrer noopener"
                target="_blank"
                className="group flex flex-row items-center gap-3"
                key={recipient}
              >
                <ConnectionImage
                  odinId={recipient}
                  className="border border-neutral-200 dark:border-neutral-800"
                  size="sm"
                />
                <div className="flex flex-col group-hover:underline">
                  <ConnectionName odinId={recipient} />
                  <p>{recipient}</p>
                </div>
                <Arrow className="ml-auto h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
