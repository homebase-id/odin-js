import { BlogConfig, PostContent } from '@homebase-id/js-lib/public';
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

import { useQuery } from '@tanstack/react-query';
import { useSecurityContext } from '../securityContext/useSecurityContext';
import { useOdinClientContext } from '../auth/useOdinClientContext';

interface UseCanReactProps {
  odinId: string;
  channelId: string;
  postContent: PostContent;
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
  odinId,
  channelId,
  postContent,
  isEnabled,
  isOwner,
  isAuthenticated,
}: UseCanReactProps) => {
  const loggedInIdentity = useOdinClientContext().getLoggedInIdentity();
  const isAuthor = odinId === loggedInIdentity;
  const { data: securityContext, isFetched: securityFetched } = useSecurityContext(
    odinId,
    isEnabled
  ).fetch;

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

    if (!isAuthenticated && !isOwner) return { canReact: false, details: 'NOT_AUTHENTICATED' };
    if (isAuthor) return { canReact: true };
    if (!hasReactDriveReactAccess && !hasCommentDriveReactAccess)
      return { canReact: false, details: 'NOT_AUTHORIZED' };

    if (postContent?.reactAccess === false) return { canReact: false, details: 'DISABLED_ON_POST' };

    // Partial react access
    if (!hasReactDriveReactAccess && hasCommentDriveReactAccess) return { canReact: 'comment' };
    else if (hasReactDriveReactAccess && !hasCommentDriveReactAccess) return { canReact: 'emoji' };

    // Unspecified, default true
    return { canReact: true };
  };

  return useQuery({
    queryKey: ['can-react', odinId, channelId, postContent.id],
    queryFn: isCanReact,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: isEnabled && securityFetched,
  });
};
