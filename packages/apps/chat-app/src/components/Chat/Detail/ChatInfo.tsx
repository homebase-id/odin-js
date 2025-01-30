import { createPortal } from 'react-dom';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  ActionLink,
  CHAT_ROOT_PATH,
  ConnectionImage,
  ConnectionName,
  DialogWrapper,
  OwnerImage,
  OwnerName,
  t,
  useDotYouClientContext,
  usePortal,
} from '@homebase-id/common-app';
import {
  ConversationWithYourselfId,
  UnifiedConversation,
} from '../../../providers/ConversationProvider';
import { Persons, House, Pencil, Arrow } from '@homebase-id/common-app/icons';
import { Link } from 'react-router-dom';

export const ChatInfo = ({
  conversation,
  onClose,
}: {
  conversation: HomebaseFile<UnifiedConversation, unknown>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  if (!loggedOnIdentity) return null;
  const conversationContent = conversation.fileMetadata.appData.content;
  const recipients = conversationContent.recipients.filter(
    (recipient) => recipient !== loggedOnIdentity
  );

  const withYourself = conversation?.fileMetadata.appData.uniqueId === ConversationWithYourselfId;
  const recipient = recipients.length === 1 ? recipients[0] : undefined;

  const isAdmin = conversation.fileMetadata.senderOdinId === loggedOnIdentity;

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

          <>
            {recipient ? (
              <p className="text-center text-xl">
                <ConnectionName odinId={recipient} />
                <small className="flex flex-row gap-2 text-sm">
                  <House className="h-5 w-5" />
                  <a
                    href={new DotYouClient({
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
              </p>
            ) : withYourself ? (
              <p className="text-center text-xl">
                <OwnerName /> <span className="text-sm text-foreground/50">({t('you')})</span>
              </p>
            ) : isAdmin ? (
              <Link
                to={`${CHAT_ROOT_PATH}/${conversation.fileMetadata.appData.uniqueId}/edit`}
                className="flex cursor-pointer flex-row items-center gap-2"
              >
                <span className="text-center text-xl">{conversationContent?.title}</span>
                <Pencil className="h-5 w-5" />
              </Link>
            ) : (
              <span className="text-center text-xl">{conversationContent?.title}</span>
            )}
          </>
        </div>
      </div>
      {recipients?.length > 1 ? (
        <div className="mt-10">
          <div className="flex flex-col items-center justify-between sm:flex-row">
            <p className="mb-4 text-lg">{t('Recipients')}</p>
            {isAdmin ? (
              <ActionLink
                type="mute"
                size="none"
                href={`${CHAT_ROOT_PATH}/${conversation.fileMetadata.appData.uniqueId}/edit`}
              >
                {t('Edit')}
              </ActionLink>
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            {recipients.map((recipient) => (
              <a
                href={`${new DotYouClient({ hostIdentity: loggedOnIdentity, api: ApiType.Guest }).getRoot()}/owner/connections/${recipient}`}
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
