import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { TargetDrive, OdinClient, SystemFileType } from '@homebase-id/js-lib/core';
import { getDecryptedThumbnailMeta, ThumbnailMeta } from '@homebase-id/js-lib/media';
import { getDecryptedThumbnailMetaOverPeer } from '@homebase-id/js-lib/peer';

export const useTinyThumb = (
  odinClient: OdinClient,
  odinId?: string,
  imageFileId?: string,
  imageGlobalTransitId?: string,
  imageFileKey?: string,
  imageDrive?: TargetDrive,
  systemFileType?: SystemFileType
): UseQueryResult<ThumbnailMeta | null | undefined, Error> => {
  const localHost = odinClient.getHostIdentity();

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
          odinClient,
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
        odinClient,
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
    gcTime: Infinity,
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!imageFileId && imageFileId !== '' && !!imageFileKey && imageFileKey !== '',
  });
};
