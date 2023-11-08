import {
  DotYouClient,
  PlainVideoMetadata,
  SegmentedVideoMetadata,
  TargetDrive,
} from '@youfoundation/js-lib/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import { useVideo, useVideoUrl } from '../../hooks/video/useVideo';

import '../../app/app.css';
import { Exclamation } from '../ui/Icons/Exclamation';

interface Segment {
  sequence: number;
  start: number;
  end: number | undefined;
  samples: number;
  requested: boolean;
}

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
}

interface OndinChunkedProps extends OdinVideoProps {
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

interface OndinDirectProps extends OdinVideoProps {
  videoMetaData: PlainVideoMetadata | SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

export const OdinVideo = (videoProps: OdinVideoProps) => {
  const { dotYouClient, odinId, targetDrive, fileId, fileKey, className } = videoProps;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [shouldFallback, setShouldFallback] = useState(
    !!videoProps.skipChunkedPlayback || !('MediaSource' in window)
  );
  const [fatalError, setFatalError] = useState(false);
  useIntersection(videoRef, () => setIsInView(true));

  useEffect(() => {
    setShouldFallback(!!videoProps.skipChunkedPlayback || !('MediaSource' in window));
  }, [videoProps.skipChunkedPlayback]);
  const {
    fetchMetadata: { data: videoMetaData },
  } = useVideo(dotYouClient, odinId, isInView ? fileId : undefined, fileKey, targetDrive);

  useEffect(() => {
    if (videoProps.autoPlay && videoRef.current) videoRef.current.play();
  }, [videoProps.autoPlay]);

  const isChunkedPlayback = isInView && videoMetaData?.isSegmented && !shouldFallback;
  const isDirectPlayback =
    isInView && videoMetaData && (videoMetaData.isSegmented === false || shouldFallback);

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
      data-filekey={fileKey}
    >
      {isChunkedPlayback ? (
        <ChunkedSource
          {...videoProps}
          videoMetaData={videoMetaData}
          videoRef={videoRef}
          onFatalError={() => setShouldFallback(true)}
        />
      ) : null}
      {isDirectPlayback ? (
        <DirectSource
          {...videoProps}
          videoMetaData={videoMetaData}
          videoRef={videoRef}
          onFatalError={() => setFatalError(true)}
        />
      ) : null}
    </video>
  );
};

/// based on demo from nickdesaulniers: https://github.com/nickdesaulniers/netfix/blob/gh-pages/demo/bufferWhenNeeded.html
/// But with introduction of segmentMap and other changes to support seeking
const ChunkedSource = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  fileKey,
  videoMetaData,
  videoRef,
  onFatalError,
}: OndinChunkedProps) => {
  const activeObjectUrl = useRef<string>();

  const { getChunk } = useVideo(dotYouClient, odinId, fileId, fileKey, targetDrive);

  const codec = videoMetaData.isSegmented ? videoMetaData.codec : undefined;
  const fileLength = videoMetaData.fileSize;
  const metaDuration = videoMetaData.isSegmented ? videoMetaData.duration : undefined;
  const segmentMap = videoMetaData.isSegmented ? videoMetaData.segmentMap : undefined;

  useEffect(() => {
    const errorHandler = (e: any) => {
      console.error('[Odin-Video]-Chunked', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  const objectUrl = useMemo(() => {
    if (!codec || !fileLength || !metaDuration || !segmentMap) return null;
    if (activeObjectUrl.current) return activeObjectUrl.current;

    const sortedSegmentMap = segmentMap.sort((a, b) => a.offset - b.offset);
    const segments: Segment[] | undefined = sortedSegmentMap.map((segment, index) => {
      const nextOffset = sortedSegmentMap[index + 1];
      return {
        sequence: index,
        start: segment.offset,
        end: nextOffset ? nextOffset.offset - 1 : fileLength,
        samples: segment.samples,
        requested: false,
      };
    });

    const maxSamples = segments.reduce(
      (prev, curr) => (curr.samples > prev ? curr.samples : prev),
      0
    );
    const sampleDuration = metaDuration / maxSamples;
    console.debug({
      sortedSegmentMap,
      segments,
      maxSamples,
      sampleDuration,
      metaDuration,
    });

    const innerMediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(innerMediaSource);
    activeObjectUrl.current = objectUrl;

    let sourceBuffer: SourceBuffer;

    const checkAndFetchNextSegment = async () => {
      const nextSegement = segments.find((s) => s.requested === false) || segments[0];
      await fetchRange(nextSegement.start, nextSegement.end);
      nextSegement.requested = true;
    };

    const sourceOpen = async () => {
      URL.revokeObjectURL(objectUrl);
      sourceBuffer = innerMediaSource.addSourceBuffer(codec);

      await fetchMetaAndFirstSegment();

      videoRef.current?.addEventListener('timeupdate', checkBuffer);
      videoRef.current?.addEventListener('seeking', seek);
      videoRef.current?.addEventListener('stalled', checkAndFetchNextSegment);
      videoRef.current?.addEventListener('waiting', checkAndFetchNextSegment);
      videoRef.current?.addEventListener('error', (e) => {
        console.error(e);
      });
      // In case we start playing and the readyState isn't good enough...
      videoRef.current?.addEventListener('play', async (e) => {
        if (!videoRef.current) return;
        console.debug('readyState', videoRef.current?.readyState);

        if (videoRef.current.readyState < 3) await checkAndFetchNextSegment();
      });
    };

    const fetchMetaAndFirstSegment = async () => {
      const metaSegment = segments[0];
      await fetchRange(metaSegment.start, metaSegment.end);
      metaSegment.requested = true;

      const firstSegment = segments[1];
      await fetchRange(firstSegment.start, firstSegment.end);
      firstSegment.requested = true;
    };

    const fetchRange = async (start: number, end?: number) => {
      console.debug('fetching', start, end);

      const chunk = await getChunk(start, end);
      if (chunk) {
        console.debug('received bytes:', chunk.length);
        appendToBuffer(chunk);
      }
    };

    const appendToBuffer = (chunk: Uint8Array) => {
      if (sourceBuffer.updating) {
        sourceBuffer.addEventListener('updateend', () => appendToBuffer(chunk), { once: true });
      } else {
        try {
          sourceBuffer.appendBuffer(chunk.buffer);
        } catch (e: any) {
          if (e.name === 'QuotaExceededError') {
            console.error('appendBuffer error', e);
            onFatalError && onFatalError();
          }
        }
      }
    };

    // TODO: Should we await the fetchRange before setting the segment to requested?
    // TODO: Check if we would better use the buffered property of the video element to know what is buffered
    const checkBuffer = () => {
      const currentSegment = getCurrentSegment();

      if (!currentSegment.requested) {
        console.debug('current segment not requested, user did seek?');
        fetchRange(currentSegment.start, currentSegment.end);
        currentSegment.requested = true;
        return;
      }

      if (haveAllSegments() || currentSegment.end === fileLength) {
        innerMediaSource.endOfStream();
        videoRef.current?.removeEventListener('timeupdate', checkBuffer);
        return;
      }

      const currentSample = getCurrentSample();
      const nextSegment = getNextSegment(currentSegment);

      if (currentSample > currentSample * 0.3 && nextSegment && !nextSegment.requested) {
        console.debug(`time to fetch next chunk ${videoRef.current?.currentTime}s`);

        fetchRange(nextSegment.start, nextSegment.end);
        nextSegment.requested = true;
        console.debug({ segments });
      }
    };

    // Not sure what to do with this yet? Works better without the abort on seek..
    const seek = () => {
      console.debug('seeking');
      if (innerMediaSource.readyState === 'open') {
        // sourceBuffer.abort();
      } else {
        console.debug('seek but not open?');
        console.debug(innerMediaSource.readyState);
      }
    };

    const getCurrentSample = () => {
      return Math.ceil((videoRef.current?.currentTime || 0) / sampleDuration);
    };

    const getCurrentSegment = () => {
      const currentSample = getCurrentSample();
      const currentSegment = segments.reduce((prev, curr) => {
        if (currentSample < curr.samples && currentSample > prev.samples) {
          return curr;
        } else {
          return prev;
        }
      });

      console.debug({ currentSegment: currentSegment.sequence, currentSample });

      return currentSegment;
    };

    const getNextSegment = (currentSegment: Segment) => segments[currentSegment.sequence + 1];
    const haveAllSegments = () => {
      return segments.every((val) => {
        return !!val.requested;
      });
    };

    innerMediaSource.addEventListener('sourceopen', sourceOpen);

    return objectUrl;
  }, [codec]);

  if (!('MediaSource' in window) || (codec && !MediaSource.isTypeSupported(codec))) {
    console.error(codec);
    return <>Unsupported codec</>;
  }

  return <source src={objectUrl || ''} data-type="MSE" />;
};

// Plain normal playback of a payload, no MSE, no chunks...
const DirectSource = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  fileKey,
  videoMetaData,
  directFileSizeLimit,
  videoRef,
  onFatalError,
}: OndinDirectProps) => {
  const { data: videoUrl } = useVideoUrl(
    dotYouClient,
    odinId,
    fileId,
    fileKey,
    targetDrive,
    directFileSizeLimit
  ).fetch;

  useEffect(() => {
    const errorHandler = (e: any) => {
      console.error('[Odin-Video]-Direct', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  if (!videoUrl) return null;
  return <source src={videoUrl} type={videoMetaData.mimeType} data-type="direct" />;
};
