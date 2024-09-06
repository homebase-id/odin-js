const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { KeyHeader } from '../../core/DriveData/File/DriveFileTypes';
import { base64ToUint8Array, hasDebugFlag, uint8ArrayToBase64 } from '../../helpers/helpers';
import { HlsVideoMetadata, PlainVideoMetadata, SegmentedVideoMetadata } from '../MediaTypes';
import { getCodecFromMp4Info, getMp4Info } from './VideoSegmenter';

const isDebug = hasDebugFlag();

const loadFFmpeg = async () => {
  try {
    // Pretty hacky way to get the worker working; We have a custom package that has the "correct" vite way of importing the worker;
    //  And thus solves the missing worker URL issue; (FYI, only works on vite enabled consumer projects)
    const { FFmpeg } = await import('@homebase-id/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const classWorkerUrl = `KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2NvbnN0IFI9Imh0dHBzOi8vdW5wa2cuY29tL0BmZm1wZWcvY29yZUAwLjEyLjYvZGlzdC91bWQvZmZtcGVnLWNvcmUuanMiO3ZhciBFOyhmdW5jdGlvbih0KXt0LkxPQUQ9IkxPQUQiLHQuRVhFQz0iRVhFQyIsdC5XUklURV9GSUxFPSJXUklURV9GSUxFIix0LlJFQURfRklMRT0iUkVBRF9GSUxFIix0LkRFTEVURV9GSUxFPSJERUxFVEVfRklMRSIsdC5SRU5BTUU9IlJFTkFNRSIsdC5DUkVBVEVfRElSPSJDUkVBVEVfRElSIix0LkxJU1RfRElSPSJMSVNUX0RJUiIsdC5ERUxFVEVfRElSPSJERUxFVEVfRElSIix0LkVSUk9SPSJFUlJPUiIsdC5ET1dOTE9BRD0iRE9XTkxPQUQiLHQuUFJPR1JFU1M9IlBST0dSRVNTIix0LkxPRz0iTE9HIix0Lk1PVU5UPSJNT1VOVCIsdC5VTk1PVU5UPSJVTk1PVU5UIn0pKEV8fChFPXt9KSk7Y29uc3QgYT1uZXcgRXJyb3IoInVua25vd24gbWVzc2FnZSB0eXBlIiksZj1uZXcgRXJyb3IoImZmbXBlZyBpcyBub3QgbG9hZGVkLCBjYWxsIGBhd2FpdCBmZm1wZWcubG9hZCgpYCBmaXJzdCIpLHU9bmV3IEVycm9yKCJmYWlsZWQgdG8gaW1wb3J0IGZmbXBlZy1jb3JlLmpzIik7bGV0IHI7Y29uc3QgTz1hc3luYyh7Y29yZVVSTDp0LHdhc21VUkw6bix3b3JrZXJVUkw6ZX0pPT57Y29uc3Qgbz0hcjt0cnl7dHx8KHQ9UiksaW1wb3J0U2NyaXB0cyh0KX1jYXRjaHtpZih0fHwodD1SLnJlcGxhY2UoIi91bWQvIiwiL2VzbS8iKSksc2VsZi5jcmVhdGVGRm1wZWdDb3JlPShhd2FpdCBpbXBvcnQodCkpLmRlZmF1bHQsIXNlbGYuY3JlYXRlRkZtcGVnQ29yZSl0aHJvdyB1fWNvbnN0IHM9dCxjPW58fHQucmVwbGFjZSgvLmpzJC9nLCIud2FzbSIpLGI9ZXx8dC5yZXBsYWNlKC8uanMkL2csIi53b3JrZXIuanMiKTtyZXR1cm4gcj1hd2FpdCBzZWxmLmNyZWF0ZUZGbXBlZ0NvcmUoe21haW5TY3JpcHRVcmxPckJsb2I6YCR7c30jJHtidG9hKEpTT04uc3RyaW5naWZ5KHt3YXNtVVJMOmMsd29ya2VyVVJMOmJ9KSl9YH0pLHIuc2V0TG9nZ2VyKGk9PnNlbGYucG9zdE1lc3NhZ2Uoe3R5cGU6RS5MT0csZGF0YTppfSkpLHIuc2V0UHJvZ3Jlc3MoaT0+c2VsZi5wb3N0TWVzc2FnZSh7dHlwZTpFLlBST0dSRVNTLGRhdGE6aX0pKSxvfSxsPSh7YXJnczp0LHRpbWVvdXQ6bj0tMX0pPT57ci5zZXRUaW1lb3V0KG4pLHIuZXhlYyguLi50KTtjb25zdCBlPXIucmV0O3JldHVybiByLnJlc2V0KCksZX0sbT0oe3BhdGg6dCxkYXRhOm59KT0+KHIuRlMud3JpdGVGaWxlKHQsbiksITApLEQ9KHtwYXRoOnQsZW5jb2Rpbmc6bn0pPT5yLkZTLnJlYWRGaWxlKHQse2VuY29kaW5nOm59KSxTPSh7cGF0aDp0fSk9PihyLkZTLnVubGluayh0KSwhMCksST0oe29sZFBhdGg6dCxuZXdQYXRoOm59KT0+KHIuRlMucmVuYW1lKHQsbiksITApLEw9KHtwYXRoOnR9KT0+KHIuRlMubWtkaXIodCksITApLE49KHtwYXRoOnR9KT0+e2NvbnN0IG49ci5GUy5yZWFkZGlyKHQpLGU9W107Zm9yKGNvbnN0IG8gb2Ygbil7Y29uc3Qgcz1yLkZTLnN0YXQoYCR7dH0vJHtvfWApLGM9ci5GUy5pc0RpcihzLm1vZGUpO2UucHVzaCh7bmFtZTpvLGlzRGlyOmN9KX1yZXR1cm4gZX0sQT0oe3BhdGg6dH0pPT4oci5GUy5ybWRpcih0KSwhMCksdz0oe2ZzVHlwZTp0LG9wdGlvbnM6bixtb3VudFBvaW50OmV9KT0+e2NvbnN0IG89dCxzPXIuRlMuZmlsZXN5c3RlbXNbb107cmV0dXJuIHM/KHIuRlMubW91bnQocyxuLGUpLCEwKTohMX0saz0oe21vdW50UG9pbnQ6dH0pPT4oci5GUy51bm1vdW50KHQpLCEwKTtzZWxmLm9ubWVzc2FnZT1hc3luYyh7ZGF0YTp7aWQ6dCx0eXBlOm4sZGF0YTplfX0pPT57Y29uc3Qgbz1bXTtsZXQgczt0cnl7aWYobiE9PUUuTE9BRCYmIXIpdGhyb3cgZjtzd2l0Y2gobil7Y2FzZSBFLkxPQUQ6cz1hd2FpdCBPKGUpO2JyZWFrO2Nhc2UgRS5FWEVDOnM9bChlKTticmVhaztjYXNlIEUuV1JJVEVfRklMRTpzPW0oZSk7YnJlYWs7Y2FzZSBFLlJFQURfRklMRTpzPUQoZSk7YnJlYWs7Y2FzZSBFLkRFTEVURV9GSUxFOnM9UyhlKTticmVhaztjYXNlIEUuUkVOQU1FOnM9SShlKTticmVhaztjYXNlIEUuQ1JFQVRFX0RJUjpzPUwoZSk7YnJlYWs7Y2FzZSBFLkxJU1RfRElSOnM9TihlKTticmVhaztjYXNlIEUuREVMRVRFX0RJUjpzPUEoZSk7YnJlYWs7Y2FzZSBFLk1PVU5UOnM9dyhlKTticmVhaztjYXNlIEUuVU5NT1VOVDpzPWsoZSk7YnJlYWs7ZGVmYXVsdDp0aHJvdyBhfX1jYXRjaChjKXtzZWxmLnBvc3RNZXNzYWdlKHtpZDp0LHR5cGU6RS5FUlJPUixkYXRhOmMudG9TdHJpbmcoKX0pO3JldHVybn1zIGluc3RhbmNlb2YgVWludDhBcnJheSYmby5wdXNoKHMuYnVmZmVyKSxzZWxmLnBvc3RNZXNzYWdlKHtpZDp0LHR5cGU6bixkYXRhOnN9LG8pfX0pKCk7Cg==`;
    // const base64Prefix = 'data:application/javascript;base64,';
    const classWorkerBlob = new Blob([atob(classWorkerUrl)], {
      type: 'text/javascript;charset=utf-8',
    });

    let t;
    if (
      ((t = classWorkerBlob && (window.URL || window.webkitURL).createObjectURL(classWorkerBlob)),
      !t)
    )
      throw '';

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
      classWorkerURL: t,
    });

    return ffmpeg;
  } catch (ex) {
    throw new Error('ffmpeg failed to load', { cause: ex });
  }
};

