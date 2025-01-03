import { SegmentedVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect, useMemo } from 'react';
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
  // videoMetaData,
  videoRef,
  onFatalError,
  systemFileType,
  lastModified,
}: OdinHlsProps) => {
  const { data: hlsManifest } = useHlsManifest(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType,
    lastModified
  ).fetch;

  useEffect(() => {
    const errorHandler = (e: unknown) => {
      console.error('[Odin-Video]-HLS', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  const needsHlsJs = useMemo(
    () => hls.isSupported(),
    // hls.isSupported()
    // && (!videoRef.current?.canPlayType('application/vnd.apple.mpegurl') ||
    //   (dotYouClient.getType() === ApiType.App &&
    //     odinId &&
    //     odinId !== dotYouClient.getHostIdentity())),
    [videoRef]
  );

  useEffect(() => {
    if (!needsHlsJs || !hlsManifest) return;
    if (videoRef.current) {
      const hlsInstance = new hls({
        xhrSetup: (xhr) => {
          const headers: Record<string, string> = dotYouClient.getHeaders();
          for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
          }
        },
      });
      hlsInstance.attachMedia(videoRef.current);

      hlsInstance.on(hls.Events.ERROR, (event, data) => {
        console.error('[Odin-Video]-HLS', data);
        onFatalError && onFatalError();
      });
      hlsInstance.loadSource(hlsManifest);

      return () => hlsInstance.destroy();
    }
  }, [needsHlsJs, hlsManifest]);

  if (!hlsManifest) return null;
  if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
    // Browsers that support HLS natively; But apparently not all of them actually do...
    // return <source src={hlsManifest} type={videoMetaData?.mimeType} data-type="direct" />;
    return null;
  } else {
    if (!hls.isSupported()) console.log('HLS is not supported');
    return null;
  }
};
