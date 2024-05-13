import { ActionLink, ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';
import { ChannelDefinitionVm } from '@youfoundation/common-app';

import { Feed } from '@youfoundation/common-app';
import { useFollowDetail } from '../../../hooks/follow/useFollowDetail';
import { Check } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

const FollowLink = ({
  className,
  channel,
}: {
  className?: string;
  channel?: HomebaseFile<ChannelDefinitionVm>;
}) => {
  const { isOwner, getIdentity } = useAuth();
  const identity = getIdentity();
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
          (identity
            ? `https://${identity}/owner/follow/following/${window.location.hostname}`
            : `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/follow/following/${window.location.hostname}`) +
          (channel ? `?chnl=${channel.fileMetadata.appData.uniqueId}` : '')
        }
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
    </>
  );
};

export default FollowLink;
