import { useQuery } from '@tanstack/react-query';
import { TargetDrive } from '@youfoundation/js-lib/core';
import { getDecryptedImageUrl } from '@youfoundation/js-lib/media';
import { getDecryptedImageUrlOverPeer } from '@youfoundation/js-lib/peer';
import { useDotYouClient } from '../../../..';

export const useCommentMedia = ({
  odinId,
  targetDrive,
  fileId,
  fileKey,
}: {
  odinId: string | undefined;
  targetDrive: TargetDrive | undefined;
  fileId: string | undefined;
  fileKey: string | undefined;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetch = async ({
    odinId,
    targetDrive,
    fileId,
    fileKey,
  }: {
    odinId: string | undefined;
    targetDrive: TargetDrive | undefined;
    fileId: string | undefined;
    fileKey: string | undefined;
  }) => {
    if (!odinId || !targetDrive || !fileId || !fileKey) return null;

    const isLocal = odinId === dotYouClient.getIdentity();

    return (await isLocal)
      ? getDecryptedImageUrl(
          dotYouClient,
          targetDrive,
          fileId,
          fileKey,
          {
            pixelWidth: 250,
            pixelHeight: 250,
          },
          undefined,
          'Comment'
        )
      : getDecryptedImageUrlOverPeer(
          dotYouClient,
          odinId,
          targetDrive,
          fileId,
          fileKey,
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
      queryFn: () => fetch({ odinId, targetDrive, fileId, fileKey }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!odinId && !!targetDrive && !!fileId,
    }),
  };
};
