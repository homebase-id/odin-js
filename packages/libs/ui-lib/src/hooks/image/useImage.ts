import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';

import { ImageSize, TargetDrive, OdinClient, SystemFileType } from '@homebase-id/js-lib/core';
import { getDecryptedImageUrl } from '@homebase-id/js-lib/media';
import {
  getDecryptedImageUrlOverPeer,
  getDecryptedImageUrlOverPeerByGlobalTransitId,
} from '@homebase-id/js-lib/peer';

interface ImageData {
  url: string;
  naturalSize?: ImageSize;
}

export const useImageCache = (odinClient: OdinClient) => {
  const localHost = odinClient.getHostIdentity();
  const queryClient = useQueryClient();

  return {
    getFromCache: (
      odinId: string | undefined,
      imageFileId: string,
      imageGlobalTransitId: string | undefined,
      imageFileKey: string,
      imageDrive: TargetDrive
    ) => {
      const cachedEntries = queryClient
        .getQueryCache()
        .findAll({
          queryKey: [
            'image',
            odinId || localHost,
            imageDrive?.alias,
            imageGlobalTransitId || imageFileId,
            imageFileKey,
          ],
          exact: false,
        })
        .filter((query) => query.state.status === 'success');

      if (cachedEntries?.length)
        return queryClient.getQueryData<ImageData | undefined>(cachedEntries[0].queryKey);
    },
  };
};

export const useImage = (props: {
  odinClient: OdinClient;
  odinId?: string;
  imageFileId?: string | undefined;
  imageGlobalTransitId?: string | undefined;
  imageFileKey?: string | undefined;
  imageDrive?: TargetDrive;
  size?: ImageSize;
  probablyEncrypted?: boolean;
  naturalSize?: ImageSize;
  systemFileType?: SystemFileType;
  lastModified?: number;
  preferObjectUrl?: boolean;
}): { fetch: UseQueryResult<ImageData | undefined, Error> } => {
  const {
    odinClient,
    odinId,
    imageFileId,
    imageGlobalTransitId,
    imageFileKey,
    imageDrive,
    size,
    probablyEncrypted,
    naturalSize,
    systemFileType,
    lastModified,
    preferObjectUrl,
  } = props;

  const localHost = odinClient.getHostIdentity();
  const queryClient = useQueryClient();

  const checkIfWeHaveLargerCachedImage = (
    odinId: string | undefined,
    imageFileId: string,
    imageGlobalTransitId: string | undefined,
    imageFileKey: string,
    imageDrive: TargetDrive,
    size?: ImageSize
  ) => {
    const cachedEntries = queryClient
      .getQueryCache()
      .findAll({
        queryKey: [
          'image',
          odinId || localHost,
          imageDrive.alias,
          imageGlobalTransitId || imageFileId,
          imageFileKey,
        ],
        exact: false,
      })
      .filter((query) => query.state.status !== 'error');

    const cachedEntriesWithSize = cachedEntries.map((entry) => {
      const sizeParts = (entry.queryKey[5] as string)?.split('x');
      const size = sizeParts
        ? { pixelHeight: parseInt(sizeParts[0]), pixelWidth: parseInt(sizeParts[1]) }
        : undefined;

      return {
        ...entry,
        size,
      };
    });

    // Check if we have entry without size (as that would be payload)
    const payload = cachedEntriesWithSize.find((entry) => !entry.size);
    if (payload) return payload;

    if (!size) return cachedEntriesWithSize.find((entry) => !entry.size);

    return cachedEntriesWithSize
      .filter((entry) => !!entry.size)
      .find((entry) => {
        if (
          entry.size &&
          entry.size.pixelHeight >= size.pixelHeight &&
          entry.size.pixelWidth >= size.pixelWidth
        )
          return true;
      });
  };

  const fetchImageData = async (
    odinId: string,
    imageFileId: string | undefined,
    imageGlobalTransitId: string | undefined,
    imageFileKey: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    probablyEncrypted?: boolean,
    naturalSize?: ImageSize,
    preferObjectUrl?: boolean
  ): Promise<ImageData | undefined> => {
    if (
      imageFileId === undefined ||
      imageFileId === '' ||
      !imageDrive ||
      imageFileKey === undefined ||
      imageFileKey === ''
    )
      return;

    const cachedEntry = checkIfWeHaveLargerCachedImage(
      odinId,
      imageFileId,
      imageGlobalTransitId,
      imageFileKey,
      imageDrive,
      size
    );
    if (cachedEntry) {
      const cachedData = queryClient.getQueryData<ImageData | undefined>(cachedEntry.queryKey);
      if (cachedData) return cachedData;
    }

    const fetchDataPromise = async () => {
      return {
        url:
          odinId !== localHost
            ? imageGlobalTransitId
              ? await getDecryptedImageUrlOverPeerByGlobalTransitId(
                odinClient,
                odinId,
                imageDrive,
                imageGlobalTransitId,
                imageFileKey,

                probablyEncrypted,

                lastModified,
                {
                  size,
                  systemFileType,
                  preferObjectUrl,
                }
              )
              : await getDecryptedImageUrlOverPeer(
                odinClient,
                odinId,
                imageDrive,
                imageFileId,
                imageFileKey,
                probablyEncrypted,
                lastModified,
                {
                  size,
                  systemFileType,
                  preferObjectUrl,
                }
              )
            : await getDecryptedImageUrl(
              odinClient,
              imageDrive,
              imageFileId,
              imageFileKey,
              probablyEncrypted,
              lastModified,
              {
                size,
                systemFileType,
                preferObjectUrl,
              }
            ),
        naturalSize: naturalSize,
      };
    };

    return await fetchDataPromise();
  };

  return {
    fetch: useQuery({
      queryKey: [
        'image',
        odinId || localHost,
        imageDrive?.alias,
        imageGlobalTransitId || imageFileId,
        imageFileKey,
        // Rounding the cache key of the size so close enough sizes will be cached together
        size
          ? `${Math.round(size.pixelHeight / 25) * 25}x${Math.round(size?.pixelWidth / 25) * 25}`
          : undefined,
      ],
      queryFn: () =>
        fetchImageData(
          odinId || localHost,
          imageFileId,
          imageGlobalTransitId,
          imageFileKey,
          imageDrive,
          size,
          probablyEncrypted,
          naturalSize,
          preferObjectUrl
        ),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: Infinity,
      enabled: !!imageFileId && imageFileId !== '' && !!imageDrive && !!imageFileKey,
    }),
  };
};
