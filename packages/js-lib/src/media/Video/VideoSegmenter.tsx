const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { mergeByteArrays } from '../../helpers/helpers';
import { SegmentedVideoMetadata } from '../MediaTypes';

type ExtendedBuffer = ArrayBuffer & { fileStart?: number };
const MB = 1024 * 1024;
const MB_PER_CHUNK = 5 * MB;

const loadMp4box = async () => {
  try {
    return await import('mp4box');
  } catch (ex) {
    throw new Error('mp4box not found', { cause: ex });
  }
};

export const segmentVideoFile = async (
  file: File | Blob
): Promise<{ data: Blob; metadata: SegmentedVideoMetadata }> => {
  if (!file || file.type !== 'video/mp4') {
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');
  }

  const { createFile, BoxParser, ISOFile } = await loadMp4box();

  // mp4box.js isn't typed, mp4File is a complex object with many properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildInitSegments = (mp4File: any): Uint8Array => {
    let i;
    let trak;

    const moov = new BoxParser.moovBox();
    moov.mvhd = mp4File.moov.mvhd;
    moov.mvhd.duration = mp4File.initial_duration;
    moov.boxes.push(moov.mvhd);

    for (i = 0; i < mp4File.fragmentedTracks.length; i++) {
      trak = mp4File.getTrackById(mp4File.fragmentedTracks[i].id);
      moov.boxes.push(trak);
      moov.traks.push(trak);
    }

    const initBuffer = ISOFile.writeInitializationSegment(
      mp4File.ftyp,
      moov,
      mp4File.moov.mvex && mp4File.moov.mvex.mehd
        ? mp4File.moov.mvex.mehd.fragment_duration
        : mp4File.initial_duration,
      mp4File.moov.traks[0].samples.length > 0 ? mp4File.moov.traks[0].samples[0].duration : 0
    );
    return new Uint8Array(initBuffer);
  };

  return new Promise((resolve, reject) => {
    const mp4File = createFile(true);
    const segmentedBytes: Uint8Array[] = [];
    let videoTrackId: number;
    let segmentedByteOffset = 0;
    const tracksToRead: boolean[] = [];
    const metadata: SegmentedVideoMetadata = {
      isSegmented: true,
      mimeType: '',
      codec: '',
      fileSize: 0,
      duration: 0,
      segmentMap: [],
    };

    mp4File.onError = function (e: unknown) {
      console.error(e);
      reject(e);
    };

    mp4File.onReady = function (info: {
      isFragmented: boolean;
      tracks: {
        id: number;
        nb_samples: number;
        type: string;
        codec: string;
        movie_duration: number;
        movie_timescale: number;
      }[];
      mime: string;
      initial_duration?: number;
      duration: number;
      timescale: number;
      brands: string[];
    }) {
      metadata.codec = info.mime;
      const avTracks = info.tracks?.filter((trck) => ['video', 'audio'].includes(trck.type));
      videoTrackId = avTracks.find((trck) => trck.type === 'video')?.id || 1;
      if (avTracks?.length > 1) {
        metadata.codec = `video/mp4; codecs="${avTracks
          .map((trck) => trck.codec)
          .join(',')}"; profiles="${info.brands.join(',')}'}"`;
      }
      metadata.duration = (info.initial_duration || info.duration) / info.timescale;

      info.tracks.forEach((trck) => {
        tracksToRead[trck.id] = false;
      });

      for (let i = 0; i < info.tracks.length; i++) {
        const track = info.tracks[i];
        const nbSamples = track.nb_samples;
        const durationInSec =
          (track.movie_duration || info.duration || info.initial_duration || 0) /
          (track.movie_timescale || info.timescale || 1);
        const secondsFor8MbOfData = (metadata.duration / file.size) * MB_PER_CHUNK;
        console.debug({ track: i, secondsFor8MbOfData });

        const nbrSamples = Math.round((nbSamples / durationInSec) * secondsFor8MbOfData);
        mp4File.setSegmentOptions(track.id, null, {
          nbSamples: nbrSamples,
        });
      }

      mp4File.initializeSegmentation();
      mp4File.start();
    };

    mp4File.onSegment = function (
      id: number,
      user: unknown,
      buffer: ArrayBuffer,
      sampleNum: number,
      is_last: boolean
    ) {
      if (id === videoTrackId)
        metadata.segmentMap.push({ offset: segmentedByteOffset, samples: sampleNum });

      const segment = new Uint8Array(buffer);
      segmentedByteOffset += segment.length;
      segmentedBytes.push(segment);

      if (is_last) {
        tracksToRead[id] = true;

        if (!tracksToRead.some((trck) => !trck)) {
          console.debug('without offsets: ', metadata.segmentMap);

          const finalMetaBytes = new Uint8Array(buildInitSegments(mp4File));
          const metaOffset = finalMetaBytes.length;
          metadata.segmentMap = [
            { offset: 0, samples: 0 },
            ...metadata.segmentMap.map((segment) => {
              return { ...segment, offset: metaOffset + segment.offset };
            }),
          ];
          console.debug('with offsets: ', metadata.segmentMap);
          const finalSegmentedBytes = mergeByteArrays(segmentedBytes);
          const finalBytes = mergeByteArrays([finalMetaBytes, finalSegmentedBytes]);
          metadata.fileSize = finalBytes.length;

          resolve({
            data: new OdinBlob([finalBytes], { type: 'video/mp4' }),
            metadata,
          });
          return;
        }
      }
    };

    let offset = 0;
    const reader = file.stream().getReader();

    const getNextChunk = ({
      done,
      value,
    }: ReadableStreamReadResult<Uint8Array>): Promise<void> | undefined => {
      if (done) {
        // Indicates that no more data will be received and that all remaining samples should be flushed in the segmentation or extraction process.
        mp4File.stop();
        mp4File.flush();
        return;
      }

      const block: ExtendedBuffer = value.buffer;
      block.fileStart = offset;
      offset += value.length;

      mp4File.appendBuffer(block);
      return reader.read().then(getNextChunk);
    };

    reader.read().then(getNextChunk);
  });
};
