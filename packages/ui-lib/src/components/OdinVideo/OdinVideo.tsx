import { DotYouClient, TargetDrive } from '@youfoundation/js-lib/core';
import { SegmentedVideoMetadata } from '@youfoundation/js-lib/media';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { useVideo } from '../../hooks/video/useVideo';

import '../../app/app.css';
import { Exclamation } from '../ui/Icons/Exclamation';

// Sources
import { DirectSource } from './DirectSource';
import { EncryptedMseSource } from './EncryptedMseSource';
import { MseSource } from './MseSource';

export interface OdinVideoProps {
  dotYouClient: DotYouClient;
  odinId?: string;
  targetDrive: TargetDrive;
  fileId: string | undefined;
  globalTransitId?: string;
  fileKey: string | undefined;
  className?: string;
  probablyEncrypted?: boolean;
  skipChunkedPlayback?: boolean;
  hideControls?: boolean;
  autoPlay?: boolean;
  poster?: string;
  directFileSizeLimit?: number;
  lastModified: number | undefined;
}

const MB = 1000000;
export const OdinVideo = (videoProps: OdinVideoProps) => {
  const { dotYouClient, odinId, targetDrive, fileId, globalTransitId, fileKey, className } =
    videoProps;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [shouldFallback, setShouldFallback] = useState(
    !!videoProps.skipChunkedPlayback || !('MediaSource' in window)
  );
  const [fatalError, setFatalError] = useState(false);
  useIntersection(videoRef, () => setIsInView(true));

  useEffect(
    () => setShouldFallback(!!videoProps.skipChunkedPlayback || !('MediaSource' in window)),
    [videoProps.skipChunkedPlayback]
  );

  const {
    fetchMetadata: { data: videoMetaData, isFetched: videoMetaDataFetched },
  } = useVideo(
    dotYouClient,
    odinId,
    isInView ? fileId : undefined,
    globalTransitId,
    fileKey,
    targetDrive
  );

  useEffect(() => {
    if (videoProps.autoPlay && videoRef.current) videoRef.current.play();
  }, [videoProps.autoPlay]);

  const playback: 'encrypted-mse' | 'mse' | 'direct' | undefined = useMemo(() => {
    if (!videoMetaDataFetched) return undefined;

    if (
      shouldFallback ||
      (videoMetaDataFetched && !videoMetaData) ||
      (videoMetaData?.fileSize && videoMetaData.fileSize <= 16 * MB)
    )
      return 'direct';

    // TODO: Need to know for sure if we are encrypted or not, for now we assume based on the hint
    if (videoMetaData?.isSegmented && videoProps.probablyEncrypted) return 'encrypted-mse';
    if (videoMetaData?.isSegmented) return 'mse';

    return 'direct';
  }, [videoMetaData, videoMetaDataFetched, shouldFallback, videoProps.probablyEncrypted]);

  if (fatalError) {
    return (
      <div
        className={`${className} flex aspect-video items-center justify-center bg-white/75 dark:bg-black/75`}
      >
        <Exclamation className="mr-2 h-6 w-6" /> <p>Something went wrong</p>
      </div>
    );
  }

  return (
    <video
      controls={!videoProps.hideControls}
      data-state="video-placeholder"
      className={className}
      ref={videoRef}
      key={shouldFallback ? 'fallback' : 'video'} // Get a new video element when we fallback to direct source
      onClick={(e) => e.stopPropagation()}
      autoPlay={videoProps.autoPlay}
      poster={!shouldFallback ? videoProps.poster : undefined}
      data-odinid={odinId}
      data-fileid={fileId}
      data-globaltransitid={globalTransitId}
      data-filekey={fileKey}
      data-playback={playback}
      data-probably-encrypted={videoProps.probablyEncrypted}
      playsInline={true}
    >
      {isInView && playback !== undefined ? (
        playback === 'encrypted-mse' ? (
          <EncryptedMseSource
            {...videoProps}
            videoMetaData={videoMetaData as SegmentedVideoMetadata}
            videoRef={videoRef}
            onFatalError={() => setShouldFallback(true)}
          />
        ) : playback === 'mse' ? (
          <MseSource
            {...videoProps}
            videoMetaData={videoMetaData as SegmentedVideoMetadata}
            videoRef={videoRef}
            onFatalError={() => setShouldFallback(true)}
          />
        ) : (
          <DirectSource
            {...videoProps}
            videoMetaData={videoMetaData || undefined}
            videoRef={videoRef}
            onFatalError={() => setFatalError(true)}
          />
        )
      ) : null}
    </video>
  );
};
