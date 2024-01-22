import { SegmentedVideoMetadata } from '@youfoundation/js-lib/media';
import { useRef, useEffect, useMemo } from 'react';
import { useVideo } from '../../hooks/video/useVideo';
import { OdinVideoProps } from './OdinVideo';

interface OdinEncryptedMseProps extends OdinVideoProps {
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

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
  const duration = videoMetaData.duration;

  useEffect(() => {
    const errorHandler = (e: any) => {
      console.error('[Odin-Video]-Chunked', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  const objectUrl = useMemo(() => {
    if (!codec || !fileLength) {
      console.warn('Missing codec, fileLength, metaDuration or segmentMap', videoMetaData);
      return null;
    }
    if (activeObjectUrl.current) return activeObjectUrl.current;

    const chunkSize = 8 * 1024 * 1024;
    // let fetchedChunks:boolean = new Array(Math.ceil(fileLength / chunkSize));
    let currentChunk = 0;
    let reachedEnd = false;

    const innerMediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(innerMediaSource);

    let sourceBuffer: SourceBuffer;
    const sourceOpen = async () => {
      URL.revokeObjectURL(objectUrl);
      sourceBuffer = innerMediaSource.addSourceBuffer(codec);

      // Fetch the first chunk
      await appendRange(0, chunkSize);

      videoRef.current?.addEventListener('timeupdate', checkVideoBufferedState);
      videoRef.current?.addEventListener('seeking', checkVideoBufferedState);
      videoRef.current?.addEventListener('stalled', checkVideoBufferedState);
      videoRef.current?.addEventListener('waiting', checkVideoBufferedState);
      videoRef.current?.addEventListener('error', (e) => console.error(e));

      // In case we start playing and the readyState isn't good enough...
      videoRef.current?.addEventListener('play', async () => {
        if (!videoRef.current) return;
        console.debug('readyState', videoRef.current?.readyState);

        if (videoRef.current.readyState < 3) await checkVideoBufferedState();
      });
    };

    const appendRange = async (start: number, end: number, isEnd?: boolean) => {
      console.debug('fetching', start, end);
      const chunk = await getChunk(start, end);
      if (chunk) {
        await appendToBuffer(chunk);
        if (isEnd && !reachedEnd) {
          reachedEnd = true;
          sourceBuffer.addEventListener('updateend', () => {
            innerMediaSource.removeEventListener('sourceopen', sourceOpen);
            innerMediaSource.endOfStream();
          });
        }
      }
    };

    const appendToBuffer = (chunk: Uint8Array) => {
      return new Promise<void>((resolve) => {
        if (sourceBuffer.updating) {
          sourceBuffer.addEventListener('updateend', () => appendToBuffer(chunk).then(resolve), {
            once: true,
          });
        } else {
          try {
            sourceBuffer.appendBuffer(chunk.buffer);
          } catch (e: unknown) {
            if (e && typeof e === 'object' && 'name' in e && e.name === 'QuotaExceededError') {
              console.error('appendBuffer error', e);
              onFatalError && onFatalError();
            }
          }
          resolve();
        }
      });
    };

    const checkVideoBufferedState = async () => {
      if (!videoRef.current) return;
      const currentTime = videoRef.current.currentTime;

      for (let i = 0; videoRef.current && i < videoRef.current.buffered.length; i++) {
        const start = videoRef.current?.buffered.start(i);
        const end = videoRef.current?.buffered.end(i);

        if (videoRef.current?.buffered.length > 1)
          console.warn('Buffers have drifted apart, ATM this is not good');

        if (Math.round(currentTime) % 5 === 0) console.log(currentTime, { start, end });

        if (currentTime >= start && currentTime <= end) {
          // We are buffered, check if we need to fetch the next segment
          if (currentTime > end * 0.5 && !reachedEnd) {
            const nextChunkStart = (currentChunk + 1) * chunkSize;
            const nextChunkEnd = nextChunkStart + chunkSize;

            // Halfway to the end, fetch the next chunk
            await appendRange(
              nextChunkStart,
              Math.min(nextChunkEnd, fileLength),
              nextChunkEnd >= fileLength
            );
            currentChunk++;
          }
        } else {
          // We don't have enough data, fetch the chunk for the currenTime
          if (!duration) {
            console.error('Missing duration, we cannot fetch the correct chunk');
          } else {
            const currentByteOffset = (fileLength / duration) * currentTime;
            const currentChunk = Math.round(currentByteOffset / chunkSize);
            console.log({
              currentByteOffset,
              currentChunk,
              duration,
              fileLength,
              currentTime,
            });
          }
          // const chunkStart = Math.floor(currentTime / chunkSize) * chunkSize;
        }
      }
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
