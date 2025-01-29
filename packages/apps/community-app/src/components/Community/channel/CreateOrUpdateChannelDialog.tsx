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
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityChannel } from '../../../providers/CommunityProvider';

export const CreateOrUpdateChannelDialog = ({
  defaultValue,
  onClose,
}: {
  defaultValue?: HomebaseFile<CommunityChannel>;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');

  const [channelName, setChannelName] = useState(
    defaultValue?.fileMetadata.appData.content.title || ''
  );

  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const {
    mutate: createCommunityChannel,
    status: createCommunityStatus,
    error: createCommunityError,
  } = useCommunityChannel().create;

  const {
    mutate: updateCommunityChannel,
    status: updateCommunityStatus,
    error: updateCommunityError,
  } = useCommunityChannel().update;

  useEffect(() => {
    createCommunityStatus === 'success' && onClose();
  }, [createCommunityStatus]);

  useEffect(() => {
    updateCommunityStatus === 'success' && onClose();
  }, [updateCommunityStatus]);

  const isCreate = !defaultValue;

  if (!community) return null;

  const dialog = (
    <>
      <ErrorNotification error={createCommunityError || updateCommunityError} />
      <div onClick={(e) => e.stopPropagation()}>
        <DialogWrapper
          title={
            <>
              {isCreate
                ? t('Create new channel')
                : t('Update channel "{0}"', defaultValue.fileMetadata.appData.content.title)}
            </>
          }
          onClose={onClose}
          isSidePanel={false}
          isOverflowLess={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (defaultValue) {
                updateCommunityChannel({
                  community,
                  channel: {
                    ...defaultValue,
                    fileMetadata: {
                      ...defaultValue.fileMetadata,
                      appData: {
                        ...defaultValue.fileMetadata.appData,
                        content: {
                          ...defaultValue.fileMetadata.appData.content,
                          title: channelName,
                        },
                      },
                    },
                  },
                });
              } else {
                createCommunityChannel({
                  community: community,
                  channelName,
                });
              }
            }}
          >
            <div>
              <Label htmlFor="channelName">{t('Channel name')}</Label>
              <Input
                onChange={(e) => setChannelName(e.target.value)}
                name="channelName"
                required
                defaultValue={channelName}
                onKeyDown={(e) => {
                  // Remove spaces from the channel name
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }}
              />
            </div>

            <div className="mt-3 flex flex-row-reverse justify-between gap-2">
              <ActionButton>{isCreate ? t('Create') : t('Update')}</ActionButton>
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
