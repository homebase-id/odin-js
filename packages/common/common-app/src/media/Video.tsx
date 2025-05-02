import {
  OdinPreviewImage,
  OdinThumbnailImage,
  OdinVideo,
  OdinVideoProps,
  useImage,
} from '@homebase-id/ui-lib';
import { EmbeddedThumb, SystemFileType } from '@homebase-id/js-lib/core';
import { useMemo, useState } from 'react';
import { useOdinClientContext } from '../hooks/auth/useOdinClientContext';
import { Triangle } from '../ui/Icons';

export interface VideoProps extends Omit<OdinVideoProps, 'odinClient'> {
  previewThumbnail?: EmbeddedThumb;
}

export const Video = ({ previewThumbnail, ...props }: VideoProps) => {
  const odinClient = useOdinClientContext();

  const poster = useMemo(() => {
    if (!previewThumbnail || !!props.poster) return undefined;
    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  return (
    <OdinVideo
      odinClient={odinClient}
      poster={poster || props.poster}
      {...props}
      autoPlay={props.autoPlay}
    />
  );
};

export interface VideoClickToLoadProps extends Omit<OdinVideoProps, 'odinClient' | 'autoPlay'> {
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
  const odinClient = useOdinClientContext();

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
          odinClient={odinClient}
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
            odinClient={odinClient}
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

type OdinVideoWrapperProps = Omit<OdinVideoProps, 'odinClient'>;
export const OdinVideoWrapper = ({ ...props }: OdinVideoWrapperProps) => {
  const odinClient = useOdinClientContext();

  const { data: image } = useImage({
    odinClient,
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

  return <OdinVideo odinClient={odinClient} {...props} poster={image ? image.url : props.poster} />;
};
