import { getTransferHistory, SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';
import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useTransferHistory = ({
  fileId,
  targetDrive,
  systemFileType,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const dotYouClient = useDotYouClientContext();

  const fetchTransferHistory = async () => {
    return getTransferHistory(dotYouClient, targetDrive, fileId, {
      systemFileType,
    });
  };

  return {
    fetch: useQuery({
      queryFn: fetchTransferHistory,
      queryKey: ['transferHistory', targetDrive.alias, fileId],
    }),
  };
};
