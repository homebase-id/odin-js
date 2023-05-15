import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t, useSocialChannels } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import ActionButton from '../../ui/Buttons/ActionButton';
import { DialogWrapper } from '@youfoundation/common-app';
import useIdentityIFollow from '../../../hooks/follow/useIdentityIFollow';

import { Alert } from '@youfoundation/common-app';
import CheckboxToggle from '../../Form/CheckboxToggle';
import { Quote } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import useFollowingInfinite from '../../../hooks/follow/useFollowing';
import { BlogConfig } from '@youfoundation/js-lib';

const IdentityIFollowEditDialog = ({
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

  const { mutateAsync: follow, status: followStatus } = useFollowingInfinite({}).follow;
  const { data: identityIFollow, isFetchedAfterMount: identityIFollowLoaded } = useIdentityIFollow({
    odinId,
  }).fetch;
  const { data: socialChannels, isFetchedAfterMount: socialChannelsLoaded } = useSocialChannels({
    odinId,
  }).fetch;

  const [channelSelection, setChannelSelection] = useState<string[]>(
    identityIFollow?.channels
      ? identityIFollow.channels.map((chnl) => chnl.alias)
      : socialChannels?.map((chnl) => chnl.channelId) || []
  );
  useEffect(() => {
    if (identityIFollow && socialChannelsLoaded) {
      //Already following
      if (identityIFollow.channels) {
        // Selected set of channels
        setChannelSelection(identityIFollow.channels.map((chnl) => chnl.alias));
      } else if (socialChannels) {
        // All channels
        setChannelSelection(socialChannels.map((chnl) => chnl.channelId));
      }
    }
  }, [identityIFollowLoaded, socialChannelsLoaded]);

  const updateFollow = async () => {
    const selectChannels = channelSelection?.length !== socialChannels?.length;

    await follow({
      odinId: odinId,
      notificationType: selectChannels ? 'selectedChannels' : 'allNotifications',
      channels: selectChannels
        ? channelSelection?.map((chnl) => {
            return { alias: chnl, type: BlogConfig.DriveType };
          })
        : undefined,
      // Pass undefined if all socialChannels are selected so it remains a follow all
    });
    onConfirm();
  };

  if (!isOpen) {
    return null;
  }

  if (!socialChannels && socialChannelsLoaded) {
    console.log({ identityIFollow });
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Persons className="mr-2 h-6 w-6" /> {t('Edit follow')}
        </div>
      }
      onClose={onCancel}
    >
      {!socialChannels && socialChannelsLoaded ? (
        <Alert type="info" title={t("You don't have access to any channels")} className="my-5">
          {t('By following you might not get any posts')}
        </Alert>
      ) : (
        <ul className="my-5 grid grid-flow-row gap-4">
          {socialChannels?.map((chnl) => {
            const isChecked =
              channelSelection?.some((selection) => chnl.channelId === selection) || false;

            return (
              <li
                key={chnl.channelId}
                className="flex cursor-pointer flex-row items-center rounded-lg border bg-white p-4 dark:border-slate-800"
                onClick={() => {
                  if (isChecked) {
                    setChannelSelection(
                      channelSelection.filter((select) => select !== chnl.channelId)
                    );
                  } else {
                    setChannelSelection([...channelSelection, chnl.channelId]);
                  }
                }}
              >
                <Quote className="mr-3 mt-1 h-6 w-6" />
                <div>
                  <h2>{chnl.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-600">{chnl.description}</p>
                </div>
                <CheckboxToggle
                  checked={isChecked}
                  readOnly={true}
                  className="pointer-events-none my-auto ml-auto"
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionButton className="m-2" onClick={updateFollow} state={followStatus}>
          {t('Update')}
        </ActionButton>
        <ActionButton className="m-2" type="secondary" onClick={onCancel}>
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default IdentityIFollowEditDialog;
