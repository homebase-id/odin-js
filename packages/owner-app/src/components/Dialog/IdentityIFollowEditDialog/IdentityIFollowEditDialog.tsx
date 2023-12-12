import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ErrorNotification,
  t,
  useFollowingInfinite,
  useSocialChannels,
} from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { useIdentityIFollow } from '../../../hooks/follow/useIdentityIFollow';

import { Alert } from '@youfoundation/common-app';
import CheckboxToggle from '../../Form/CheckboxToggle';
import { Quote } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { BlogConfig } from '@youfoundation/js-lib/public';

const IdentityIFollowEditDialog = ({
  odinId,
  isOpen,

  defaultValues,

  onConfirm,
  onCancel,
}: {
  odinId: string;
  isOpen: boolean;

  defaultValues?: string[];

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const {
    mutateAsync: follow,
    status: followStatus,
    error: followError,
  } = useFollowingInfinite({}).follow;
  const {
    fetch: { data: identityIFollow, isFetchedAfterMount: identityIFollowLoaded },
    unfollow: { mutateAsync: unfollow, error: unfollowError },
  } = useIdentityIFollow({
    odinId,
  });
  const { data: socialChannels, isFetchedAfterMount: socialChannelsLoaded } = useSocialChannels({
    odinId,
  }).fetch;

  const [channelSelection, setChannelSelection] = useState<string[]>(
    identityIFollow?.channels
      ? identityIFollow.channels.map((chnl) => chnl.alias)
      : socialChannels?.map((chnl) => chnl.fileMetadata.appData.uniqueId as string) || []
  );

  useEffect(() => {
    //Already following
    if (identityIFollow && identityIFollow.channels) {
      // Selected set of channels
      setChannelSelection(
        Array.from(
          new Set([...identityIFollow.channels.map((chnl) => chnl.alias), ...(defaultValues || [])])
        )
      );
    } else if (defaultValues && !identityIFollow) {
      setChannelSelection(defaultValues);
    } else if (socialChannels) {
      // All channels
      setChannelSelection(
        socialChannels.map((chnl) => chnl.fileMetadata.appData.uniqueId as string)
      );
    }
  }, [identityIFollowLoaded, socialChannels]);

  const updateFollow = async () => {
    const selectChannels = channelSelection?.length !== socialChannels?.length;

    if (identityIFollow && channelSelection?.length === 0) unfollow({ odinId: odinId });
    else
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

  if (!isOpen) return null;

  const dialog = (
    <>
      <ErrorNotification error={followError || unfollowError} />
      <DialogWrapper
        title={
          <div className="flex flex-row items-center">
            <Persons className="mr-2 h-6 w-6" /> {identityIFollow ? t('Edit follow') : t('Follow')}{' '}
            {odinId}
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
                channelSelection?.some(
                  (selection) => chnl.fileMetadata.appData.uniqueId === selection
                ) || false;

              return (
                <li
                  key={chnl.fileMetadata.appData.uniqueId}
                  className="flex cursor-pointer flex-row items-center rounded-lg border bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                  onClick={() => {
                    if (isChecked)
                      setChannelSelection(
                        channelSelection.filter(
                          (select) => select !== chnl.fileMetadata.appData.uniqueId
                        )
                      );
                    else
                      setChannelSelection([
                        ...channelSelection,
                        chnl.fileMetadata.appData.uniqueId as string,
                      ]);
                  }}
                >
                  <Quote className="mr-3 mt-1 h-6 w-6" />
                  <div>
                    <h2>{chnl.fileMetadata.appData.content.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-600">
                      {chnl.fileMetadata.appData.content.description}
                    </p>
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
            {identityIFollow ? t('Update') : t('Follow')}
          </ActionButton>
          <ActionButton className="m-2" type="secondary" onClick={onCancel}>
            {t('Cancel')}
          </ActionButton>
        </div>
      </DialogWrapper>
    </>
  );

  return createPortal(dialog, target);
};

export default IdentityIFollowEditDialog;
