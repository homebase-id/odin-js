import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getMailHealth } from '../../provider/mail/MailHealthProvider';

// The checks behind the Email tab that are not record comparisons. `enabled` is the
// caller's answer to "does this identity have email at all" - the check is expensive
// enough (crypto + outbound HTTPS) that it should not run for the majority who do not.
export const useMailHealth = ({ enabled }: { enabled: boolean }) => {
  const dotYouClient = useDotYouClientContext();

  return {
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
