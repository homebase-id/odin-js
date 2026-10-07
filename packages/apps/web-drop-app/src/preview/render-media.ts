import { h, swapWithFallback, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

export function renderVideo(file: PreviewFile): HTMLElement {
  const video = h('video', 'preview-video');
  video.controls = true;
  video.setAttribute('controlsList', 'nodownload noremoteplayback');
  video.disablePictureInPicture = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', file.name);
  video.addEventListener('contextmenu', (e) => e.preventDefault());
  video.addEventListener('error', () => swapWithFallback(video, S.videoFailed));
  video.src = file.url;
  return video;
}

export function renderAudio(file: PreviewFile): HTMLElement {
  const audio = h('audio', 'preview-audio');
  audio.controls = true;
  audio.setAttribute('controlsList', 'nodownload');
  audio.preload = 'metadata';
  audio.setAttribute('aria-label', file.name);
  audio.addEventListener('contextmenu', (e) => e.preventDefault());
  audio.addEventListener('error', () => swapWithFallback(audio, S.audioFailed));
  audio.src = file.url;
  return audio;
}
