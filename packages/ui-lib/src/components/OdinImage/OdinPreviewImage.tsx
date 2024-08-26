import { DotYouClient, EmbeddedThumb, ImageSize } from '@youfoundation/js-lib/core';
import { useTinyThumb } from '../../hooks/image/useTinyThumb';
import { forwardRef, useEffect, useMemo } from 'react';
import { useImageCache } from '../../hooks/image/useImage';
import { ImageEvents, ImageSource } from './types';
import { ThumbnailMeta } from '@youfoundation/js-lib/media';

export interface OdinPreviewImageProps
  extends ImageSource,
    ImageEvents,
    Omit<
      Omit<
        React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
        'onError'
      >,
      'onLoad'
    > {
  dotYouClient: DotYouClient;

  blockFetchFromServer?: boolean;
  blur?: 'auto' | 'none';
  previewThumbnail?: EmbeddedThumb;

  onLoad?: (naturalSize: ImageSize | undefined, tinyThumb: ThumbnailMeta | undefined) => void;
}

// Component to render a tiny thumb image;
// Uses either the previewThumbnail provided or fetches the thumbnail from the server
// eslint-disable-next-line react/display-name
export const OdinPreviewImage = forwardRef(
  (
    {
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      globalTransitId,
      fileKey,
      systemFileType,
      previewThumbnail,
      blur,

      blockFetchFromServer,

      onError,
      onLoad,
      className,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      lastModified,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      probablyEncrypted,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      preferObjectUrl,
      ...props
    }: OdinPreviewImageProps,
    ref: React.Ref<HTMLImageElement>
  ) => {
    const embeddedThumbUrl = useMemo(
      () =>
        previewThumbnail &&
        `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`,
      [previewThumbnail]
    );

    const { getFromCache } = useImageCache(dotYouClient);
    const cachedImage = useMemo(
      () =>
        fileId && fileKey
          ? getFromCache(odinId, fileId, globalTransitId, fileKey, targetDrive)
          : undefined,
      [fileId]
    );
    const fetchTinyFromServer = !blockFetchFromServer && !embeddedThumbUrl && !cachedImage?.url;

    const {
      data: tinyThumb,
      error: tinyError,
      isFetched: isTinyFetched,
    } = useTinyThumb(
      dotYouClient,
      odinId,
      fetchTinyFromServer ? fileId : undefined,
      globalTransitId,
      fileKey,
      targetDrive,
      systemFileType
    );

    // Error handling
    useEffect(() => {
      if (tinyError) onError?.();
    }, [tinyError]);

    useEffect(() => {
      if (isTinyFetched && !tinyThumb) onError?.();
    }, [tinyThumb, isTinyFetched]);

    const naturalSize: ImageSize | undefined = tinyThumb
      ? { pixelHeight: tinyThumb.naturalSize.height, pixelWidth: tinyThumb.naturalSize.width }
      : cachedImage?.naturalSize || previewThumbnail;

    const isTiny = !cachedImage?.url;

    const previewUrl = cachedImage?.url || embeddedThumbUrl || tinyThumb?.url;
    return (
      <img
        ref={ref}
        src={previewUrl}
        onError={onError}
        onLoad={() =>
          onLoad?.(
            tinyThumb
              ? {
                  pixelHeight: tinyThumb.naturalSize.height,
                  pixelWidth: tinyThumb.naturalSize.width,
                }
              : cachedImage?.naturalSize || previewThumbnail,
            tinyThumb || undefined
          )
        }
        width={naturalSize?.pixelWidth}
        height={naturalSize?.pixelHeight}
        className={[blur === 'auto' && isTiny ? 'blur-xl' : undefined, className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    );
  }
);
