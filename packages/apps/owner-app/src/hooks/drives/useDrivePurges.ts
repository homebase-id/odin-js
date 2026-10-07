import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDrivePurges, retryDrivePurge, TargetDrive } from '@homebase-id/js-lib/core';
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
    refetchInterval: (query) => (query.state.data?.length ? POLL_MS : false),
  });

  const pending = useRef<string[]>([]);
  useEffect(() => {
    const now = (fetch.data ?? []).map((purge) => purge.targetDrive.alias);
    const finished = pending.current.filter((alias) => !now.includes(alias));
    if (finished.length) {
      queryClient.invalidateQueries({ queryKey: ['drives'] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && finished.includes(query.queryKey[2] as string),
      });
    }
    pending.current = now;
  }, [fetch.data, queryClient]);

  return {
    fetch,
    retry: useMutation({
      mutationFn: ({ targetDrive }: { targetDrive: TargetDrive }) => retryDrivePurge(dotYouClient, targetDrive),
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['drive-purges'] }),
    }),
  };
};
