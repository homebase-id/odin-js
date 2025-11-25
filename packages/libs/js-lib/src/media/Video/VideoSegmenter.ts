const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { hasDebugFlag } from '../../helpers/BrowserUtil';
import { mergeByteArrays } from '../../helpers/DataUtil';
import { SegmentedVideoMetadata } from '../MediaTypes';

type ExtendedBuffer = (ArrayBuffer | ArrayBufferLike) & { fileStart?: number };
const MB = 1024 * 1024;
const MB_PER_CHUNK = 5 * MB;

const isDebug = hasDebugFlag();

interface Mp4Info {
  isFragmented: boolean;
  tracks: {
    id: number;
    nb_samples: number;
    type: string;
    codec: string;
    movie_duration: number;
    movie_timescale: number;
    duration: number;
    timescale: number;
  }[];
  mime: string;
  initial_duration?: number;
  duration: number;
  timescale: number;
  brands: string[];
  rotation?: number
}


// Add this helper function to convert matrix to rotation degrees
const getRotationFromMatrix = (matrix: number[]): number => {
  if (!matrix || matrix.length < 5) return 0;

  // Convert from 16.16 fixed-point to floating point
  const fixedToFloat = (val: number) => val / 65536;

  const [a, b, , c, d] = matrix.map(fixedToFloat);

  // Detect rotation based on matrix pattern
  if (Math.abs(a) < 0.01 && Math.abs(b - 1) < 0.01 &&
    Math.abs(c + 1) < 0.01 && Math.abs(d) < 0.01) {
    return -90; // 270° clockwise
  } else if (Math.abs(a) < 0.01 && Math.abs(b + 1) < 0.01 &&
    Math.abs(c - 1) < 0.01 && Math.abs(d) < 0.01) {
    return 90; // 90° clockwise
  } else if (Math.abs(a + 1) < 0.01 && Math.abs(b) < 0.01 &&
    Math.abs(c) < 0.01 && Math.abs(d + 1) < 0.01) {
    return 180;
  }

  return 0; // No rotation
};


const loadMp4box = async () => {
  try {
    return await import('mp4box').then((m) => m.default);
  } catch (ex) {
    throw new Error('mp4box not found', { cause: ex });
  }
};

export const getMp4Info = async (file: File | Blob): Promise<Mp4Info> => {
  if (!file || file.type !== 'video/mp4')
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');

  const { createFile } = await loadMp4box();
  return new Promise((resolve) => {
    const mp4File = createFile(true);

    mp4File.onReady = function (info: Mp4Info) {
      // Extract rotation from tkhd matrix (first video track)
      let rotation = 0;
      try {
        const moov = mp4File.moov;
        const videoTrak = moov?.traks?.find((trak: any) =>
          trak.mdia?.hdlr?.handler === 'vide'
        );

        if (videoTrak?.tkhd?.matrix) {
          rotation = getRotationFromMatrix(videoTrak.tkhd.matrix);
          isDebug && console.debug('Detected rotation:', rotation, '°');
        }
      } catch (ex) {
        console.warn('Failed to extract rotation matrix', ex);
      }
      resolve({ ...info, rotation });
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

export const getCodecFromMp4Info = (info: Mp4Info): string => {
  let codec = info.mime;
  const avTracks = info.tracks?.filter((trck) => ['video', 'audio'].includes(trck.type));
  if (avTracks?.length > 1) {
    codec = `video/mp4; codecs="${avTracks
      .map((trck) => trck.codec)
      .join(',')}"; profiles="${info.brands.join(',')}"`;
  }

  return codec;
};

export const segmentVideoFile = async (
  file: File | Blob
): Promise<{ data: Blob; metadata: SegmentedVideoMetadata }> => {
  if (!file || file.type !== 'video/mp4')
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');

  const { createFile, BoxParser, ISOFile } = await loadMp4box();
  let mp4Info: Mp4Info | undefined;

  // mp4box.js isn't typed, mp4File is a complex object with many properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildInitSegments = (mp4File: any): Uint8Array => {
    let i;
    let trak;

    // Sanity check
    if (!mp4Info) throw new Error('mp4Info not set');

    const moov = new BoxParser.moovBox();
    moov.mvhd = mp4File.moov.mvhd;
    moov.mvhd.duration = mp4File.initial_duration;
    moov.boxes.push(moov.mvhd);

    for (i = 0; i < mp4File.fragmentedTracks.length; i++) {
      trak = mp4File.getTrackById(mp4File.fragmentedTracks[i].id);

      // TODO: Check if there is a better way than to hope that the indexes still align
      trak.tkhd.duration = mp4Info.tracks[i].duration;
      trak.mdia.mdhd.duration = mp4Info.tracks[i].duration;

      trak.tkhd.timescale = mp4Info.tracks[i].timescale;
      trak.mdia.mdhd.timescale = mp4Info.tracks[i].timescale;

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
    const tracksToRead: boolean[] = [];
    const metadata: SegmentedVideoMetadata = {
      isSegmented: true,
      mimeType: 'video/mp4',
      codec: '',
      fileSize: 0,
      duration: 0,
    };

    mp4File.onError = function (e: unknown) {
      console.error(e);
      reject(e);
    };

    mp4File.onReady = function (info: Mp4Info) {
      mp4Info = info;
      isDebug && console.debug('mp4box ready', info);

      metadata.codec = info.mime;
      const avTracks = info.tracks?.filter((trck) => ['video', 'audio'].includes(trck.type));
      if (avTracks?.length > 1) {
        metadata.codec = `video/mp4; codecs="${avTracks
          .map((trck) => trck.codec)
          .join(',')}"; profiles="${info.brands.join(',')}"`;
      }
      metadata.duration = (info.initial_duration || info.duration) / info.timescale;

      // If the file is already fragmented, we can just return it; With the metadata we have;
      if (info.isFragmented) {
        metadata.fileSize = file.size;

        isDebug && console.debug('already fragmented, returning file', metadata);
        resolve({
          data: file,
          metadata,
        });
        return;
      }

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
        isDebug && console.debug({ track: i, secondsFor8MbOfData });

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
      const segment = new Uint8Array(buffer);
      segmentedBytes.push(segment);

      if (is_last) {
        tracksToRead[id] = true;

        if (!tracksToRead.some((trck) => !trck)) {
          const finalMetaBytes = new Uint8Array(buildInitSegments(mp4File));
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
