const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { KeyHeader } from '../../core/DriveData/File/DriveFileTypes';
import { base64ToUint8Array, hasDebugFlag, uint8ArrayToBase64 } from '../../helpers/helpers';
import { HlsVideoMetadata, PlainVideoMetadata, SegmentedVideoMetadata } from '../MediaTypes';
import { getCodecFromMp4Info, getMp4Info } from './VideoSegmenter';

const isDebug = hasDebugFlag();

/**
 * Returns additional FFmpeg arguments that preserveify the rotation metadata is kept
 * in the HLS segments when doing stream-copy.
 * 
 * For videos that have a displaymatrix rotation (most Android portrait videos)
 * we add `-vf format=yuv420p` – this forces FFmpeg to re-inject the side-data
 * into the MPEG-TS segments without re-encoding.
 * 
 * If there is no rotation → returns an empty array (no unnecessary filters)
 */
const getRotationPreserveArgs = (rotation?: number): string[] => {
  if (rotation === undefined) {
    return []; // no rotation side data → nothing to do
  }


  // Normalize to 0–359 range and treat 0° and 180° as "no special handling needed"
  const normalized = Math.abs(((rotation % 360) + 360) % 360);
  const needsRotationFix = normalized !== 0 && normalized !== 180;


  if (!needsRotationFix) {
    // No rotation → pure stream copy (no re-encode)
    return ['-c:v', 'copy'];
  }

  // Rotation detected → fast re-encode to fix orientation permanently
  // ultrafast preset + high CRF = near-lossless, ~10-30% slower than copy
  return [
    '-c:v', 'libx264',
    '-preset', 'ultrafast',  // Fastest preset
    '-crf', '25',            // High quality (0=lossless, 23=default)
  ];
};


