import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Arrow,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  House,
  OwnerImage,
  OwnerName,
  Persons,
  t,
  useDotYouClient,
  usePortal,
} from '@youfoundation/common-app';
import {
  Conversation,
  ConversationWithYourselfId,
  GroupConversation,
  SingleConversation,
} from '../../../providers/ConversationProvider';

export const ChatInfo = ({
  conversation,
  onClose,
}: {
  conversation: DriveSearchResult<Conversation>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const identity = useDotYouClient().getIdentity();
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = (conversationContent as GroupConversation).recipients || [
    (conversationContent as SingleConversation).recipient,
  ];

  const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const recipient = (conversationContent as SingleConversation)?.recipient;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Chat info')}>
      <div>
        <div className="flex flex-col items-center gap-4">
          {recipient ? (
            <ConnectionImage
              odinId={recipient}
              className="h-24 w-24 border border-neutral-200 dark:border-neutral-800"
              size="custom"
            />
          ) : withYourself ? (
            <OwnerImage
              className="h-24 w-24 border border-neutral-200 dark:border-neutral-800"
              size="custom"
            />
          ) : (
            <div className="rounded-full bg-primary/20 p-7">
              <Persons className="h-10 w-10" />
            </div>
          )}

          <p className="text-center text-xl">
            {recipient ? (
              <>
                <ConnectionName odinId={recipient} />
                <small className="flex flex-row gap-2 text-sm">
                  <House className="h-5 w-5" />
                  <a
                    href={`https://${recipient}`}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    {recipient}
                  </a>
                </small>
              </>
            ) : withYourself ? (
              <>
                <OwnerName />
                <span className="text-sm text-foreground/50">({t('you')})</span>
              </>
            ) : (
              conversationContent?.title
            )}
          </p>
        </div>
      </div>
      {recipients?.length > 1 ? (
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
