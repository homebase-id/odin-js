import { t, ConnectionName } from '@homebase-id/common-app';
import { MailConversation, getAllRecipients } from '../../providers/MailProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '@homebase-id/common-app';
import React from 'react';

export const RecipientsList = ({
  mailThread,
}: {
  mailThread: HomebaseFile<MailConversation>[];
}) => {
  const identity = useDotYouClientContext().getIdentity();
  const allRecipients = getAllRecipients(mailThread[0]);

  const anyReply = mailThread.some(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) === identity
  );

  const lastReceivedConversation = mailThread.find(
    (conv) =>
      (conv.fileMetadata.senderOdinId || conv.fileMetadata.appData.content.sender) !== identity
  );
  const anyReceived = !!lastReceivedConversation;

  const numberOfConversations = mailThread.length;
  const onlySent = anyReply && !anyReceived;

  const filteredRecipients = allRecipients.filter((recipient) =>
    recipient === identity ? anyReply : anyReceived
  );

  const fromMeToMe = !allRecipients.some((recipient) => recipient !== identity);

  return (
    <>
      <span className="overflow-hidden overflow-ellipsis text-nowrap">
        {onlySent ? (
          <>
            {t('To')}:{' '}
            <InnerRecipients
              recipients={allRecipients.filter(
                (recipient, index) => (fromMeToMe && index === 0) || recipient !== identity
              )}
            />
          </>
        ) : (
          <InnerRecipients recipients={filteredRecipients} />
        )}
      </span>
      {numberOfConversations !== 1 ? <span>({numberOfConversations})</span> : null}
    </>
  );
};

const InnerRecipients = ({ recipients }: { recipients: string[] }) => {
  const identity = useDotYouClientContext().getIdentity();

  return recipients.map((recipient, index) => (
    <React.Fragment key={recipient}>
      {recipient === identity ? t('Me') : <ConnectionName odinId={recipient} />}
      {recipients.length - 1 === index ? null : `, `}
    </React.Fragment>
  ));
};
