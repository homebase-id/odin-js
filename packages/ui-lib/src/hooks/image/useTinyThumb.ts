import { useQuery } from '@tanstack/react-query';

import { TargetDrive, DotYouClient, getDecryptedThumbnailMeta } from '@youfoundation/js-lib/core';
import { getDecryptedThumbnailMetaOverTransit } from '@youfoundation/js-lib/transit';

export const useTinyThumb = (
  dotYouClient: DotYouClient,
  odinId?: string,
  imageFileId?: string,
  imageDrive?: TargetDrive
) => {
  const localHost = dotYouClient.getIdentity() || window.location.hostname;

  const fetchImageData = async (odinId: string, imageFileId?: string, imageDrive?: TargetDrive) => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) return;

    if (odinId !== localHost)
      return (
        (await getDecryptedThumbnailMetaOverTransit(
          dotYouClient,
          odinId,
          imageDrive,
          imageFileId
        )) || null
      );

    return (await getDecryptedThumbnailMeta(dotYouClient, imageDrive, imageFileId)) || null;
  };

  return useQuery({
    queryKey: ['tinyThumb', odinId || localHost, imageDrive?.alias, imageFileId],
    queryFn: () => fetchImageData(odinId || localHost, imageFileId, imageDrive),

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10min
    gcTime: Infinity,
    enabled: !!imageFileId && imageFileId !== '',
  });
};
