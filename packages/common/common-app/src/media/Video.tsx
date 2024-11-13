import {
  OdinPreviewImage,
  OdinThumbnailImage,
  OdinVideo,
  OdinVideoProps,
  useImage,
} from '@homebase-id/ui-lib';
import { EmbeddedThumb, SystemFileType } from '@homebase-id/js-lib/core';
import { useMemo, useState } from 'react';
import { useDotYouClient } from '../hooks';
import { Triangle } from '../ui/Icons';

export interface VideoProps extends Omit<OdinVideoProps, 'dotYouClient'> {
  previewThumbnail?: EmbeddedThumb;
}

export const Video = ({ previewThumbnail, ...props }: VideoProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const poster = useMemo(() => {
    if (!previewThumbnail || !!props.poster) return undefined;
    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  return (
    <OdinVideo
      dotYouClient={dotYouClient}
      poster={poster || props.poster}
      {...props}
      autoPlay={props.autoPlay}
    />
  );
};

export interface VideoClickToLoadProps extends Omit<OdinVideoProps, 'dotYouClient' | 'autoPlay'> {
  fit?: 'cover' | 'contain';
  preload?: boolean;
  previewThumbnail?: EmbeddedThumb;
  systemFileType?: SystemFileType;
}

export const VideoClickToLoad = ({
  preload = false,
  previewThumbnail,
  probablyEncrypted,
  ...props
}: VideoClickToLoadProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const [loadVideo, setLoadVideo] = useState(false);
  const [imageHasError, setImageHasError] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);

  const [previewLoaded, setPreviewLoaded] = useState(false);

  return (
    <div
      className={`${props.className?.includes('absolute') ? '' : 'relative'} cursor-pointer overflow-hidden ${props.className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setLoadVideo(true);
      }}
    >
      {/* OdinPreviewImage provides the aspect ratio spacing; If it had an error, we let the video decide on the necessary size */}
      {!imageHasError ? (
        <OdinPreviewImage
          dotYouClient={dotYouClient}
          {...props}
          className={`${props.className || ''} ${previewLoaded || preload || loadVideo ? 'opacity-0' : 'opacity-100'} blur-sm`}
          previewThumbnail={previewThumbnail}
          systemFileType={props.systemFileType}
          onError={() => setImageHasError(true)}
        />
      ) : null}

      {/* We only load the thumbnail if the video isn't already set to preload */}
      {!loadVideo && !preload ? (
        imageHasError ? (
          <div className="bg-slate-200 dark:bg-slate-800 aspect-video w-full h-full"></div>
        ) : (
          <OdinThumbnailImage
            dotYouClient={dotYouClient}
            {...props}
            className={`${props.className || ''} absolute inset-0 blur-sm ${props.className?.includes('object-') ? '' : 'object-cover'}`}
            loadSize={{ pixelWidth: 100, pixelHeight: 100 }}
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setImageHasError(true)}
            probablyEncrypted={probablyEncrypted}
            width={1920}
            height={1080}
          />
        )
      ) : null}

      {preload || loadVideo ? (
        <OdinVideoWrapper
          {...props}
          autoPlay={loadVideo}
          onPlay={() => setPlayingVideo(true)}
          className={imageHasError ? 'w-full h-full' : 'absolute inset-0 w-full h-full'}
        />
      ) : null}

      {!playingVideo ? (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="bg-background/40 rounded-full p-7 border border-foreground/20">
            <Triangle className="text-foreground h-12 w-12" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

type OdinVideoWrapperProps = Omit<OdinVideoProps, 'dotYouClient'>;
export const OdinVideoWrapper = ({ ...props }: OdinVideoWrapperProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const { data: image } = useImage({
    dotYouClient,
    probablyEncrypted: props.probablyEncrypted,
    imageDrive: props.targetDrive,
    imageFileId: props.fileId,
    imageFileKey: props.fileKey,
    imageGlobalTransitId: props.globalTransitId,
    lastModified: props.lastModified,
    odinId: props.odinId,
    preferObjectUrl: true,
    size: { pixelWidth: 100, pixelHeight: 100 },
  }).fetch;

  return (
    <OdinVideo dotYouClient={dotYouClient} {...props} poster={image ? image.url : props.poster} />
  );
};
