import { useOdinClientContext, ConnectionImage, OwnerImage } from '@homebase-id/common-app';
import { Persons } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { OdinImage } from '@homebase-id/ui-lib';
import {
  UnifiedConversation,
  ConversationMetadata,
  ConversationWithYourselfId,
  CONVERSATION_IMAGE_KEY,
  ChatDrive,
} from '../../../../providers/ConversationProvider';

export const ConversationAvatar = ({
  conversation,
  sizeClassName,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  sizeClassName?: string;
}) => {
  const odinClient = useOdinClientContext();
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  if (!loggedOnIdentity) return null;

  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient !== loggedOnIdentity
  );

  const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const recipient = recipients.length === 1 ? recipients[0] : undefined;

  const payload = conversation.fileMetadata.payloads?.find(
    (pyld) => pyld.key === CONVERSATION_IMAGE_KEY
  );

  return (
    <>
      {payload ? (
        <OdinImage
          fileId={conversation.fileId}
          odinClient={odinClient}
          fileKey={payload.key}
          targetDrive={ChatDrive}
          fit="cover"
          className={`${sizeClassName || 'h-24 w-24'} overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-800`}
          previewThumbnail={
            payload.previewThumbnail || conversation.fileMetadata.appData.previewThumbnail
          }
        />
      ) : recipient ? (
        <ConnectionImage
          odinId={recipient}
          className={`${sizeClassName || 'h-24 w-24'} border border-neutral-200 dark:border-neutral-800`}
          size="custom"
        />
      ) : withYourself ? (
        <OwnerImage
          className={`${sizeClassName || 'h-24 w-24'} border border-neutral-200 dark:border-neutral-800`}
          size="custom"
        />
      ) : (
        <div
          className={`rounded-full bg-primary/20 ${sizeClassName || 'h-24 w-24'} flex items-center justify-center`}
        >
          <Persons className="h-[50%] w-[50%]" />
        </div>
      )}
    </>
  );
};
