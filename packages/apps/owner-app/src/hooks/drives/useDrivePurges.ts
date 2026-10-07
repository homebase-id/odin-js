import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DrivePurgeStatus, getDrivePurges, retryDrivePurge, TargetDrive } from '@homebase-id/js-lib/core';
import { invalidateFiles } from '../files/useFiles';
import { useDotYouClientContext } from '@homebase-id/common-app';

const POLL_MS = 3000;

/**
 * Drives still being emptied or deleted in the background. Polls while any are pending, and when one finishes
 * refreshes what it changed: the drives list and that drive's files.
 */
export const useDrivePurges = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetch = useQuery({
    queryKey: ['drive-purges'],
    queryFn: () => getDrivePurges(dotYouClient),
    // Nothing changes on a purge that has stopped until the owner retries, so only a running one is polled.
    refetchInterval: (query) => (query.state.data?.some((purge) => !purge.stopped) ? POLL_MS : false),
  });

  const previous = useRef<DrivePurgeStatus[] | undefined>(undefined);
  useEffect(() => {
    const now = (fetch.data ?? []).map((purge) => purge.targetDrive.alias);
    const finished = (previous.current ?? []).filter(
      (purge) => !now.includes(purge.targetDrive.alias)
    );
    if (finished.length) {
      queryClient.invalidateQueries({ queryKey: ['drives'] });
      finished.forEach((purge) => invalidateFiles(queryClient, purge.targetDrive, 'all'));
    }
    previous.current = fetch.data;
  }, [fetch.data, queryClient]);

  return {
    fetch,
    retry: useMutation({
      mutationFn: ({ targetDrive }: { targetDrive: TargetDrive }) => retryDrivePurge(dotYouClient, targetDrive),
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['drive-purges'] }),
    }),
  };
};
