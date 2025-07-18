import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveDefinition,
  editDriveAllowAnonymousRead,
  editDriveMetadata,
  getDriveStatus,
  getDrivesByType,
  TargetDrive,
  editDriveAttributes,
  editDriveAllowSubscriptions,
  setDriveArchiveFlag
} from '@homebase-id/js-lib/core';
import { drivesEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useDrive = (props?: { targetDrive?: TargetDrive; fetchOutboxStatus?: boolean }) => {
  const { targetDrive, fetchOutboxStatus } = props || {};
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetch = async (targetDrive: TargetDrive) => {
    // First check all drives cache for a drive
    const allDrivesInCache = queryClient.getQueryData<DriveDefinition[]>(['drives']);
    if (allDrivesInCache) {
      const foundDrive = allDrivesInCache.find((drive) =>
        drivesEqual(drive.targetDriveInfo, targetDrive)
      );
      if (foundDrive) return foundDrive;
    }

    const allDrives = await (await getDrivesByType(dotYouClient, targetDrive.type, 1, 100)).results;

    return allDrives.find((drive) => drivesEqual(drive.targetDriveInfo, targetDrive)) || null;
  };

  const fetchDriveDetail = async (targetDrive: TargetDrive) =>
    await getDriveStatus(dotYouClient, targetDrive);

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

  const editDriveArchiveFlag = async ({
                                     targetDrive,
                                     newArchiveFlag,
                                   }: {
    targetDrive: TargetDrive;
    newArchiveFlag: boolean;
  }) => {
    return setDriveArchiveFlag(dotYouClient, targetDrive, newArchiveFlag);
  };
  
  const editAllowSubscriptions = async ({
    targetDrive,
    newAllowSubscriptions,
  }: {
    targetDrive: TargetDrive;
    newAllowSubscriptions: boolean;
  }) => {
    return editDriveAllowSubscriptions(dotYouClient, targetDrive, newAllowSubscriptions);
  };

  const editAttributes = async ({
    targetDrive,
    newAttributes,
  }: {
    targetDrive: TargetDrive;
    newAttributes: { [key: string]: string };
  }) => {
    return editDriveAttributes(dotYouClient, targetDrive, newAttributes);
  };

  return {
    fetch: useQuery({
      queryKey: ['drive', `${targetDrive?.alias}_${targetDrive?.type}`],
      queryFn: () => fetch(targetDrive as TargetDrive),
      refetchOnWindowFocus: false,
      enabled: !!targetDrive,
    }),
    fetchStatus: useQuery({
      queryKey: ['drive-status', `${targetDrive?.alias}_${targetDrive?.type}`],
      queryFn: () => fetchDriveDetail(targetDrive as TargetDrive),
      refetchOnWindowFocus: false,
      enabled: !!targetDrive && fetchOutboxStatus,
    }),
    editDescription: useMutation({
      mutationFn: editDescription,
      onSettled: (_data, _error, variables) => {
        invalidateDrive(queryClient, variables.targetDrive);
      },
    }),
    editAttributes: useMutation({
      mutationFn: editAttributes,
      onSettled: (_data, _error, variables) => {
        invalidateDrive(queryClient, variables.targetDrive);
      },
    }),
    editAnonymousRead: useMutation({
      mutationFn: editAnonymousRead,
      onSettled: (_data, _error, variables) => {
        invalidateDrive(queryClient, variables.targetDrive);
      },
    }),
    editDriveArchiveFlag: useMutation({
      mutationFn: editDriveArchiveFlag,
      onSettled: (_data, _error, variables) => {
        invalidateDrive(queryClient, variables.targetDrive);
      },
    }),
    editAllowSubscriptions: useMutation({
      mutationFn: editAllowSubscriptions,
      onSettled: (_data, _error, variables) => {
        invalidateDrive(queryClient, variables.targetDrive);
      },
    }),
  };
};

export const invalidateDrive = (queryClient: QueryClient, targetDrive: TargetDrive) => {
  queryClient.invalidateQueries({
    queryKey: ['drive', `${targetDrive?.alias}_${targetDrive?.type}`],
  });
};
