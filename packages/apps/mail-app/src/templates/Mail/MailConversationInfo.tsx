import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import {
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  usePortal,
  formatDateExludingYearIfCurrent,
  OWNER_ROOT,
  useTransferHistory,
} from '@homebase-id/common-app';
import {
  MailConversation,
  MailDeliveryStatus,
  MailDrive,
  transferHistoryToMailDeliveryStatus,
} from '../../providers/MailProvider';
import { Exclamation } from '@homebase-id/common-app/icons';

export const MailConversationInfo = ({
  mailConversation,
  onClose,
}: {
  mailConversation: HomebaseFile<MailConversation>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const recipients = mailConversation.fileMetadata.appData.content.recipients;

  const { data: transferHistory } = useTransferHistory({
    fileId: mailConversation.fileId,
    targetDrive: MailDrive,
  }).fetch;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>
          <p>
            {t('Sent')}:{' '}
            {formatDateExludingYearIfCurrent(new Date(mailConversation.fileMetadata.created))}
          </p>
          {mailConversation.fileMetadata.updated !== mailConversation.fileMetadata.created ? (
            <p>
              {t('Updated')}:{' '}
              {formatDateExludingYearIfCurrent(new Date(mailConversation.fileMetadata.updated))}
            </p>
          ) : null}
          {mailConversation.fileMetadata.transitCreated ? (
            <p>
              {t('Received')}:{' '}
              {formatDateExludingYearIfCurrent(
                new Date(mailConversation.fileMetadata.transitCreated)
              )}
            </p>
          ) : null}
          <a
            href={`${OWNER_ROOT}/drives/${MailDrive.alias}_${MailDrive.type}/${mailConversation.fileId}`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {t('See file on your drive')}
          </a>
        </div>

        <div>
          <p className="mb-2 text-xl">{t('Recipients')}</p>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => {
              const recipientTransferHistory = transferHistory?.history.results.find(
                (result) => result.recipient === recipient
              );
              const deliveryStatus = transferHistoryToMailDeliveryStatus(recipientTransferHistory);

              return (
                <div className="flex flex-row items-center justify-between" key={recipient}>
                  <div className="flex flex-row items-center gap-2">
                    <AuthorImage
                      odinId={recipient}
                      className="border border-neutral-200 dark:border-neutral-800"
                      size="sm"
                    />
                    <AuthorName odinId={recipient} />
                  </div>
                  {recipientTransferHistory && deliveryStatus === MailDeliveryStatus.Failed ? (
                    <div className="flex flex-row items-center gap-2 text-red-500">
                      <Exclamation className="h-5 w-5" /> {t('Failed to deliver')}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
