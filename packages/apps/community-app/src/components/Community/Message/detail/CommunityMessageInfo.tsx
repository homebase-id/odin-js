import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';

import {
  AuthorImage,
  AuthorName,
  DialogWrapper,
  t,
  useDotYouClientContext,
  usePortal,
} from '@homebase-id/common-app';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';
import { CommunityDefinition } from '../../../../providers/CommunityDefinitionProvider';
import { CommunityMessage } from '../../../../providers/CommunityMessageProvider';
import { InnerDeliveryIndicator } from '../item/CommunityDeliveryIndicator';
import { useCommunityReaction } from '../../../../hooks/community/reactions/useCommunityReaction';

export const CommunityMessageInfo = ({
  msg,
  community,
  onClose,
}: {
  msg: HomebaseFile<CommunityMessage>;
  community: HomebaseFile<CommunityDefinition>;
  onClose: () => void;
}) => {
  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const target = usePortal('modal-container');
  const messageContent = msg.fileMetadata.appData.content;
  const communityContent = community.fileMetadata.appData.content;
  const members = communityContent.members.filter(
    (recipient) => recipient && recipient !== loggedOnIdentity
  );

  const isAuthor =
    msg.fileMetadata.senderOdinId === loggedOnIdentity || !msg.fileMetadata.senderOdinId;

  const { data: reactions } = useCommunityReaction({
    community: community,
    messageFileId: msg.fileId,
    messageGlobalTransitId: msg.fileMetadata.globalTransitId,
  }).get;

  const dialog = (
    <DialogWrapper onClose={onClose} title={t('Message info')}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>

          <p>
            {t('Created')}:
            {formatDateExludingYearIfCurrent(
              new Date(msg.fileMetadata.appData.userDate || msg.fileMetadata.created)
            )}
          </p>

          {msg.fileMetadata.updated !== msg.fileMetadata.created ? (
            <p>
              {t('Updated')}: {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.updated))}
            </p>
          ) : null}
          {msg.fileMetadata.transitCreated ? (
            <p>
              {t('Received ')}:
              {formatDateExludingYearIfCurrent(new Date(msg.fileMetadata.transitCreated))}
            </p>
          ) : null}
        </div>

        {members?.length ? (
          <div>
            <p className="mb-2 text-xl">{t('members')}</p>
            <div className="flex flex-col gap-4">
              {members.map((recipient) => (
                <div
                  className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
                  key={recipient}
                >
                  <div className="flex flex-row items-center gap-2">
                    <AuthorImage
                      odinId={recipient}
                      className="flex-shrink-0 border border-neutral-200 dark:border-neutral-800"
                      size="sm"
                    />
                    <AuthorName odinId={recipient} />
                  </div>
                  {isAuthor ? (
                    <div className="flex flex-row justify-end gap-2 sm:contents">
                      <InnerDeliveryIndicator state={messageContent.deliveryStatus} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {reactions?.length ? (
          <div>
            <p className="mb-2 text-xl">{t('Reactions')}</p>
            <div className="flex flex-col gap-4">
              {reactions?.map((reaction) => {
                return (
                  <div
                    className="flex flex-row items-center text-lg"
                    key={reaction.authorOdinId + reaction.body}
                  >
                    <AuthorImage odinId={reaction.authorOdinId} size="xs" className="mr-2" />
                    <AuthorName odinId={reaction.authorOdinId} />
                    <p className="ml-auto text-3xl">{reaction.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
