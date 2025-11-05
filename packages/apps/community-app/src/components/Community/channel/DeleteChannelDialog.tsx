import {
  usePortal,
  DialogWrapper,
  t,
  ActionButton,
  ErrorNotification,
} from '@homebase-id/common-app';
import { createPortal } from 'react-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityChannel } from '../../../providers/CommunityProvider';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { useParams } from 'react-router-dom';
import { useCommunity } from '../../../hooks/community/useCommunity';
import { useEffect } from 'react';

export const DeleteChannelDialog = ({
  channel,
  onClose,
}: {
  channel: HomebaseFile<CommunityChannel>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const { mutate: deleteCommunityChannel, status, error } = useCommunityChannel().delete;

  if (!community) return null;

  useEffect(() => {
    status === 'success' && onClose();
  }, [status]);

  if (!channel) return null;

  const dialog = (
    <>
      <ErrorNotification error={error} />
      <div onClick={(e) => e.stopPropagation()}>
        <DialogWrapper
          title={t('Delete channel "{0}"?', channel.fileMetadata.appData.content.title)}
          onClose={onClose}
          isSidePanel={false}
          isOverflowLess={true}
        >
          <p className="mb-4">
            {t('This will delete all the messages in the channel. This cannot be undone')}
          </p>
          <div className="mt-3 flex flex-row-reverse justify-between gap-2">
            <ActionButton
              onClick={() => deleteCommunityChannel({ community, channel })}
              type="remove"
            >
              {t('Delete')}
            </ActionButton>
            <ActionButton
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              type="secondary"
            >
              {t('Cancel')}
            </ActionButton>
          </div>
        </DialogWrapper>
      </div>
    </>
  );

  return createPortal(dialog, target);
};
