import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import {
  Arrow,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  flattenInfinteData,
  formatToTimeAgoWithRelativeDetail,
  t,
  usePortal,
} from '@youfoundation/common-app';
import { MailConversation, getAllRecipients } from '../../providers/MailProvider';
import { useDotYouClientContext } from '../../hooks/auth/useDotYouClientContext';
import { useMailOrigin } from '../../hooks/mail/useMailOrigin';
import { RecipientsList } from '../../components/Threads/RecipientsList';
import { ROOT_PATH } from '../../app/App';

const PAGE_SIZE = 100;
export const MailThreadInfo = ({
  mailThread,
  onClose,
}: {
  mailThread: HomebaseFile<MailConversation>[];
  onClose: () => void;
}) => {
  const identity = useDotYouClientContext().getIdentity();
  const target = usePortal('modal-container');
  const lastMessage = mailThread[mailThread.length - 1];

  const lastMessageContent = lastMessage.fileMetadata.appData.content;
  const recipients = getAllRecipients(lastMessage, identity);

  const { data: originalThread } = useMailOrigin({
    originId: lastMessage.fileMetadata.appData.content.originId,
    threadId: lastMessage.fileMetadata.appData.content.threadId,
  }).fetchOrigin;

  const messagesFromTheSameOrigin = useMemo(() => {
    const flattenedConversations = flattenInfinteData<HomebaseFile<MailConversation>>(
      originalThread,
      PAGE_SIZE,
      (a, b) =>
        (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
        (a.fileMetadata.appData.userDate || a.fileMetadata.created)
    );

    // Group the flattenedConversations by their groupId
    return flattenedConversations.reduce(
      (acc, conversation) => {
        const threadId = conversation.fileMetadata.appData.groupId as string;

        if (!acc[threadId]) acc[threadId] = [conversation];
        else acc[threadId].push(conversation);

        return acc;
      },
      {} as Record<string, HomebaseFile<MailConversation>[]>
    );
  }, [originalThread]);

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
      <div className="mt-5 flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="mb-3 text-lg">{t('Thread info')}:</h2>
          <div>ThreadId: {lastMessage.fileMetadata.appData.content.threadId}</div>
          <div>OriginId: {lastMessage.fileMetadata.appData.content.originId}</div>
        </div>

        {messagesFromTheSameOrigin && Object.keys(messagesFromTheSameOrigin)?.length ? (
          <div className="flex flex-col gap-1">
            <h3 className="mb-3 text-lg">{t('Other threads with this origin')}</h3>
            {Object.keys(messagesFromTheSameOrigin).map((threadId) => {
              const lastMessageInThatThread = messagesFromTheSameOrigin[threadId][0];
              if (!lastMessageInThatThread) return null;

              return (
                <a
                  className="flex flex-row bg-page-background px-2 py-2"
                  key={threadId}
                  href={`${ROOT_PATH}/inbox/${threadId}`}
                >
                  <div className="flex w-28 flex-shrink-0 flex-row gap-1">
                    <RecipientsList mailThread={messagesFromTheSameOrigin[threadId]} />
                  </div>

                  <p className={`font-normal text-foreground/60 md:text-inherit`}>
                    {lastMessageInThatThread.fileMetadata.appData.content.subject}
                  </p>
                  <p className="ml-auto text-sm text-foreground/50">
                    {formatToTimeAgoWithRelativeDetail(
                      new Date(lastMessageInThatThread.fileMetadata.created),
                      true
                    )}
                  </p>
                </a>
              );
            })}
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
