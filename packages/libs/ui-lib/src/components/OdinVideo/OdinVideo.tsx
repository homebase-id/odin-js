import { OdinClient, HomebaseFile, SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';
import { SegmentedVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { useVideo } from '../../hooks/video/useVideo';

import '../../app/app.css';
import { Exclamation } from '../ui/Icons/Exclamation';

// Sources
import { DirectSource } from './DirectSource';
import { EncryptedMseSource } from './EncryptedMseSource';
import { MseSource } from './MseSource';
import { HlsSource } from './HlsSource';

export interface OdinVideoProps {
  odinClient: OdinClient;
  odinId?: string;
  systemFileType?: SystemFileType;
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
  onPlay?: () => void;
}

const MB = 1000000;
export const OdinVideo = (videoProps: OdinVideoProps) => {
  const {
    odinClient,
    odinId,
    targetDrive,
    fileId,
    globalTransitId,
    fileKey,
    className,
    onPlay,
    systemFileType,
    lastModified,
  } = videoProps;

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
    fetchMetadata: { data, isFetched: videoMetaDataFetched },
  } = useVideo(
    odinClient,
    odinId,
    isInView ? fileId : undefined,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType,
    lastModified
  );
  const { metadata: videoMetaData, fileHeader } = data || {};

  useEffect(() => {
    if (videoProps.autoPlay && videoRef.current) videoRef.current.play();
  }, [videoProps.autoPlay]);

  const playback: 'encrypted-mse' | 'mse' | 'hls' | 'encrypted-hls' | 'direct' | undefined =
    useMemo(() => {
      if (!videoMetaDataFetched) return undefined;

      if (
        videoMetaData?.isSegmented &&
        videoMetaData.mimeType === 'application/vnd.apple.mpegurl' &&
        fileHeader?.fileMetadata.isEncrypted
      )
        return 'encrypted-hls';
      if (videoMetaData?.isSegmented && videoMetaData.mimeType === 'application/vnd.apple.mpegurl')
        return 'hls';

      if (
        shouldFallback ||
        (videoMetaDataFetched && !videoMetaData) ||
        (videoMetaData?.fileSize && videoMetaData.fileSize <= 16 * MB)
      )
        return 'direct';

      if (videoMetaData?.isSegmented && fileHeader?.fileMetadata.isEncrypted)
        return 'encrypted-mse';
      if (videoMetaData?.isSegmented) return 'mse';

      return 'direct';
    }, [videoMetaData, videoMetaDataFetched, shouldFallback, fileHeader?.fileMetadata.isEncrypted]);

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
      key={'' + (fileId || globalTransitId) + fileKey + (shouldFallback ? 'fallback' : 'video')} // Get a new video element when we fallback to direct source
      onClick={(e) => e.stopPropagation()}
      autoPlay={videoProps.autoPlay}
      poster={!shouldFallback ? videoProps.poster : undefined}
      data-odinid={odinId}
      data-fileid={fileId}
      data-globaltransitid={globalTransitId}
      data-filekey={fileKey}
      data-playback={playback}
      data-probably-encrypted={videoProps.probablyEncrypted}
      data-filesystem={systemFileType}
      playsInline={true}
      onPlaying={onPlay}
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
        ) : playback === 'encrypted-hls' || playback === 'hls' ? (
          <HlsSource
            {...videoProps}
            videoFileHeader={fileHeader as HomebaseFile}
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