interface VideoData {
  video: Blob;
  metadata: PlainVideoMetadata | SegmentedVideoMetadata;
}

interface HLSData {
  segments: Blob;
  metadata: HlsVideoMetadata;
  keyHeader?: KeyHeader;
}

const toHexString = (byteArray: Uint8Array) => {
  return Array.from(byteArray, function (byte) {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
};

const MB = 1000000;
export const segmentVideoFileWithFfmpeg = async (
  file: File | Blob,
  keyHeader?: KeyHeader
): Promise<VideoData | HLSData> => {
  if (!file || file.type !== 'video/mp4') {
    throw new Error('No (supported) mp4 file found, segmentation only works with mp4 files');
  }

  if (file.size < 10 * MB) {
    return {
      video: file,
      metadata: {
        isSegmented: false,
        mimeType: 'video/mp4',
      },
    };
  }

  const mp4Info = await getMp4Info(file);
  const durationInSeconds = mp4Info.duration / mp4Info.timescale;
  const durationinMiliseconds = durationInSeconds * 1000;
  if (mp4Info.isFragmented) {
    return {
      video: file,
      metadata: {
        isSegmented: true,
        mimeType: 'video/mp4',
        codec: getCodecFromMp4Info(mp4Info),
        fileSize: file.size,
        duration: durationinMiliseconds,
      },
    };
  }

  const ffmpeg = await loadFFmpeg();

  const inputFile = 'input.mp4';
  const outputFile = 'output.m3u8';

  const keyInfoUri =
    (await (async () => {
      if (keyHeader) {
        const keyUrl = 'http://example.com/path/to/encryption.key';
        const keyUri = `hls-encryption.key`;
        const keyInfoUri = `hls-key_inf.txt`;

        //We write a copy, as ffmpeg.writeFile will release the memory after writing
        const copyOfAesKey = base64ToUint8Array(uint8ArrayToBase64(keyHeader.aesKey));
        await ffmpeg.writeFile(keyUri, copyOfAesKey);

        const keyInfo = `${keyUrl}\n${keyUri}\n${toHexString(keyHeader.iv)}`;
        await ffmpeg.writeFile(keyInfoUri, keyInfo);

        return keyInfoUri;
      }
    })()) || {};
  const encryptionInfo = keyHeader
    ? ['-hls_key_info_file', `${keyInfoUri}`] // -hls_enc 1`
    : [];

  const buffer = await file.arrayBuffer();
  await ffmpeg.writeFile(inputFile, new Uint8Array(buffer));
  const status = await ffmpeg.exec([
    '-i',
    inputFile,
    '-codec:',
    'copy',
    ...encryptionInfo,
    '-hls_time',
    '6',
    '-hls_list_size',
    '0',
    '-f',
    'hls',
    '-hls_flags',
    'single_file',
    outputFile,
  ]);
  const dir = await ffmpeg.listDir('.');
  console.log('ffmpeg output dir', dir);
  if (status !== 0) {
    throw new Error('Failed to segment video');
  }

  const segmentData = await ffmpeg.readFile(outputFile.replace('.m3u8', `.ts`));
  const segments = new OdinBlob([segmentData], { type: 'video/mp2t' });

  const data = await ffmpeg.readFile('output.m3u8');
  const playlistBlob = new OdinBlob([data], { type: 'application/vnd.apple.mpegurl' });

  const metadata: HlsVideoMetadata = {
    isSegmented: true,
    mimeType: 'application/vnd.apple.mpegurl',
    hlsPlaylist: await playlistBlob.text(),
  };

  return {
    segments: segments,
    metadata,
  };
};

export const getThumbnailWithFfmpeg = async (videoFile: File | Blob): Promise<Blob> => {
  if (!videoFile || videoFile.type !== 'video/mp4') {
    throw new Error('No (supported) mp4 file found, grabbing a thumb only works with mp4 files');
  }

  const ffmpeg = await loadFFmpeg();

  const buffer = await videoFile.arrayBuffer();
  await ffmpeg.writeFile('input.mp4', new Uint8Array(buffer));

  // ffmpeg.on('log', ({ message }) => {
  //   console.log(message);
  // });
  await ffmpeg.exec(['-i', 'input.mp4', '-frames:v', '1', 'thumb%04d.png']);

  const data = await ffmpeg.readFile('thumb0001.png');
  if (!data) {
    throw new Error('Failed to get thumbnail');
  }

  return new OdinBlob([data], { type: 'image/png' });
};
