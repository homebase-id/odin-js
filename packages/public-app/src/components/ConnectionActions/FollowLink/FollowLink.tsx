import { useState } from 'react';
import { ActionLink, HOME_ROOT_PATH, ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';
import { ChannelDefinitionVm } from '@youfoundation/common-app';
import LoginDialog from '../../Dialog/LoginDialog/LoginDialog';

import { Feed } from '@youfoundation/common-app';
import { useFollowDetail } from '../../../hooks/follow/useFollowDetail';
import { Check } from '@youfoundation/common-app';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

const FollowLink = ({
  className,
  channel,
}: {
  className?: string;
  channel?: DriveSearchResult<ChannelDefinitionVm>;
}) => {
  const { isOwner, getIdentity } = useAuth();
  const identity = getIdentity();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { data } = useFollowDetail().fetch;

  if (isOwner) return null;

  const alreadyFollowingThis =
    (!channel && data?.notificationType === 'allNotifications') ||
    (channel &&
      data?.channels?.some((chnl) =>
        stringGuidsEqual(chnl.alias, channel.fileMetadata.appData.uniqueId)
      )) ||
    false;

  return (
    <>
      <ActionLink
        className={`w-auto ${className ?? ''}`}
        href={
          identity
            ? `https://${identity}/owner/follow/following/${window.location.hostname}` +
              (channel ? `?chnl=${channel.fileMetadata.appData.uniqueId}` : '')
            : undefined
        }
        onClick={!identity ? () => setIsLoginOpen(true) : undefined}
        icon={alreadyFollowingThis ? Check : Feed}
        type={alreadyFollowingThis ? 'secondary' : 'primary'}
      >
        <span className="flex flex-col leading-tight">
          {alreadyFollowingThis ? t('Following') : t('Follow')}
          {channel ? (
            <small className="block">
              {ellipsisAtMaxChar(channel.fileMetadata.appData.content.name, 20)}
            </small>
          ) : null}
        </span>
      </ActionLink>
      <LoginDialog
        title={t('Login')}
        isOpen={isLoginOpen}
        onCancel={() => setIsLoginOpen(false)}
        returnPath={`${HOME_ROOT_PATH}action?targetPath=${
          `/owner/follow/following/${window.location.hostname}` +
          (channel ? `?chnl=${channel.fileMetadata.appData.uniqueId}` : '')
        }`}
      >
        {t('You need to login before you can follow someone:')}
      </LoginDialog>
    </>
  );
};

export default FollowLink;
