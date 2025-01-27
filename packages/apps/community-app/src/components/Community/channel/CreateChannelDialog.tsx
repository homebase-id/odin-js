import {
  usePortal,
  ErrorNotification,
  DialogWrapper,
  t,
  Label,
  Input,
  ActionButton,
} from '@homebase-id/common-app';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useCommunityChannel } from '../../../hooks/community/channels/useCommunityChannel';
import { useCommunity } from '../../../hooks/community/useCommunity';

export const CreateChannelDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');

  const [channelName, setChannelName] = useState('');

  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const {
    mutate: createCommunityChannel,
    status: createCommunityStatus,
    error: createCommunityError,
  } = useCommunityChannel().create;
  useEffect(() => {
    createCommunityStatus === 'success' && onClose();
  }, [createCommunityStatus]);

  if (!community) return null;

  const dialog = (
    <>
      <ErrorNotification error={createCommunityError} />
      <div onClick={(e) => e.stopPropagation()}>
        <DialogWrapper
          title={<>{t('Create new channel')}</>}
          onClose={onClose}
          isSidePanel={false}
          isOverflowLess={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();

              createCommunityChannel({
                community: community,
                channelName,
              });
              // createChannel({ channelName });
            }}
          >
            <div>
              <Label htmlFor="channelName">{t('Channel name')}</Label>
              <Input onChange={(e) => setChannelName(e.target.value)} name="channelName" required />
            </div>

            <div className="mt-3 flex flex-row-reverse justify-between gap-2">
              <ActionButton>{t('Create')}</ActionButton>
              <ActionButton
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                type="secondary"
                state={createCommunityStatus}
              >
                {t('Cancel')}
              </ActionButton>
            </div>
          </form>
        </DialogWrapper>
      </div>
    </>
  );

  return createPortal(dialog, target);
};
