import type { LayoutId } from '../CardDesign';

type CardEvent =
  | { type: 'loaded' }
  | { type: 'ready'; layout: LayoutId; ms: number }
  | { type: 'link'; href: string }
  | { type: 'png'; base64: string; width: number; height: number }
  | { type: 'error'; message: string };

declare global {
  interface Window {
    // Installed by the app hosts before any page script runs
    homebaseCardHost?: { post: (json: string) => void };
  }
}

export const postCardEvent = (event: CardEvent) => {
  if (window.homebaseCardHost) window.homebaseCardHost.post(JSON.stringify(event));
  else if (window.parent !== window) window.parent.postMessage({ homebaseCard: event }, '*');
};
