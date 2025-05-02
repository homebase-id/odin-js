import { useOdinClientContext, ConnectionName, OwnerName, t } from '@homebase-id/common-app';
import { House } from '@homebase-id/common-app/icons';
import { HomebaseFile, OdinClient, ApiType } from '@homebase-id/js-lib/core';
import {
  UnifiedConversation,
  ConversationMetadata,
  ConversationWithYourselfId,
} from '../../../../providers/ConversationProvider';

export const ConversationTitle = ({
  conversation,
  sizeClassName,
  includeLink,
}: {
  conversation: HomebaseFile<UnifiedConversation, ConversationMetadata>;
  sizeClassName?: string;
  includeLink?: boolean;
}) => {
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  if (!loggedOnIdentity) return null;

  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient !== loggedOnIdentity
  );

  const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const recipient = recipients.length === 1 ? recipients[0] : undefined;

  return (
    <>
      {recipient ? (
        <p className={`text-center ${sizeClassName ?? 'text-xl'}`}>
          <ConnectionName odinId={recipient} />
          {includeLink ? (
            <small className="flex flex-row gap-2 text-sm">
              <House className="h-5 w-5" />
              <a
                href={new OdinClient({
                  hostIdentity: recipient,
                  api: ApiType.Guest,
                }).getRoot()}
                rel="noreferrer noopener"
                target="_blank"
                className="text-primary hover:underline"
              >
                {recipient}
              </a>
            </small>
          ) : null}
        </p>
      ) : withYourself ? (
        <p className={`text-center ${sizeClassName ?? 'text-xl'}`}>
          <OwnerName /> <span className="text-sm text-foreground/50">({t('you')})</span>
        </p>
      ) : (
        <span className={`text-center ${sizeClassName ?? 'text-xl'}`}>
          {conversationContent?.title}
        </span>
      )}
    </>
  );
};