const loadFFmpeg = async () => {
  try {
    // Pretty hacky way to get the worker working; We have a custom package that has the "correct" vite way of importing the worker;
    //  And thus solves the missing worker URL issue; (FYI, only works on vite enabled consumer projects)
    const { FFmpeg } = await import('@homebase-id/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    // base64 encoded worker loader (source: Vite worker loader; Source in `./ffmpeg-wasm-worker-loader.js`):
    const classWorkerUrl = `KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2NvbnN0IFI9Imh0dHBzOi8vdW5wa2cuY29tL0BmZm1wZWcvY29yZUAwLjEyLjEwL2Rpc3QvdW1kL2ZmbXBlZy1jb3JlLmpzIjt2YXIgRTsoZnVuY3Rpb24odCl7dC5MT0FEPSJMT0FEIix0LkVYRUM9IkVYRUMiLHQuV1JJVEVfRklMRT0iV1JJVEVfRklMRSIsdC5SRUFEX0ZJTEU9IlJFQURfRklMRSIsdC5ERUxFVEVfRklMRT0iREVMRVRFX0ZJTEUiLHQuUkVOQU1FPSJSRU5BTUUiLHQuQ1JFQVRFX0RJUj0iQ1JFQVRFX0RJUiIsdC5MSVNUX0RJUj0iTElTVF9ESVIiLHQuREVMRVRFX0RJUj0iREVMRVRFX0RJUiIsdC5FUlJPUj0iRVJST1IiLHQuRE9XTkxPQUQ9IkRPV05MT0FEIix0LlBST0dSRVNTPSJQUk9HUkVTUyIsdC5MT0c9IkxPRyIsdC5NT1VOVD0iTU9VTlQiLHQuVU5NT1VOVD0iVU5NT1VOVCJ9KShFfHwoRT17fSkpO2NvbnN0IGE9bmV3IEVycm9yKCJ1bmtub3duIG1lc3NhZ2UgdHlwZSIpLGY9bmV3IEVycm9yKCJmZm1wZWcgaXMgbm90IGxvYWRlZCwgY2FsbCBgYXdhaXQgZmZtcGVnLmxvYWQoKWAgZmlyc3QiKSx1PW5ldyBFcnJvcigiZmFpbGVkIHRvIGltcG9ydCBmZm1wZWctY29yZS5qcyIpO2xldCByO2NvbnN0IE89YXN5bmMoe2NvcmVVUkw6dCx3YXNtVVJMOm4sd29ya2VyVVJMOmV9KT0+e2NvbnN0IG89IXI7dHJ5e3R8fCh0PVIpLGltcG9ydFNjcmlwdHModCl9Y2F0Y2h7aWYodHx8KHQ9Ui5yZXBsYWNlKCIvdW1kLyIsIi9lc20vIikpLHNlbGYuY3JlYXRlRkZtcGVnQ29yZT0oYXdhaXQgaW1wb3J0KHQpKS5kZWZhdWx0LCFzZWxmLmNyZWF0ZUZGbXBlZ0NvcmUpdGhyb3cgdX1jb25zdCBzPXQsYz1ufHx0LnJlcGxhY2UoLy5qcyQvZywiLndhc20iKSxiPWV8fHQucmVwbGFjZSgvLmpzJC9nLCIud29ya2VyLmpzIik7cmV0dXJuIHI9YXdhaXQgc2VsZi5jcmVhdGVGRm1wZWdDb3JlKHttYWluU2NyaXB0VXJsT3JCbG9iOmAke3N9IyR7YnRvYShKU09OLnN0cmluZ2lmeSh7d2FzbVVSTDpjLHdvcmtlclVSTDpifSkpfWB9KSxyLnNldExvZ2dlcihpPT5zZWxmLnBvc3RNZXNzYWdlKHt0eXBlOkUuTE9HLGRhdGE6aX0pKSxyLnNldFByb2dyZXNzKGk9PnNlbGYucG9zdE1lc3NhZ2Uoe3R5cGU6RS5QUk9HUkVTUyxkYXRhOml9KSksb30sbD0oe2FyZ3M6dCx0aW1lb3V0Om49LTF9KT0+e3Iuc2V0VGltZW91dChuKSxyLmV4ZWMoLi4udCk7Y29uc3QgZT1yLnJldDtyZXR1cm4gci5yZXNldCgpLGV9LG09KHtwYXRoOnQsZGF0YTpufSk9PihyLkZTLndyaXRlRmlsZSh0LG4pLCEwKSxEPSh7cGF0aDp0LGVuY29kaW5nOm59KT0+ci5GUy5yZWFkRmlsZSh0LHtlbmNvZGluZzpufSksUz0oe3BhdGg6dH0pPT4oci5GUy51bmxpbmsodCksITApLEk9KHtvbGRQYXRoOnQsbmV3UGF0aDpufSk9PihyLkZTLnJlbmFtZSh0LG4pLCEwKSxMPSh7cGF0aDp0fSk9PihyLkZTLm1rZGlyKHQpLCEwKSxOPSh7cGF0aDp0fSk9Pntjb25zdCBuPXIuRlMucmVhZGRpcih0KSxlPVtdO2Zvcihjb25zdCBvIG9mIG4pe2NvbnN0IHM9ci5GUy5zdGF0KGAke3R9LyR7b31gKSxjPXIuRlMuaXNEaXIocy5tb2RlKTtlLnB1c2goe25hbWU6byxpc0RpcjpjfSl9cmV0dXJuIGV9LEE9KHtwYXRoOnR9KT0+KHIuRlMucm1kaXIodCksITApLHc9KHtmc1R5cGU6dCxvcHRpb25zOm4sbW91bnRQb2ludDplfSk9Pntjb25zdCBvPXQscz1yLkZTLmZpbGVzeXN0ZW1zW29dO3JldHVybiBzPyhyLkZTLm1vdW50KHMsbixlKSwhMCk6ITF9LGs9KHttb3VudFBvaW50OnR9KT0+KHIuRlMudW5tb3VudCh0KSwhMCk7c2VsZi5vbm1lc3NhZ2U9YXN5bmMoe2RhdGE6e2lkOnQsdHlwZTpuLGRhdGE6ZX19KT0+e2NvbnN0IG89W107bGV0IHM7dHJ5e2lmKG4hPT1FLkxPQUQmJiFyKXRocm93IGY7c3dpdGNoKG4pe2Nhc2UgRS5MT0FEOnM9YXdhaXQgTyhlKTticmVhaztjYXNlIEUuRVhFQzpzPWwoZSk7YnJlYWs7Y2FzZSBFLldSSVRFX0ZJTEU6cz1tKGUpO2JyZWFrO2Nhc2UgRS5SRUFEX0ZJTEU6cz1EKGUpO2JyZWFrO2Nhc2UgRS5ERUxFVEVfRklMRTpzPVMoZSk7YnJlYWs7Y2FzZSBFLlJFTkFNRTpzPUkoZSk7YnJlYWs7Y2FzZSBFLkNSRUFURV9ESVI6cz1MKGUpO2JyZWFrO2Nhc2UgRS5MSVNUX0RJUjpzPU4oZSk7YnJlYWs7Y2FzZSBFLkRFTEVURV9ESVI6cz1BKGUpO2JyZWFrO2Nhc2UgRS5NT1VOVDpzPXcoZSk7YnJlYWs7Y2FzZSBFLlVOTU9VTlQ6cz1rKGUpO2JyZWFrO2RlZmF1bHQ6dGhyb3cgYX19Y2F0Y2goYyl7c2VsZi5wb3N0TWVzc2FnZSh7aWQ6dCx0eXBlOkUuRVJST1IsZGF0YTpjLnRvU3RyaW5nKCl9KTtyZXR1cm59cyBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkmJm8ucHVzaChzLmJ1ZmZlciksc2VsZi5wb3N0TWVzc2FnZSh7aWQ6dCx0eXBlOm4sZGF0YTpzfSxvKX19KSgpOwo=`;
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



  const mp4Info = await getMp4Info(file);
  const durationInSeconds = mp4Info.duration / mp4Info.timescale;
  const durationinMiliseconds = durationInSeconds * 1000;
  const rotationArgs = getRotationPreserveArgs(mp4Info.rotation);

  if (file.size < 5 * MB) {
    return {
      video: file,
      metadata: {
        isSegmented: false,
        mimeType: 'video/mp4',
        fileSize: file.size,
        duration: durationinMiliseconds,
      },
    };
  }
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

    ...rotationArgs,           // ← only added when rotation ≠ 0°/180°

    // Audio
    '-c:a', 'copy',
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
    fileSize: file.size,
    duration: durationinMiliseconds,
    rotation: mp4Info.rotation,
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

  await ffmpeg.exec(['-i', 'input.mp4', '-frames:v', '1', 'thumb%04d.png']);

  const data = await ffmpeg.readFile('thumb0001.png');
  if (!data) {
    throw new Error('Failed to get thumbnail');
  }

  return new OdinBlob([data], { type: 'image/png' });
};
