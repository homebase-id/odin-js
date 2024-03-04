import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveDefinition,
  editDriveAllowAnonymousRead,
  editDriveMetadata,
  getDrivesByType,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';

export const useDrive = (props?: { targetDrive?: TargetDrive }) => {
  const { targetDrive } = props || {};
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

  const editDescription = async ({
    targetDrive,
    newDescription,
  }: {
    targetDrive: TargetDrive;
    newDescription: string;
  }) => {
    return editDriveMetadata(dotYouClient, targetDrive, newDescription);
  };

  const editAnonymousRead = async ({
    targetDrive,
    newAllowAnonymousRead,
  }: {
    targetDrive: TargetDrive;
    newAllowAnonymousRead: boolean;
  }) => {
    return editDriveAllowAnonymousRead(dotYouClient, targetDrive, newAllowAnonymousRead);
  };

  return {
    fetch: useQuery({
      queryKey: ['drive', `${targetDrive?.alias}_${targetDrive?.type}`],
      queryFn: () => fetch(targetDrive as TargetDrive),
      refetchOnWindowFocus: false,
      enabled: !!targetDrive,
    }),
    editDescription: useMutation({
      mutationFn: editDescription,
      onSettled: (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['drive', `${variables.targetDrive?.alias}_${variables.targetDrive?.type}`],
        });
      },
    }),
    editAnonymousRead: useMutation({
      mutationFn: editAnonymousRead,
      onSettled: (_data, _error, variables) => {
        queryClient.invalidateQueries({
          queryKey: ['drive', `${variables.targetDrive?.alias}_${variables.targetDrive?.type}`],
        });
      },
    }),
  };
};
