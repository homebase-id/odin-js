import { ActionLink, ellipsisAtMaxChar } from '@homebase-id/common-app';
import { t } from '@homebase-id/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';

import { Feed, Check } from '@homebase-id/common-app/icons';
import { useFollowDetail } from '../../../hooks/follow/useFollowDetail';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { ChannelDefinition } from '@homebase-id/js-lib/public';

const FollowLink = ({
  className,
  channel,
}: {
  className?: string;
  channel?: HomebaseFile<ChannelDefinition>;
}) => {
  const { isOwner, getIdentity } = useAuth();
  const loggedInIdentity = getIdentity();
  const { data } = useFollowDetail().fetch;

  if (isOwner) return null;

  const isFollowing =
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
          (loggedInIdentity
            ? `${new DotYouClient({ identity: loggedInIdentity, api: ApiType.Guest }).getRoot()}/owner/follow/following/${window.location.hostname}`
            : `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect/follow/following/${window.location.hostname}`) +
          (channel ? `?chnl=${channel.fileMetadata.appData.uniqueId}` : '')
        }
        icon={isFollowing ? Check : Feed}
        type={isFollowing ? 'secondary' : 'primary'}
      >
        <span className="flex flex-col leading-tight">
          {isFollowing ? t('Following') : t('Follow')}
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
