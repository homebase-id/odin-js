import { useQuery } from '@tanstack/react-query';

import { TargetDrive, DotYouClient, getDecryptedThumbnailMeta } from '@youfoundation/js-lib/core';
import { getDecryptedThumbnailMetaOverTransit } from '@youfoundation/js-lib/transit';

export const useTinyThumb = (
  dotYouClient: DotYouClient,
  odinId?: string,
  imageFileId?: string,
  imageFileKey?: string,
  imageDrive?: TargetDrive
) => {
  const localHost = dotYouClient.getIdentity() || window.location.hostname;

  const fetchImageData = async (
    odinId: string,
    imageFileId?: string,
    imageFileKey?: string,
    imageDrive?: TargetDrive
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
        (await getDecryptedThumbnailMetaOverTransit(
          dotYouClient,
          odinId,
          imageDrive,
          imageFileId,
          imageFileKey
        )) || null
      );

    return (
      (await getDecryptedThumbnailMeta(dotYouClient, imageDrive, imageFileId, imageFileKey)) || null
    );
  };

  return useQuery({
    queryKey: ['tinyThumb', odinId || localHost, imageDrive?.alias, imageFileId, imageFileKey],
    queryFn: () => fetchImageData(odinId || localHost, imageFileId, imageFileKey, imageDrive),

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: Infinity,
    enabled: !!imageFileId && imageFileId !== '' && !!imageFileKey && imageFileKey !== '',
  });
};
