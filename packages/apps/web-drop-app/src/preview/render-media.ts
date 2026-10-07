import { h, swapWithNotice, type PreviewFile } from './dom';

export function renderVideo(file: PreviewFile): HTMLElement {
  const video = h('video', 'preview-video');
  video.controls = true;
  video.setAttribute('controlsList', 'nodownload noremoteplayback');
  video.disablePictureInPicture = true;
  video.playsInline = true;
  video.addEventListener('contextmenu', (e) => e.preventDefault());
  video.addEventListener('error', () => swapWithNotice(video, "This video can't be played in this browser."));
  video.src = file.url;
  return video;
}

export function renderAudio(file: PreviewFile): HTMLElement {
  const audio = h('audio', 'preview-audio');
  audio.controls = true;
  audio.setAttribute('controlsList', 'nodownload');
  audio.addEventListener('contextmenu', (e) => e.preventDefault());
  audio.addEventListener('error', () => swapWithNotice(audio, "This audio can't be played in this browser."));
  audio.src = file.url;
  return audio;
}
