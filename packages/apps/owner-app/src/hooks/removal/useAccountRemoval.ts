import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  accountDeletionStatus,
  markAccountDeletion,
  unmarkAccountDeletion,
} from '../../provider/system/RemoveProvider';

const MINUTE_IN_MS = 60000;

export const useAccountRemoval = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const isAuthenticated = useDotYouClientContext().isAuthenticated();

  const getAccountDeletionStatus = async () => {
    return accountDeletionStatus(dotYouClient);
  };

  const markDeletion = async (currentPassword: string) => {
    return await markAccountDeletion(dotYouClient, currentPassword);
  };

  const unMarkDeletion = async (currentPassword: string) => {
    return await unmarkAccountDeletion(dotYouClient, currentPassword);
  };

  return {
    status: useQuery({
      queryKey: ['removal-status'],
      queryFn: getAccountDeletionStatus,
      enabled: isAuthenticated,
      staleTime: MINUTE_IN_MS * 10,
    }),
    delete: useMutation({
      mutationFn: markDeletion,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['removal-status'] });
      },
    }),
    undelete: useMutation({
      mutationFn: unMarkDeletion,
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['removal-status'] });
      },
    }),
  };
};
