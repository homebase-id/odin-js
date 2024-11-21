import { useQuery } from '@tanstack/react-query';
import { ImageSize, TargetDrive } from '@homebase-id/js-lib/core';
import { getDecryptedImageUrl } from '@homebase-id/js-lib/media';
import { getDecryptedImageUrlOverPeer } from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export interface ImageData {
  url: string;
  naturalSize?: ImageSize;
}

export const useImage = ({
  odinId,
  imageFileId,
  imageFileKey,
  imageDrive,
  size,
  probablyEncrypted,
  naturalSize,
  lastModified,
}: {
  odinId?: string;
  imageFileId?: string;
  imageFileKey?: string;
  imageDrive?: TargetDrive;
  size?: ImageSize;
  probablyEncrypted?: boolean;
  naturalSize?: ImageSize;
  lastModified?: number;
}) => {
  const localHost = window.location.hostname;
  const dotYouClient = useDotYouClientContext();

  const fetchImageData = async (
    odinId: string,
    imageFileId: string | undefined,
    imageFileKey: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    probablyEncrypted?: boolean,
    naturalSize?: ImageSize
  ): Promise<ImageData | undefined> => {
    if (
      imageFileId === undefined ||
      imageFileId === '' ||
      !imageDrive ||
      imageFileKey === undefined ||
      imageFileKey === ''
    )
      return;

    const fetchDataPromise = async () => {
      return {
        url:
          odinId !== localHost
            ? await getDecryptedImageUrlOverPeer(
                dotYouClient,
                odinId,
                imageDrive,
                imageFileId,
                imageFileKey,
                probablyEncrypted,
                lastModified,
                { size }
              )
            : await getDecryptedImageUrl(
                dotYouClient,
                imageDrive,
                imageFileId,
                imageFileKey,
                probablyEncrypted,
                lastModified,
                { size }
              ),
        naturalSize: naturalSize,
      };
    };

    return await fetchDataPromise();
  };

  return {
    fetch: useQuery({
      queryKey: [
        'common-image',
        odinId || localHost,
        imageDrive?.alias,
        imageFileId,
        imageFileKey,
        `${size?.pixelHeight}x${size?.pixelWidth}`,
        lastModified,
      ],
      queryFn: () =>
        fetchImageData(
          odinId || localHost,
          imageFileId,
          imageFileKey,
          imageDrive,
          size,
          probablyEncrypted,
          naturalSize
        ),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!imageFileId && imageFileId !== '' && !!imageFileKey && imageFileKey !== '',
    }),
  };
};
