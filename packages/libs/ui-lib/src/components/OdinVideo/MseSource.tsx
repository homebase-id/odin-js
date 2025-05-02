import { SegmentedVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect } from 'react';
import { useVideoUrl } from '../../hooks/video/useVideo';
import { OdinVideoProps } from './OdinVideo';

interface OdinMseProps extends OdinVideoProps {
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

export const MseSource = ({
  odinClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  videoMetaData,
  videoRef,
  onFatalError,
  systemFileType,
}: OdinMseProps) => {
  const { data: videoUrl } = useVideoUrl(
    odinClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    undefined,
    systemFileType
  ).fetch;

  useEffect(() => {
    const errorHandler = (e: unknown) => {
      console.error('[Odin-Video]-Direct', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  if (!videoUrl) return null;
  return <source src={videoUrl} type={videoMetaData?.mimeType} data-type="direct" />;
};
