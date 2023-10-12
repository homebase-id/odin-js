import { BlogConfig, PostContent } from '@youfoundation/js-lib/public';
import { DrivePermissionType, SecurityGroupType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

import { useQuery } from '@tanstack/react-query';
import useSecurityContext from '../securityContext/useSecurityContext';
import { useDotYouClient } from '../auth/useDotYouClient';
import { t } from '../../helpers';
import { Loader } from '../../ui/Icons/Loader';

interface UseCanReactProps {
  authorOdinId: string;
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
  authorOdinId,
  channelId,
  postContent,
  isEnabled,
  isOwner,
  isAuthenticated,
}: UseCanReactProps) => {
  const { getIdentity } = useDotYouClient();
  const isAuthor = authorOdinId === window.location.hostname || authorOdinId === getIdentity();

  const { data: securityContext, isFetched: securityFetched } = useSecurityContext(
    authorOdinId,
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
    if (postContent?.reactAccess && postContent.reactAccess !== SecurityGroupType.Connected)
      return { canReact: false, details: 'DISABLED_ON_POST' };

    // Partial react access
    if (!hasReactDriveReactAccess && hasCommentDriveReactAccess) return { canReact: 'comment' };
    else if (hasReactDriveReactAccess && !hasCommentDriveReactAccess) return { canReact: 'emoji' };

    // Unspecified, default true
    return { canReact: true };
  };

  return useQuery(['can-react', authorOdinId, channelId, postContent.id], isCanReact, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled: isEnabled && securityFetched,
  });
};

export const CantReactDisplay = (cantReact?: CanReactInfo) => {
  // If we can react.. Then it's just partial
  if (cantReact?.canReact === 'emoji')
    return t('You do not have the necessary access to react on this post');
  if (cantReact?.canReact === 'comment')
    return t('You do not have the necessary access to react on this post');

  const details = (cantReact as CantReact)?.details;
  return details === 'NOT_AUTHENTICATED' ? (
    <p className="text-foreground text-sm italic text-opacity-50">
      {t('Reactions are disabled for anonymous users')}
    </p>
  ) : details === 'NOT_AUTHORIZED' ? (
    <p className="text-foreground text-sm italic text-opacity-50">
      {t('You do not have the necessary access to react on this post')}
    </p>
  ) : details === 'DISABLED_ON_POST' ? (
    <p className="text-foreground text-sm italic text-opacity-50">
      {t('Reactions are disabled on this post')}
    </p>
  ) : details === 'UNKNOWN' ? (
    <p className="text-foreground text-sm italic text-opacity-50">
      {t("We couldn't determine if you can react on this post")}
    </p>
  ) : (
    <div className="flex flex-row items-center gap-2">
      <Loader className="h-5 w-5 text-foreground" />
      <p>{t('Determining if you can react')}</p>
    </div>
  );
};
