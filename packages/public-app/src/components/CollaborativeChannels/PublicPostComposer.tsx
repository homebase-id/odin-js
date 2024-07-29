import { PostComposer, useDotYouClient, useSecurityContext } from '@youfoundation/common-app';
import { HomebaseFile, ApiType, DrivePermissionType } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { ChannelDefinition, GetTargetDriveFromChannelId } from '@youfoundation/js-lib/public';

export const PublicPostComposer = ({
  activeChannel,
}: {
  activeChannel: HomebaseFile<ChannelDefinition>;
}) => {
  const hasWriteAccess = useCheckWriteAccessOnChannel({ activeChannel });
  if (!hasWriteAccess) return null;

  return (
    <div className="mb-8 max-w-xl">
      <PostComposer
        forcedChannel={activeChannel || undefined}
        className="mb-2 w-full rounded-md border-gray-200 border-opacity-60 bg-background p-4 shadow-sm dark:border-gray-800 lg:border"
      />
    </div>
  );
};

export const useCheckWriteAccessOnChannel = ({
  activeChannel,
}: {
  activeChannel: HomebaseFile<ChannelDefinition>;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const { data: securityContext } = useSecurityContext().fetch;

  const channelDrive =
    activeChannel && activeChannel.fileMetadata.appData.uniqueId
      ? GetTargetDriveFromChannelId(activeChannel.fileMetadata.appData.uniqueId)
      : undefined;

  const isOwner = dotYouClient.getType() === ApiType.Owner;

  const hasWriteAccess =
    channelDrive &&
    securityContext?.permissionContext.permissionGroups.some((group) =>
      group.driveGrants.some(
        (driveGrant) =>
          stringGuidsEqual(driveGrant.permissionedDrive.drive.alias, channelDrive.alias) &&
          stringGuidsEqual(driveGrant.permissionedDrive.drive.type, channelDrive.type) &&
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
