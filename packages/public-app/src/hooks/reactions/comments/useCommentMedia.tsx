import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  TargetDrive,
  getDecryptedImageUrl,
  getDecryptedImageUrlOverTransit,
} from '@youfoundation/js-lib';
import useAuth from '../../auth/useAuth';

const useCommentMedia = ({
  odinId,
  targetDrive,
  fileId,
}: {
  odinId?: string;
  targetDrive?: TargetDrive;
  fileId?: string;
}) => {
  const { getApiType, getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

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

    const isLocal = odinId === dotYouClient.getHostname();

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

export default useCommentMedia;
