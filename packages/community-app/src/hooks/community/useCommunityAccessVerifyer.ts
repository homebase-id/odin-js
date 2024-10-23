import { useCircle, useDotYouClientContext } from '@homebase-id/common-app';
import { useCommunity } from './useCommunity';
import { useEffect } from 'react';
import { getTargetDriveFromCommunityId } from '../../providers/CommunityDefinitionProvider';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import { DrivePermissionType } from '@homebase-id/js-lib/core';

export const useCommunityAccessVerifyer = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const { data: community } = useCommunity({ odinId, communityId }).fetch;
  const identity = useDotYouClientContext().getIdentity();
  const isAdmin = community?.fileMetadata.originalAuthor === identity;

  const communityCircleId = community?.fileMetadata.appData.content.acl.circleIdList?.[0];
  const { data: circleDef } = useCircle({
    circleId: isAdmin ? communityCircleId : undefined,
  }).fetch;

  useEffect(() => {
    if (!circleDef || !communityId || !community || !isAdmin || !communityCircleId) return;
    const communityDrive = getTargetDriveFromCommunityId(communityId);

    const circleHasAccess = circleDef.driveGrants?.some((grant) => {
      if (drivesEqual(grant.permissionedDrive.drive, communityDrive)) {
        const totalGrant = grant.permissionedDrive.permission.reduce((acc, permission) => {
          return acc + permission;
        });

        return (
          totalGrant >=
          DrivePermissionType.Comment +
            DrivePermissionType.React +
            DrivePermissionType.Read +
            DrivePermissionType.Write
        );
      }
    });

    if (!circleHasAccess) {
      throw new Error('Circle does not have access to the community');
    }
  }, [circleDef]);

  if (!isAdmin) {
    return;
  }
};
