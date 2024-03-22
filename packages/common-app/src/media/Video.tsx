import { OdinThumbnailImage, OdinVideo, OdinVideoProps } from '@youfoundation/ui-lib';
import { Triangle, useDotYouClient } from '../..';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { useMemo, useState } from 'react';

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

export interface VideoClickToLoadProps extends Omit<OdinVideoProps, 'dotYouClient'> {
  fit?: 'cover' | 'contain';
  preload?: boolean;
  previewThumbnail?: EmbeddedThumb;
}

export const VideoClickToLoad = ({ preload = true, ...props }: VideoClickToLoadProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const [loadVideo, setLoadVideo] = useState(false);
  const [shouldFallback, setShouldFallback] = useState(false);
  return (
    <div
      className={`bg-page-background relative overflow-hidden ${props.className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setLoadVideo(true);
      }}
    >
      {shouldFallback ? (
        loadVideo ? null : (
          <div className="bg-slate-200 dark:bg-slate-800 aspect-video w-full"></div>
        )
      ) : (
        <OdinThumbnailImage
          dotYouClient={dotYouClient}
          {...props}
          className={`${props.className || ''} blur-sm`}
          loadSize={{ pixelWidth: 1920, pixelHeight: 1080 }}
          onError={() => setShouldFallback(true)}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="bg-background/40 rounded-full p-7 border border-foreground/40">
          <Triangle className="text-foreground h-12 w-12" />
        </div>
      </div>

      {preload || loadVideo ? (
        <OdinVideo
          dotYouClient={dotYouClient}
          {...props}
          autoPlay={loadVideo}
          className={`z-0 ${shouldFallback ? 'relative' : 'absolute inset-0'} ${
            props.className || ''
          } ${loadVideo || shouldFallback ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />
      ) : null}
    </div>
  );
};
