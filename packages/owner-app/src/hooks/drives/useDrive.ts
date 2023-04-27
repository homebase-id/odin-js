import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DriveDefinition, getDrivesByType, TargetDrive } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useDrive = ({ targetDrive }: { targetDrive?: TargetDrive }) => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetch = async (targetDrive: TargetDrive) => {
    // First check all drives cache for a drive
    const allDrivesInCache = queryClient.getQueryData<DriveDefinition[]>(['drives']);
    if (allDrivesInCache) {
      const foundDrive = allDrivesInCache.find(
        (drive) =>
          drive.targetDriveInfo.alias === targetDrive.alias &&
          drive.targetDriveInfo.type === targetDrive.type
      );
      if (foundDrive) return foundDrive;
    }

    const allDrives = await (await getDrivesByType(dotYouClient, targetDrive.type, 1, 100)).results;

    return (
      allDrives.find(
        (drive) =>
          drive.targetDriveInfo.alias === targetDrive.alias &&
          drive.targetDriveInfo.type === targetDrive.type
      ) || null
    );
  };

  return {
    fetch: useQuery(
      ['drive', `${targetDrive?.alias}_${targetDrive?.type}`],
      () => fetch(targetDrive as TargetDrive),
      {
        refetchOnWindowFocus: false,
        enabled: !!targetDrive,
      }
    ),
  };
};

export default useDrive;
