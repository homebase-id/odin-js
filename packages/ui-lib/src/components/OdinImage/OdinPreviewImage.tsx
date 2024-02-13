import { DotYouClient, EmbeddedThumb } from '@youfoundation/js-lib/core';
import { useTinyThumb } from '../../hooks/image/useTinyThumb';
import { useEffect, useMemo } from 'react';
import { useImageCache } from '../../hooks/image/useImage';
import { ImageEvents, ImageSource } from './types';

interface OdinPreviewImageProps
  extends ImageSource,
    ImageEvents,
    Omit<
      React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>,
      'onError'
    > {
  dotYouClient: DotYouClient;

  blur?: 'auto' | 'none';
  previewThumbnail?: EmbeddedThumb;
}

// Component to render a tiny thumb image;
// Uses either the previewThumbnail provided or fetches the thumbnail from the server
export const OdinPreviewImage = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  systemFileType,
  previewThumbnail,
  blur,

  onError,
  className,
  ...props
}: OdinPreviewImageProps) => {
  const embeddedThumbUrl = useMemo(
    () =>
      previewThumbnail && `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`,
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
  const fetchTinyFromServer = !embeddedThumbUrl && !cachedImage?.url;

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

  const isTiny = !cachedImage?.url;

  const previewUrl = cachedImage?.url || embeddedThumbUrl || tinyThumb?.url;
  return (
    <img
      src={previewUrl}
      onError={onError}
      className={[blur === 'auto' && isTiny ? 'blur-xl' : undefined, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
};
