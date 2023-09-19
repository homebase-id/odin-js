import { BlogConfig } from '@youfoundation/js-lib/public';
import { ApiType, DrivePermissions, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import useSocialPost from '../socialFeed/useSocialPost';
import { useQuery } from '@tanstack/react-query';
import useSecurityContext from '../securityContext/useSecurityContext';
import { useBlog } from '../blog';
import { useDotYouClient } from '../auth/useDotYouClient';

interface UseCanReactProps {
  authorOdinId: string;
  channelId: string;
  postId: string;
  isEnabled: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
}

export type CanReactDetails =
  | 'NOT_AUTHORIZED'
  | 'NOT_AUTHENTICATED'
  | 'DISABLED_ON_POST'
  | 'ALLOWED'
  | undefined;

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

  const isCanReact = async (): Promise<{
    canReact: boolean;
    details?: CanReactDetails;
  }> => {
    const hasDriveReactAccess = securityContext?.permissionContext.permissionGroups
      .flatMap((group) => group.driveGrants)
      .some(
        (grant) =>
          stringGuidsEqual(grant.permissionedDrive.drive.alias, channelId) &&
          stringGuidsEqual(grant.permissionedDrive.drive.type, BlogConfig.DriveType) &&
          grant.permissionedDrive.permission >= DrivePermissions.React
      );

    const postFile = localBlogData?.activeBlog || externalPost;

    if (isAuthor) return { canReact: true };
    if (!hasDriveReactAccess) return { canReact: false, details: 'NOT_AUTHORIZED' };
    if (!isAuthenticated) return { canReact: false, details: 'NOT_AUTHENTICATED' };
    if (
      postFile?.content.reactAccess &&
      postFile.content.reactAccess !== SecurityGroupType.Connected
    )
      return { canReact: false, details: 'DISABLED_ON_POST' };

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
