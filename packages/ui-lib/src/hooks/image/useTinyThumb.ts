import { useQuery } from '@tanstack/react-query';

import { TargetDrive, DotYouClient, SystemFileType } from '@youfoundation/js-lib/core';
import { getDecryptedThumbnailMeta } from '@youfoundation/js-lib/media';
import { getDecryptedThumbnailMetaOverPeer } from '@youfoundation/js-lib/peer';

export const useTinyThumb = (
  dotYouClient: DotYouClient,
  odinId?: string,
  imageFileId?: string,
  imageGlobalTransitId?: string,
  imageFileKey?: string,
  imageDrive?: TargetDrive,
  systemFileType?: SystemFileType
) => {
  const localHost = dotYouClient.getIdentity() || window.location.hostname;

  const fetchImageData = async (
    odinId: string,
    imageFileId?: string,
    imageGlobalTransitId?: string,
    imageFileKey?: string,
    imageDrive?: TargetDrive,
    systemFileType?: SystemFileType
  ) => {
    if (
      imageFileId === undefined ||
      imageFileId === '' ||
      imageFileKey === undefined ||
      imageFileKey === '' ||
      !imageDrive
    )
      return;

    if (odinId !== localHost)
      return (
        (await getDecryptedThumbnailMetaOverPeer(
          dotYouClient,
          odinId,
          imageDrive,
          imageFileId,
          imageGlobalTransitId,
          imageFileKey,
          systemFileType
        )) || null
      );

    return (
      (await getDecryptedThumbnailMeta(
        dotYouClient,
        imageDrive,
        imageFileId,
        imageFileKey,
        systemFileType
      )) || null
    );
  };

  return useQuery({
    queryKey: [
      'tinyThumb',
      odinId || localHost,
      imageDrive?.alias,
      imageGlobalTransitId || imageFileId,
      imageFileKey,
    ],
    queryFn: () =>
      fetchImageData(
        odinId || localHost,
        imageFileId,
        imageGlobalTransitId,
        imageFileKey,
        imageDrive,
        systemFileType
      ),

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: Infinity,
    enabled: !!imageFileId && imageFileId !== '' && !!imageFileKey && imageFileKey !== '',
  });
};
