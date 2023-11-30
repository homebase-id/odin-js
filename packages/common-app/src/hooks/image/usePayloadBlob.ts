import { TargetDrive, getPayloadBytes } from '@youfoundation/js-lib/core';
import { useQuery } from '@tanstack/react-query';
import { useDotYouClient } from '../../..';

export const usePayloadBlob = (
  fileId?: string,
  imageFileKey?: string,
  targetDrive?: TargetDrive,
  lastModified?: number
) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchBlob = async (fileId: string, imageFileKey: string, targetDrive?: TargetDrive) => {
    if (!fileId || !imageFileKey || !targetDrive) return null;

    const payload = await getPayloadBytes(dotYouClient, targetDrive, fileId, imageFileKey, {
      lastModified,
    });
    if (!payload) return null;

    return new Blob([payload.bytes], { type: payload.contentType });
  };

  return useQuery({
    queryKey: ['payload-blob', fileId, imageFileKey, targetDrive, lastModified],
    queryFn: () => fetchBlob(fileId as string, imageFileKey as string, targetDrive),

    enabled: !!fileId && !!imageFileKey && typeof imageFileKey === 'string',
  });
};
