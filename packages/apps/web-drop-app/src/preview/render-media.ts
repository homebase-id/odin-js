import { blockContextMenu, h, swapWithFallback, type PreviewFile } from './dom';
import { PREVIEW_STRINGS as S } from './strings';

// On a phone the overflow menu would hold only playback speed; dropping it gives the scrubber room.
const narrow = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 30rem)').matches === true;

const controlsList = (base: string) => (narrow() ? `${base} noplaybackrate` : base);

function mediaElement<T extends HTMLMediaElement>(media: T, file: PreviewFile, failed: { title: string; body: string }): T {
  media.controls = true;
  media.setAttribute('controlsList', controlsList('nodownload noremoteplayback'));
  media.disableRemotePlayback = true;
  media.preload = 'metadata';
  media.setAttribute('aria-label', file.name);
  blockContextMenu(media);
  media.addEventListener('error', () => swapWithFallback(media, failed));
  return media;
}

export function renderVideo(file: PreviewFile): HTMLElement {
  const video = h('video', 'preview-video');
  video.disablePictureInPicture = true;
  video.playsInline = true;
  mediaElement(video, file, S.videoFailed).src = file.url;
  return video;
}

export function renderAudio(file: PreviewFile): HTMLElement {
  const audio = mediaElement(h('audio', 'preview-audio'), file, S.audioFailed);
  audio.src = file.url;
  return audio;
}
