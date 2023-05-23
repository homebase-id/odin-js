import { useQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  getDecryptedImageUrl,
  getDecryptedImageUrlOverTransit,
} from '@youfoundation/js-lib';
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
          'Comment'
        );
  };

  return {
    fetch: useQuery(
      ['comment-media', odinId, targetDrive?.alias, fileId],
      () => fetch({ odinId, targetDrive, fileId }),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        onError: (er) => {
          console.log(er);
        },
        enabled: !!odinId && !!targetDrive && !!fileId,
      }
    ),
  };
};
