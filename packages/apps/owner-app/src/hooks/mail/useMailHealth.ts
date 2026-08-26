import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getMailHealth, publishMailDnsRecords } from '../../provider/mail/MailHealthProvider';

// The checks behind the Email tab that are not record comparisons. `enabled` is the
// caller's answer to "does this identity have email at all" - the check is expensive
// enough (crypto + outbound HTTPS) that it should not run for the majority who do not.
export const useMailHealth = ({ enabled }: { enabled: boolean }) => {
  const dotYouClient = useDotYouClientContext();

  const queryClient = useQueryClient();

  return {
    // Publishing changes what the DNS lookups will return, so the record rows are
    // invalidated on success. Propagation is not instant - the caller should say so rather
    // than let a still-red row read as a failed write.
    publishDnsRecords: useMutation({
      mutationFn: () => publishMailDnsRecords(dotYouClient),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dns-health'] });
        queryClient.invalidateQueries({ queryKey: ['mail-health'] });
      },
    }),
    fetchMailHealth: useQuery({
      queryKey: ['mail-health'],
      queryFn: () => getMailHealth(dotYouClient),
      enabled,
      // Matches useDnsHealth: live checks run on demand, not on a poll
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }),
  };
};
