import { TargetDrive, getPayloadBytes } from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';
import { useQuery } from '@tanstack/react-query';

export const usePayloadBlob = (
  fileId?: string,
  imageFileKey?: string,
  targetDrive?: TargetDrive
) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetchBlob = async (fileId: string, imageFileKey: string, targetDrive?: TargetDrive) => {
    if (!fileId || !imageFileKey || !targetDrive) return null;

    const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, imageFileKey, {});
    if (!payload) return null;

    return new Blob([payload.bytes], { type: payload.contentType });
  };

  return useQuery({
    queryKey: ['payload-blob', fileId, imageFileKey, targetDrive],
    queryFn: () => fetchBlob(fileId as string, imageFileKey as string, targetDrive),

    enabled: !!fileId && !!imageFileKey,
  });
};
