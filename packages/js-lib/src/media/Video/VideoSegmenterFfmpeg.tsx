const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { hasDebugFlag } from '../../helpers/helpers';
import { SegmentedVideoMetadata } from '../MediaTypes';
import { getCodecFromMp4Info, getMp4Info } from './VideoSegmenter';

const isDebug = hasDebugFlag();

const loadFFmpeg = async () => {
  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    // const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const baseURL = '/ffmpeg-wasm/core@0.12.6/esm';
    const ffmpeg = new FFmpeg();

    if (isDebug)
      ffmpeg.on('log', ({ message }) => {
        console.debug(message);
      });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
  } catch (ex) {
    throw new Error('ffmpeg failed to load', { cause: ex });
  }
};

export const segmentVideoFileWithFfmpeg = async (
  file: File | Blob
): Promise<{ data: Blob; metadata: SegmentedVideoMetadata }> => {
  if (!file || file.type !== 'video/mp4') {
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');
  }

  const mp4Info = await getMp4Info(file);
  if (mp4Info.isFragmented) {
    return {
      data: file,
      metadata: {
        isSegmented: true,
        mimeType: 'video/mp4',
        codec: getCodecFromMp4Info(mp4Info),
        fileSize: file.size,
        duration: mp4Info.duration,
        segmentMap: [],
      },
    };
  }

  const ffmpeg = await loadFFmpeg();

  const buffer = await file.arrayBuffer();
  await ffmpeg.writeFile('input.mp4', new Uint8Array(buffer));

  await ffmpeg.exec([
    '-i',
    'input.mp4',
    '-c:v',
    'copy',
    '-c:a',
    'copy',
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof ',
    'output.mp4',
  ]);

  const data = await ffmpeg.readFile('output.mp4');
  const videoBlob = new OdinBlob([data], { type: 'video/mp4' });

  const metadata: SegmentedVideoMetadata = {
    isSegmented: true,
    mimeType: 'video/mp4',
    codec: getCodecFromMp4Info(mp4Info),
    fileSize: videoBlob.size,
    duration: mp4Info.duration,
    segmentMap: [],
  };

  return {
    data: videoBlob,
    metadata,
  };
};
