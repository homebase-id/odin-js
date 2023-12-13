import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDotYouClient } from '@youfoundation/common-app';
import {
  accountDeletionStatus,
  markAccountDeletion,
  unmarkAccountDeletion,
} from '../../provider/system/RemoveProvider';

export const useAccountRemoval = () => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

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
    status: useQuery({ queryKey: ['removal-status'], queryFn: getAccountDeletionStatus }),
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
