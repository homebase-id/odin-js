const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { hasDebugFlag } from '../../helpers/helpers';
import { PlainVideoMetadata, SegmentedVideoMetadata } from '../MediaTypes';
import { getCodecFromMp4Info, getMp4Info } from './VideoSegmenter';

const isDebug = hasDebugFlag();

const loadFFmpeg = async () => {
  try {
    // Pretty hacky way to get the worker working; We have a custom package that has the "correct" vite way of importing the worker;
    //  And thus solves the missing worker URL issue; (FYI, only works on vite enabled consumer projects)
    const { FFmpeg } = await import('@youfoundation/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    // const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    // We use a slimmed down package following this guide: https://javascript.plainenglish.io/slimming-down-ffmpeg-for-a-web-app-compiling-a-custom-version-20a06d36ece1
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

const MB = 1000000;
export const segmentVideoFileWithFfmpeg = async (
  file: File | Blob
): Promise<{ data: Blob; metadata: SegmentedVideoMetadata | PlainVideoMetadata }> => {
  if (!file || file.type !== 'video/mp4') {
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');
  }

  if (file.size < 10 * MB) {
    return {
      data: file,
      metadata: {
        isSegmented: false,
        mimeType: 'video/mp4',
        fileSize: file.size,
      },
    };
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
  };

  return {
    data: videoBlob,
    metadata,
  };
};
