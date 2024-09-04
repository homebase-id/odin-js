import { SegmentedVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect } from 'react';
import { useHlsManifest } from '../../hooks/video/useHlsManifest';
import { OdinVideoProps } from './OdinVideo';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import hls from 'hls.js';

interface OdinHlsProps extends OdinVideoProps {
  videoFileHeader: HomebaseFile;
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

export const HlsSource = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  videoMetaData,
  videoRef,
  onFatalError,
}: OdinHlsProps) => {
  const { data: hlsManifest } = useHlsManifest(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive
  ).fetch;

  useEffect(() => {
    const errorHandler = (e: unknown) => {
      console.error('[Odin-Video]-HLS', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  if (!hlsManifest) return null;
  if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
    return <source src={hlsManifest} type={videoMetaData?.mimeType} data-type="direct" />;
  } else if (!hls.isSupported()) {
    console.log('HLS is not supported');
    return null;
  }
};
