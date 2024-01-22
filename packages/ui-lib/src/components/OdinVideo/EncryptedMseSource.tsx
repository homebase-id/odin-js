import { SegmentedVideoMetadata } from '@youfoundation/js-lib/media';
import { useRef, useEffect, useMemo } from 'react';
import { useVideo } from '../../hooks/video/useVideo';
import { OdinVideoProps } from './OdinVideo';

interface OdinEncryptedMseProps extends OdinVideoProps {
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

interface Segment {
  sequence: number;
  start: number;
  end: number | undefined;
  samples: number;
  state: 'fetching' | 'fetched' | undefined;
}

/// based on demo from nickdesaulniers: https://github.com/nickdesaulniers/netfix/blob/gh-pages/demo/bufferWhenNeeded.html
/// But with introduction of segmentMap and other changes to support seeking
export const EncryptedMseSource = ({
  dotYouClient,
  odinId,
  targetDrive,
  fileId,
  globalTransitId,
  fileKey,
  videoMetaData,
  videoRef,
  onFatalError,
}: OdinEncryptedMseProps) => {
  const activeObjectUrl = useRef<string>();

  const { getChunk } = useVideo(
    dotYouClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive
  );

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
    if (!codec || !fileLength || !metaDuration || !segmentMap) {
      console.warn('Missing codec, fileLength, metaDuration or segmentMap', videoMetaData);
      return null;
    }
    if (activeObjectUrl.current) return activeObjectUrl.current;

    const sortedSegmentMap = segmentMap.sort((a, b) => a.offset - b.offset);
    const segments: Segment[] | undefined = sortedSegmentMap.map((segment, index) => {
      const nextOffset = sortedSegmentMap[index + 1];
      return {
        sequence: index,
        start: segment.offset,
        end: nextOffset ? nextOffset.offset : undefined,
        samples: segment.samples,
        state: undefined,
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

    let sourceBuffer: SourceBuffer;

    const checkAndFetchNextSegment = async () => {
      const nextSegement = segments.find((s) => !s.state) || segments[0];
      nextSegement.state = 'fetching';
      await fetchRange(nextSegement.start, nextSegement.end);
      nextSegement.state = 'fetched';
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
      metaSegment.state = 'fetching';
      await fetchRange(metaSegment.start, metaSegment.end);
      metaSegment.state = 'fetched';

      const firstSegment = segments[1];
      firstSegment.state = 'fetching';
      await fetchRange(firstSegment.start, firstSegment.end);
      firstSegment.state = 'fetched';
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
    const checkBuffer = async () => {
      const currentSegment = getCurrentSegment();

      if (!currentSegment.state) {
        console.debug('current segment not requested, user did seek?');
        currentSegment.state = 'fetching';
        await fetchRange(currentSegment.start, currentSegment.end);
        currentSegment.state = 'fetched';
        return;
      }

      if (haveAllSegments() || currentSegment.end === fileLength) {
        console.debug('all segments fetched');
        innerMediaSource.endOfStream();
        videoRef.current?.removeEventListener('timeupdate', checkBuffer);
        return;
      }

      const currentSample = getCurrentSample();
      const nextSegment = getNextSegment(currentSegment);

      if (currentSample > currentSample * 0.3 && nextSegment && !nextSegment.state) {
        console.debug(`time to fetch next chunk ${videoRef.current?.currentTime}s`);

        nextSegment.state = 'fetching';
        await fetchRange(nextSegment.start, nextSegment.end);
        nextSegment.state = 'fetched';
        console.debug({ segments });
      }

      // if (videoRef.current && videoRef.current.buffered.length >= 2) {
      //   console.log(
      //     videoRef.current.buffered.length,
      //     'We seem to have reached an error.. Or did you seek?'
      //   );
      // }
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
    const haveAllSegments = () => segments.every((val) => val.state === 'fetched');

    innerMediaSource.addEventListener('sourceopen', sourceOpen);

    return objectUrl;
  }, [codec]);

  if (!('MediaSource' in window) || (codec && !MediaSource.isTypeSupported(codec))) {
    console.error(codec);
    return <>Unsupported codec</>;
  }

  return <source src={objectUrl || ''} data-type="MSE" />;
};
