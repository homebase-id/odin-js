import {
  usePortal,
  DialogWrapper,
  t,
  ActionLink,
  useOdinClientContext,
  useCircle,
} from '@homebase-id/common-app';
import { Shield } from '@homebase-id/common-app/icons';
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import { drivesEqual, hasDebugFlag } from '@homebase-id/js-lib/helpers';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { useCommunity, getExtendCirclePermissionUrl } from '../../hooks/community/useCommunity';
import { getTargetDriveFromCommunityId } from '../../providers/CommunityDefinitionProvider';

export const ExtendCriclePermissionDialog = () => {
  const target = usePortal('modal-container');
  const { odinKey, communityKey } = useParams();
  const extendPermissionUrl = useCommunityAccessVerifier(odinKey, communityKey);

  if (!extendPermissionUrl) return null;

  const dialog = (
    <DialogWrapper title={t('Missing permissions')} isSidePanel={false}>
      <p>
        {t(
          `The members of your community do not have the necessary permissions to use it. Without the necessary permissions their functionality will be limited.`
        )}
      </p>
      <div className="mt-5 flex flex-row-reverse">
        <ActionLink href={extendPermissionUrl} icon={Shield}>
          {t('Extend permissions')}
        </ActionLink>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const useCommunityAccessVerifier = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const { data: community } = useCommunity({ odinId, communityId }).fetch;
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();
  const isAdmin = community?.fileMetadata.originalAuthor === loggedOnIdentity;

  const communityCircleId = community?.fileMetadata.appData.content.acl.circleIdList?.[0];
  const { data: circleDef } = useCircle({
    circleId: isAdmin ? communityCircleId : undefined,
  }).fetch;

  if (!circleDef || !communityId || !community || !isAdmin || !communityCircleId) return;
  const communityDrive = getTargetDriveFromCommunityId(communityId);

  const circleHasAccess = circleDef.driveGrants?.some((grant) => {
    if (drivesEqual(grant.permissionedDrive.drive, communityDrive)) {
      const totalGrant = grant?.permissionedDrive?.permission?.reduce((acc, permission) => {
        return acc + permission;
      }, 0);

      return (
        totalGrant >=
        DrivePermissionType.Comment +
          DrivePermissionType.React +
          DrivePermissionType.Read +
          DrivePermissionType.Write
      );
    }
  });

  if (!circleHasAccess && loggedOnIdentity) {
    const extendUrl = getExtendCirclePermissionUrl(
      loggedOnIdentity,
      '',
      '',
      communityDrive,
      [communityCircleId],
      window.location.href
    );

    if (hasDebugFlag()) console.debug(extendUrl);

    return extendUrl;
  }
};
