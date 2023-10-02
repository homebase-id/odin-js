import { BlogConfig } from '@youfoundation/js-lib/public';
import { ApiType, DrivePermissionType, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import useSocialPost from '../socialFeed/useSocialPost';
import { useQuery } from '@tanstack/react-query';
import useSecurityContext from '../securityContext/useSecurityContext';
import { useBlog } from '../blog';
import { useDotYouClient } from '../auth/useDotYouClient';
import { t } from '../../helpers';

interface UseCanReactProps {
  authorOdinId: string;
  channelId: string;
  postId: string;
  isEnabled: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
}

type CanReactDetails =
  | 'NOT_AUTHORIZED'
  | 'NOT_AUTHENTICATED'
  | 'DISABLED_ON_POST'
  | 'ALLOWED'
  | 'UNKNOWN'
  | undefined;

export type CanReact = {
  canReact: 'emoji' | 'comment' | true;
};

export type CantReact = {
  canReact: false;
  details: CanReactDetails;
};

export type CanReactInfo = CanReact | CantReact;

export const useCanReact = ({
  authorOdinId,
  channelId,
  postId,
  isEnabled,
  isOwner,
  isAuthenticated,
}: UseCanReactProps) => {
  const { getIdentity, getApiType } = useDotYouClient();

  const isLocal =
    authorOdinId === window.location.hostname ||
    (getApiType() === ApiType.App && getIdentity() === authorOdinId);
  const isAuthor = (isLocal && isOwner) || authorOdinId === getIdentity();

  const { data: securityContext, isFetched: securityFetched } = useSecurityContext(
    authorOdinId,
    isEnabled
  ).fetch;

  const { data: externalPost } = useSocialPost({
    odinId: isEnabled && !isLocal ? authorOdinId : undefined,
    channelId: channelId,
    postId: postId,
  }).fetch;

  const { data: localBlogData } = useBlog({
    channelId: channelId,
    blogSlug: isEnabled && isLocal ? postId : undefined,
  });

  const isCanReact = async (): Promise<CanReactInfo> => {
    const driveGrants =
      securityContext?.permissionContext.permissionGroups
        .flatMap((group) => group.driveGrants)
        .filter(
          (grant) =>
            stringGuidsEqual(grant.permissionedDrive.drive.alias, channelId) &&
            stringGuidsEqual(grant.permissionedDrive.drive.type, BlogConfig.DriveType)
        ) || [];

    const hasReactDriveReactAccess = driveGrants?.some((grant) =>
      grant.permissionedDrive.permission.includes(DrivePermissionType.React)
    );

    const hasCommentDriveReactAccess = driveGrants?.some((grant) =>
      grant.permissionedDrive.permission.includes(DrivePermissionType.Comment)
    );

    const postFile = localBlogData?.activeBlog || externalPost;

    if (!isAuthenticated) return { canReact: false, details: 'NOT_AUTHENTICATED' };
    if (isAuthor) return { canReact: true };
    if (!hasReactDriveReactAccess && !hasCommentDriveReactAccess)
      return { canReact: false, details: 'NOT_AUTHORIZED' };
    if (
      postFile?.content.reactAccess &&
      postFile.content.reactAccess !== SecurityGroupType.Connected
    )
      return { canReact: false, details: 'DISABLED_ON_POST' };

    // Partial react access
    if (!hasReactDriveReactAccess && hasCommentDriveReactAccess) return { canReact: 'comment' };
    else if (hasReactDriveReactAccess && !hasCommentDriveReactAccess) return { canReact: 'emoji' };

    // Unspecified, default true
    return { canReact: true };
  };

  return useQuery(['can-react', authorOdinId, channelId, postId], isCanReact, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: isEnabled && securityFetched && (!!externalPost || !!localBlogData),
  });
};

export const CantReactDisplay = (cantReact?: CanReactInfo) => {
  // If we can react.. Then it's just partial
  if (cantReact?.canReact === 'emoji')
    return t('You do not have the necessary access to react on this post');
  if (cantReact?.canReact === 'comment')
    return t('You do not have the necessary access to react on this post');

  const details = (cantReact as CantReact)?.details;
  return details === 'NOT_AUTHENTICATED'
    ? t('Reactions are disabled for anonymous users')
    : details === 'NOT_AUTHORIZED'
    ? t('You do not have the necessary access to react on this post')
    : details === 'DISABLED_ON_POST'
    ? t('Reactions are disabled on this post')
    : t("We couldn't determine if you can react on this post");
};
