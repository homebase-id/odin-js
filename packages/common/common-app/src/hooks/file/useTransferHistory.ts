import { getTransferHistory, SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';
import { useQuery } from '@tanstack/react-query';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useTransferHistory = ({
  fileId,
  targetDrive,
  systemFileType,
}: {
  fileId: string;
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const odinClient = useOdinClientContext();

  const fetchTransferHistory = async () => {
    return getTransferHistory(odinClient, targetDrive, fileId, {
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
