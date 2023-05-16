import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import { usePortal, useChannels, ChannelDefinitionVm } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { stringGuidsEqual } from '@youfoundation/js-lib';
import useFollower from '../../../hooks/follow/useFollower';

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
            allChannels?.find((chnl) => stringGuidsEqual(chnl.channelId, chnlRef.alias))
          )
          .filter(Boolean) as ChannelDefinitionVm[])
      : allChannels;

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Persons className="mr-2 h-6 w-6" /> {t('Edit follow')}
        </div>
      }
      onClose={onCancel}
    >
      <ul className="my-5 grid grid-flow-row gap-4">
        {channels?.map((chnl) => {
          return (
            <li
              key={chnl.channelId}
              className="flex cursor-pointer flex-row items-center rounded-lg border bg-white p-4 dark:border-slate-800"
            >
              <Quote className="mr-3 mt-1 h-6 w-6" />
              <div>
                <h2>{chnl.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-600">{chnl.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" type="secondary" onClick={onConfirm}>
          {t('Ok')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default IdentityThatFollowsDialog;
