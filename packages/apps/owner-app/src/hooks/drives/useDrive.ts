import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DriveDefinition,
  editDriveAllowAnonymousRead,
  editDriveMetadata,
  getDriveStatus,
  getDrivesByType,
  TargetDrive,
  editDriveAttributes,
  editDriveAllowSubscriptions, editDriveArchiveFlag,
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

    const allDrives = (await getDrivesByType(dotYouClient, targetDrive.type, 1, 100)).results;

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

  const editAllowSubscriptions = async ({
    targetDrive,
    newAllowSubscriptions,
  }: {
    targetDrive: TargetDrive;
    newAllowSubscriptions: boolean;
  }) => {
    return editDriveAllowSubscriptions(dotYouClient, targetDrive, newAllowSubscriptions);
  };

  const editArchiveFlag = async ({
    targetDrive,
    newArchived,
  }: {
    targetDrive: TargetDrive;
    newArchived: boolean;
  }) => {
    return editDriveArchiveFlag(dotYouClient, targetDrive, newArchived);
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
      queryKey: ['drives', `${targetDrive?.alias}_${targetDrive?.type}`],
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
      onSettled: (data, _error, variables) => {
        const { targetDrive, newDescription } = variables;
        if (data === true) {
          updateDriveCache(queryClient, targetDrive, (base) => ({
            ...base,
            metadata: newDescription,
          }), 'editDescription');
        } else {
          console.warn('[owner-app:useDrive] editDescription mutation did not return true');
        }
      },
    }),
    editAttributes: useMutation({
      mutationFn: editAttributes,
      onSettled: (data, _error, variables) => {
        const { targetDrive, newAttributes } = variables;
        if (data === true) {
          updateDriveCache(queryClient, targetDrive, (base) => ({
            ...base,
            attributes: { ...(base.attributes || {}), ...(newAttributes || {}) },
          }), 'editAttributes');
        } else {
          console.warn('[owner-app:useDrive] editAttributes mutation did not return true');
        }
      },
    }),
    editAnonymousRead: useMutation({
      mutationFn: editAnonymousRead,
      onSettled: (data, _error, variables) => {
        const { targetDrive, newAllowAnonymousRead } = variables;
        if (data === true) {
          updateDriveCache(queryClient, targetDrive, (base) => ({
            ...base,
            allowAnonymousReads: newAllowAnonymousRead,
          }), 'editAnonymousRead');
        } else {
          console.warn('[owner-app:useDrive] editAnonymousRead mutation did not return true');
        }
      },
    }),
    editAllowSubscriptions: useMutation({
      mutationFn: editAllowSubscriptions,
      onSettled: (data, _error, variables) => {
        const { targetDrive, newAllowSubscriptions } = variables;
        if (data === true) {
          updateDriveCache(queryClient, targetDrive, (base) => ({
            ...base,
            allowSubscriptions: newAllowSubscriptions,
          }), 'editAllowSubscriptions');
        } else {
          console.warn('[owner-app:useDrive] editAllowSubscriptions mutation did not return true');
        }
      },
    }),
    editArchiveStatus: useMutation({
      mutationFn: editArchiveFlag,
      onSettled: (data, _error, variables) => {
        const { targetDrive, newArchived } = variables;
        if (data === true) {
          updateDriveCache(queryClient, targetDrive, (base) => ({
            ...base,
            isArchived: newArchived,
          }), 'editArchiveStatus');
        } else {
          console.warn('[owner-app:useDrive] editArchiveStatus mutation did not return true');
        }
      },
    }),
  };
};

// Helper to keep the ['drives'] list cache in sync with the individual drive cache
export const syncDriveIntoDrivesList = (
  queryClient: QueryClient,
  updated: DriveDefinition
) => {
  const listKey = ['drives'] as const;
  const list = queryClient.getQueryData<DriveDefinition[]>(listKey);
  if (!list || list.length === 0) return;
  const targetDrive = updated.targetDriveInfo;
  const updatedList = list.map((d) =>
    drivesEqual(d.targetDriveInfo, targetDrive) ? updated : d
  );
  const changed = updatedList.some((d, i) => d !== list[i]);
  if (changed) queryClient.setQueryData(listKey, updatedList, { updatedAt: Date.now() });

  return;


};

// Helper to update the individual drive cache and sync the main list using an updater function
export const updateDriveCache = (
  queryClient: QueryClient,
  targetDrive: TargetDrive,
  buildUpdated: (base: DriveDefinition) => DriveDefinition,
  label: string
) => {
  const individualKey = ['drives', `${targetDrive?.alias}_${targetDrive?.type}`] as const;
  const fromIndividual = queryClient.getQueryData<DriveDefinition | null>(individualKey);
  if (fromIndividual) {
    const updated = buildUpdated(fromIndividual);
    queryClient.setQueryData(individualKey, updated);
    syncDriveIntoDrivesList(queryClient, updated);
  } else {
    console.warn(`[owner-app:useDrive] ${label}: no cached drive found to update`);
  }
};



