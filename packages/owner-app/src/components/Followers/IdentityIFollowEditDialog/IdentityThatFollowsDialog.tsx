import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal, useChannels, ChannelDefinitionVm } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useFollower } from '../../../hooks/follow/useFollower';
import { HomebaseFile } from '@youfoundation/js-lib/core';

const IdentityThatFollowsDialog = ({
  odinId,
  isOpen,

  onConfirm,
  onCancel,
}: {
  odinId: string;
  isOpen: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const { data: follower } = useFollower({
    odinId,
  }).fetch;
  const { data: allChannels } = useChannels({ isAuthenticated: true, isOwner: true });

  if (!isOpen || !follower) {
    return null;
  }

  const channels =
    follower.notificationType === 'selectedChannels'
      ? (follower.channels
          ?.map((chnlRef) =>
            allChannels?.find((chnl) =>
              stringGuidsEqual(chnl.fileMetadata.appData.uniqueId, chnlRef.alias)
            )
          )
          .filter(Boolean) as HomebaseFile<ChannelDefinitionVm>[])
      : allChannels;

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Persons className="mr-2 h-6 w-6" /> {t('Follower details')} {odinId}
        </div>
      }
      onClose={onCancel}
    >
      <ul className="my-5 grid grid-flow-row gap-4">
        {channels?.map((chnl) => {
          return (
            <li
              key={chnl.fileId}
              className="flex cursor-pointer flex-row items-center rounded-lg border bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <Quote className="mr-3 mt-1 h-6 w-6" />
              <div>
                <h2>{chnl.fileMetadata.appData.content.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-600">
                  {chnl.fileMetadata.appData.content.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
        <ActionButton type="secondary" onClick={onConfirm}>
          {t('Ok')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default IdentityThatFollowsDialog;