import { useQuery } from '@tanstack/react-query';
import {
  TargetDrive,
  DotYouClient,
  GetFileEntryFromCache,
  getDecryptedThumbnailMeta,
  base64ToUint8Array,
  getDecryptedThumbnailMetaOverTransit,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useTinyThumb = (odinId?: string, imageFileId?: string, imageDrive?: TargetDrive) => {
  const localHost = window.location.hostname;
  const { getSharedSecret, getApiType } = useAuth();

  const fetchImageData = async (odinId: string, imageFileId?: string, imageDrive?: TargetDrive) => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) {
      return;
    }

    const dotYouClient = new DotYouClient({ api: getApiType(), sharedSecret: getSharedSecret() });

    if (odinId !== localHost) {
      return await getDecryptedThumbnailMetaOverTransit(
        dotYouClient,
        odinId,
        imageDrive,
        imageFileId
      );
    }

    // Look for tiny thumb in already fetched data:
    const thumbFromStaticFile = await GetFileEntryFromCache(imageFileId);
    if (thumbFromStaticFile?.[0]?.header.fileMetadata.appData.previewThumbnail) {
      const previewThumbnail = thumbFromStaticFile[0].header.fileMetadata.appData.previewThumbnail;
      const buffer = base64ToUint8Array(previewThumbnail.content);
      const url = window.URL.createObjectURL(new Blob([buffer]));

      return {
        naturalSize: { width: previewThumbnail.pixelWidth, height: previewThumbnail.pixelHeight },
        sizes: thumbFromStaticFile[0].header.fileMetadata.appData.additionalThumbnails ?? [],
        url,
      };
    }

    return await getDecryptedThumbnailMeta(dotYouClient, imageDrive, imageFileId);
  };

  return useQuery(
    ['tinyThumb', odinId || localHost, imageFileId, imageDrive],
    () => fetchImageData(odinId || localHost, imageFileId, imageDrive),
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!imageFileId && imageFileId !== '',
    }
  );
};

export default useTinyThumb;
