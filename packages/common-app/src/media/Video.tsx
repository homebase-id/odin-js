import { OdinImage, OdinVideo, OdinVideoProps } from '@youfoundation/ui-lib';
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
      {shouldFallback ? null : (
        <>
          <OdinImage
            dotYouClient={dotYouClient}
            {...props}
            fit={props.fit}
            avoidPayload={true}
            onError={() => setShouldFallback(true)}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Triangle className="text-background h-16 w-16" />
          </div>
        </>
      )}

      {preload || loadVideo || shouldFallback ? (
        <OdinVideo
          dotYouClient={dotYouClient}
          {...props}
          autoPlay={loadVideo}
          className={`${shouldFallback ? '' : 'absolute inset-0'} ${props.className || ''} ${
            loadVideo || shouldFallback ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        />
      ) : null}
    </div>
  );
};
