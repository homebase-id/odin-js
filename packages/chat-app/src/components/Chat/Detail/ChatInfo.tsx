import { createPortal } from 'react-dom';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import {
  Arrow,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  t,
  useDotYouClient,
  usePortal,
} from '@youfoundation/common-app';
import {
  Conversation,
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

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Chat info')}>
      <div>
        <p className="mb-2 text-lg">{t('Recipients')}</p>
        <div className="flex flex-col gap-4">
          {recipients.map((recipient) => (
            <a
              href={`https://${identity}/owner/connections/${recipient}`}
              rel="noreferrer noopener"
              target="_blank"
              className="group flex flex-row items-center gap-2"
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
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
