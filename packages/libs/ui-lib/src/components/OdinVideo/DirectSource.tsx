import { BaseVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect } from 'react';
import { useVideoUrl } from '../../hooks/video/useVideo';
import { OdinVideoProps } from './OdinVideo';

interface OdinDirectProps extends OdinVideoProps {
  videoMetaData: BaseVideoMetadata | undefined;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

// Plain normal playback of a payload, no MSE, no chunks...
export const DirectSource = ({
  odinClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  videoMetaData,
  directFileSizeLimit,
  videoRef,
  onFatalError,
  systemFileType,
}: OdinDirectProps) => {
  const { data: videoUrl } = useVideoUrl(
    odinClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    directFileSizeLimit,
    systemFileType
  ).fetch;

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorHandler = (e: any) => {
      console.error('[Odin-Video]-Direct', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  if (!videoUrl) return null;
  return <source src={videoUrl} type={videoMetaData?.mimeType} data-type="direct" />;
};
