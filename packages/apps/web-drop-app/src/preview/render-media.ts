import { blockContextMenu, h, swapWithFallback, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

// On a phone the overflow menu would hold only playback speed; dropping it gives the scrubber room.
const narrow = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 30rem)').matches === true;

const controlsList = (base: string) => (narrow() ? `${base} noplaybackrate` : base);

export function renderVideo(file: PreviewFile): HTMLElement {
  const video = h('video', 'preview-video');
  video.controls = true;
  video.setAttribute('controlsList', controlsList('nodownload noremoteplayback'));
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', file.name);
  blockContextMenu(video);
  video.addEventListener('error', () => swapWithFallback(video, S.videoFailed));
  video.src = file.url;
  return video;
}

export function renderAudio(file: PreviewFile): HTMLElement {
  const audio = h('audio', 'preview-audio');
  audio.controls = true;
  audio.setAttribute('controlsList', controlsList('nodownload noremoteplayback'));
  audio.disableRemotePlayback = true;
  audio.preload = 'metadata';
  audio.setAttribute('aria-label', file.name);
  blockContextMenu(audio);
  audio.addEventListener('error', () => swapWithFallback(audio, S.audioFailed));
  audio.src = file.url;
  return audio;
}
