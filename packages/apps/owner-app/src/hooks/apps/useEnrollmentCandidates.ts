import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEnrollmentCandidates, grantCircleToMany } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { invalidateCircles } from '@homebase-id/common-app';

/**
 * The contacts an app's circles were never offered to.
 *
 * Read on the app's own page rather than prompted at install: install is when the owner knows
 * least about what the app does, and a prompt dismissed there is gone for good. This can be
 * ignored for free and is still there next time -- with a larger count, as more reviews happen.
 */
export const useEnrollmentCandidates = (appId?: string) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  return {
    fetch: useQuery({
      queryKey: ['enrollment-candidates', appId],
      queryFn: () => getEnrollmentCandidates(dotYouClient, appId as string),
      enabled: !!appId,
      // Not cached across visits: membership moves for reasons that have nothing to do with this
      // page, and a stale count here offers people who are already members.
      staleTime: 0,
    }),

    enrollAll: useMutation({
      mutationFn: ({ circleId, odinIds }: { circleId: string; odinIds: string[] }) =>
        grantCircleToMany(dotYouClient, circleId, odinIds),
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['enrollment-candidates', appId] });
        // Membership changed, so anything counting members is now wrong.
        invalidateCircles(queryClient);
        queryClient.invalidateQueries({ queryKey: ['connections'] });
      },
    }),
  };
};
