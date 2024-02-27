import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { AuthorImage, AuthorName, DialogWrapper, t, usePortal } from '@youfoundation/common-app';
import { MailConversation } from '../../providers/MailProvider';

const dateTimeFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

export const MailConversationInfo = ({
  mailConversation,
  onClose,
}: {
  mailConversation: DriveSearchResult<MailConversation>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const recipients = mailConversation.fileMetadata.appData.content.recipients;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>
          <p>
            {t('Sent')}:{' '}
            {new Date(mailConversation.fileMetadata.created).toLocaleDateString(
              undefined,
              dateTimeFormat
            )}
          </p>
          {mailConversation.fileMetadata.updated !== mailConversation.fileMetadata.created ? (
            <p>
              {t('Updated')}:{' '}
              {new Date(mailConversation.fileMetadata.updated).toLocaleDateString(
                undefined,
                dateTimeFormat
              )}
            </p>
          ) : null}
          {mailConversation.fileMetadata.transitCreated ? (
            <p>
              {t('Received')}:{' '}
              {new Date(mailConversation.fileMetadata.transitCreated).toLocaleDateString(
                undefined,
                dateTimeFormat
              )}
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xl">{t('Recipients')}</p>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <div className="flex flex-row items-center justify-between" key={recipient}>
                <div className="flex flex-row items-center gap-2">
                  <AuthorImage
                    odinId={recipient}
                    className="border border-neutral-200 dark:border-neutral-800"
                    size="sm"
                  />
                  <AuthorName odinId={recipient} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
