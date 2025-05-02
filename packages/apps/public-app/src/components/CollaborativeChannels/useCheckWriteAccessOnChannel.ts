import { useOdinClientContext, useSecurityContext } from '@homebase-id/common-app';
import { HomebaseFile, ApiType, DrivePermissionType } from '@homebase-id/js-lib/core';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import { ChannelDefinition, GetTargetDriveFromChannelId } from '@homebase-id/js-lib/public';

export const useCheckWriteAccessOnChannel = ({
  activeChannel,
}: {
  activeChannel: HomebaseFile<ChannelDefinition>;
}) => {
  const odinClient = useOdinClientContext();
  const { data: securityContext } = useSecurityContext().fetch;

  const channelDrive =
    activeChannel && activeChannel.fileMetadata.appData.uniqueId
      ? GetTargetDriveFromChannelId(activeChannel.fileMetadata.appData.uniqueId)
      : undefined;

  const isOwner = odinClient.getType() === ApiType.Owner;

  const hasWriteAccess =
    channelDrive &&
    securityContext?.permissionContext.permissionGroups.some((group) =>
      group.driveGrants.some(
        (driveGrant) =>
          drivesEqual(driveGrant.permissionedDrive.drive, channelDrive) &&
          driveGrant.permissionedDrive.permission.includes(DrivePermissionType.Write)
      )
    );

  if (
    (!hasWriteAccess && !isOwner) ||
    (!activeChannel.fileMetadata.appData.content.isCollaborative && !isOwner)
  )
    return false;

  return true;
};
