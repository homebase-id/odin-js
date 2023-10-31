import { useQuery } from '@tanstack/react-query';
import { TargetDrive, getDecryptedImageUrl } from '@youfoundation/js-lib/core';
import { getDecryptedImageUrlOverTransit } from '@youfoundation/js-lib/transit';
import { useDotYouClient } from '../../../..';

export const useCommentMedia = ({
  odinId,
  targetDrive,
  fileId,
}: {
  odinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({
    odinId,
    targetDrive,
    fileId,
  }: {
    odinId?: string;
    targetDrive?: TargetDrive;
    fileId?: string;
  }) => {
    if (!odinId || !targetDrive || !fileId) {
      return '';
    }

    const isLocal = odinId === dotYouClient.getIdentity();

    return (await isLocal)
      ? getDecryptedImageUrl(
          dotYouClient,
          targetDrive,
          fileId,
          {
            pixelWidth: 250,
            pixelHeight: 250,
          },
          undefined,
          'Comment'
        )
      : getDecryptedImageUrlOverTransit(
          dotYouClient,
          odinId,
          targetDrive,
          fileId,
          {
            pixelWidth: 250,
            pixelHeight: 250,
          },
          undefined,
          'Comment'
        );
  };

  return {
    fetch: useQuery({
      queryKey: ['comment-media', odinId, targetDrive?.alias, fileId],
      queryFn: () => fetch({ odinId, targetDrive, fileId }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!odinId && !!targetDrive && !!fileId,
    }),
  };
};
