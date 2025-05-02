import { SegmentedVideoMetadata } from '@homebase-id/js-lib/media';
import { useEffect, useMemo } from 'react';
import { useVideo } from '../../hooks/video/useVideo';
import { OdinVideoProps } from './OdinVideo';

interface OdinEncryptedMseProps extends OdinVideoProps {
  videoMetaData: SegmentedVideoMetadata;
  videoRef: React.RefObject<HTMLVideoElement>;
  onFatalError?: () => void;
}

export const EncryptedMseSource = ({
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
  lastModified,
}: OdinEncryptedMseProps) => {
  const { getChunk } = useVideo(
    odinClient,
    odinId,
    fileId,
    globalTransitId,
    fileKey,
    targetDrive,
    systemFileType,
    lastModified
  );

  const codec = videoMetaData.isSegmented ? videoMetaData.codec : undefined;
  const fileSize = videoMetaData.fileSize;
  const durationInSec = videoMetaData.duration ? videoMetaData.duration / 1000 : undefined;
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorHandler = (e: any) => {
      console.error('[Odin-Video]-Chunked', e);
      onFatalError && onFatalError();
    };

    videoRef.current?.addEventListener('error', errorHandler);
    return () => videoRef.current?.removeEventListener('error', errorHandler);
  });

  const objectUrl = useMemo(() => {
    if (!codec || !fileSize) {
      console.warn('Missing codec or fileSize', videoMetaData);
      return null;
    }

    const chunkSize = 8 * 1024 * 1024;
    let currentChunk = 0;
    let reachedEnd = false;
    let catchingUp = false;

    let removedCounter = 0;

    const innerMediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(innerMediaSource);

    let sourceBuffer: SourceBuffer;
    const sourceOpen = async () => {
      URL.revokeObjectURL(objectUrl);
      sourceBuffer = innerMediaSource.addSourceBuffer(codec);

      // Only way of setting the duration, but some day, it would be better if it's part of the mehd box
      if (durationInSec) innerMediaSource.duration = durationInSec;

      // Fetch the first chunk
      await appendRange(0, chunkSize);

      videoRef.current?.addEventListener('timeupdate', checkVideoBufferedState);
      //   videoRef.current?.addEventListener('seeking', checkVideoBufferedState);
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

    const appendRange = async (start: number, end?: number, isEnd?: boolean) => {
      const chunk = await getChunk(start, end);
      if (chunk) {
        await appendToBuffer(chunk);
        if (isEnd && !reachedEnd) {
          reachedEnd = true;
          sourceBuffer.addEventListener('updateend', () => {
            innerMediaSource.removeEventListener('sourceopen', sourceOpen);
            if (innerMediaSource.readyState === 'open' && !sourceBuffer.updating) {
              innerMediaSource.endOfStream();
              console.debug('endOfStream');
            }
          });
        }
      }
    };

    const appendToBuffer = (chunk: Uint8Array) => {
      return new Promise<void>((resolve, reject) => {
        if (sourceBuffer.updating) {
          sourceBuffer.addEventListener('updateend', () => appendToBuffer(chunk).then(resolve), {
            once: true,
          });
        } else {
          try {
            sourceBuffer.appendBuffer(chunk.buffer);
            resolve();
          } catch (e: unknown) {
            if (
              e &&
              typeof e === 'object' &&
              'name' in e &&
              e.name === 'QuotaExceededError' &&
              videoRef.current &&
              durationInSec
            ) {
              if (removedCounter < 1) {
                // We try and make it better.. But we don't support re-adding removed data ATM;
                console.warn('QuotaExceededError', videoRef.current.currentTime / 2);
                removedCounter++;

                sourceBuffer.remove(0, videoRef.current.currentTime / 2);
                appendToBuffer(chunk).then(resolve);
              }
              // Nothing more we can do.. Just let it play and hope for the best
              resolve();
            } else {
              console.error('appendBuffer error', e);
              onFatalError && onFatalError();
              reject();
            }
          }
        }
      });
    };

    const appendNextChunk = async () => {
      const nextChunkStart = (currentChunk + 1) * chunkSize;
      const nextChunkEnd = nextChunkStart + chunkSize;
      const endOfFile = nextChunkEnd >= fileSize;
      await appendRange(nextChunkStart, !endOfFile ? nextChunkEnd : fileSize - 16, endOfFile);
      currentChunk++;
    };

    const checkVideoBufferedState = async () => {
      if (!videoRef.current) return;
      if (catchingUp) return;

      const currentTime = videoRef.current.currentTime;

      for (let i = 0; videoRef.current && i < videoRef.current.buffered.length; i++) {
        const start = videoRef.current?.buffered.start(i);
        const end = videoRef.current?.buffered.end(i);

        if (videoRef.current?.buffered.length > 1)
          console.warn('Multile buffers have drifted apart, this is not good');

        if (Math.round(currentTime) % 5 === 0) console.debug(currentTime, { start, end });
        if (currentTime >= start && currentTime <= end) {
          // We are buffered, check if we need to fetch the next segment
          if (currentTime > end * 0.5 && !reachedEnd) {
            // Avoid firing the same request multiple times; While the previous request is still running
            catchingUp = true;
            await appendNextChunk();
            catchingUp = false;
          }
        } else {
          catchingUp = true;
          // We don't have data for this part of the video, fetch the chunks we need
          if (!durationInSec) {
            console.error('Missing durationInSec, we cannot fetch the correct chunk');
          } else {
            const currentByteOffset = (fileSize / durationInSec) * currentTime;
            const neededChunkIndex = Math.ceil(currentByteOffset / chunkSize);

            if (neededChunkIndex < currentChunk) {
              // TODO: Can we fix this? Rebulding from index 0?
              console.error('We got behind, not supported');
              return;
            }
            console.warn('Catching up', {
              currentTime,
              durationInSec,
              currentChunk,
              neededChunkIndex,
            });

            while (currentChunk < neededChunkIndex) {
              await appendNextChunk();
            }
            catchingUp = false;
          }
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
