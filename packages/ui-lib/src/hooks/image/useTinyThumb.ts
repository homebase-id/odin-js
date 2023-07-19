import { useQuery } from '@tanstack/react-query';

import {
  TargetDrive,
  DotYouClient,
  getDecryptedThumbnailMeta,
  ApiType,
} from '@youfoundation/js-lib/core';
import { GetFileEntryFromCache } from '@youfoundation/js-lib/public';
import { getDecryptedThumbnailMetaOverTransit } from '@youfoundation/js-lib/transit';

const useTinyThumb = (
  dotYouClient: DotYouClient,
  odinId?: string,
  imageFileId?: string,
  imageDrive?: TargetDrive
) => {
  const localHost = window.location.hostname;

  const fetchImageData = async (odinId: string, imageFileId?: string, imageDrive?: TargetDrive) => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) return;

    if (odinId !== localHost && dotYouClient.getType() === ApiType.Owner)
      return await getDecryptedThumbnailMetaOverTransit(
        dotYouClient,
        odinId,
        imageDrive,
        imageFileId
      );

    // Look for tiny thumb in already fetched data:
    const thumbFromStaticFile = await GetFileEntryFromCache(imageFileId);
    if (thumbFromStaticFile?.[0]?.header.fileMetadata.appData.previewThumbnail) {
      const previewThumbnail = thumbFromStaticFile[0].header.fileMetadata.appData.previewThumbnail;
      const url = `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;

      return {
        contentType: previewThumbnail.contentType,
        naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
        sizes: thumbFromStaticFile[0].header.fileMetadata.appData.additionalThumbnails ?? [],
        url,
      };
    }

    return (await getDecryptedThumbnailMeta(dotYouClient, imageDrive, imageFileId)) || null;
  };

  return useQuery(
    ['tinyThumb', odinId || localHost, imageFileId, imageDrive?.alias],
    () => fetchImageData(odinId || localHost, imageFileId, imageDrive),
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // 10min
      cacheTime: Infinity,
      enabled: !!imageFileId && imageFileId !== '',
      onError: (error) => {
        console.error(error);
      },
    }
  );
};

export default useTinyThumb;
