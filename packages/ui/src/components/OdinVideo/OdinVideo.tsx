import { DotYouClient, TargetDrive } from '@youfoundation/js-lib';
import { useMemo, useRef, useState } from 'react';
import { useIntersection } from '../../hooks/intersection/useIntersection';
import useVideo from '../../hooks/video/useVideo';

import '../../app/app.css';

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
  fileId?: string;
  className?: string;
  probablyEncrypted?: boolean;
}

/// based on demo from nickdesaulniers: https://github.com/nickdesaulniers/netfix/blob/gh-pages/demo/bufferWhenNeeded.html
/// But with introduction of segmentMap and other changes to support seeking

const Video = ({ dotYouClient, odinId, targetDrive, fileId, className }: OdinVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const activeObjectUrl = useRef<string>();
  useIntersection(videoRef, () => {
    setIsInView(true);
  });

  const {
    fetchMetadata: { data: videoMetaData, isFetchedAfterMount },
    getChunk,
  } = useVideo(dotYouClient, odinId, isInView ? fileId : undefined, targetDrive);

  const mimeType = videoMetaData?.mimeType;
  const fileLength = videoMetaData?.fileSize;
  const metaDuration = videoMetaData?.duration;
  const segmentMap = videoMetaData?.segmentMap;

  const objectUrl = useMemo(() => {
    if (!mimeType || !fileLength || !metaDuration || !segmentMap || !isFetchedAfterMount)
      return null;

    if (activeObjectUrl.current) {
      return activeObjectUrl.current;
    }

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

    const sourceOpen = async () => {
      URL.revokeObjectURL(objectUrl);
      sourceBuffer = innerMediaSource.addSourceBuffer(mimeType);

      await fetchMetaAndFirstSegment();

      videoRef.current?.addEventListener('timeupdate', checkBuffer);
      videoRef.current?.addEventListener('seeking', seek);
      videoRef?.current?.addEventListener('error', (e) => {
        console.error(e);
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
        sourceBuffer.addEventListener(
          'updateend',
          () => {
            appendToBuffer(chunk);
          },
          { once: true }
        );
      } else {
        sourceBuffer.appendBuffer(chunk.buffer);
      }
    };

    // TODO: Should we await the fetchRange before setting the segment to requested?
    // TODO: Check if we would better use the buffered property of the video element to know what is buffered
    const checkBuffer = () => {
      const currentSegment = getCurrentSegment();

      if (!currentSegment.requested) {
        console.log('current segment not requested, user did seek?');
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
      if (currentSample > currentSegment.samples * 0.6 && !nextSegment.requested) {
        console.log(`time to fetch next chunk ${videoRef.current?.currentTime}s`);
        const nextSegment = segments[currentSegment.sequence + 1];

        fetchRange(nextSegment.start, nextSegment.end);
        nextSegment.requested = true;
        console.debug({ segments });
      }
    };

    // Not sure what to do with this yet? Works better without the abort on seek..
    const seek = () => {
      if (innerMediaSource.readyState === 'open') {
        // sourceBuffer.abort();
      } else {
        console.log('seek but not open?');
        console.log(innerMediaSource.readyState);
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

    const getNextSegment = (currentSegment: Segment) => {
      const nextSegment = segments[currentSegment.sequence + 1];
      return nextSegment;
    };

    const haveAllSegments = () => {
      return segments.every((val) => {
        return !!val.requested;
      });
    };

    innerMediaSource.addEventListener('sourceopen', sourceOpen);

    return objectUrl;
  }, [isFetchedAfterMount]);

  if (!('MediaSource' in window) || (mimeType && !MediaSource.isTypeSupported(mimeType))) {
    console.error(mimeType);
    return <>Unsupported codec</>;
  }

  return (
    <video
      controls
      className={className}
      src={objectUrl || ''}
      ref={videoRef}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export default Video;
