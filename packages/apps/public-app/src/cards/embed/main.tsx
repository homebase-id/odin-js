import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { toSvg } from 'html-to-image';
import { DotYouClientContext, toSocialLink } from '@homebase-id/common-app';
import type { DotYouClient } from '@homebase-id/js-lib/core';
import type { LayoutId } from '../CardDesign';
import { HomebaseCard } from '../HomebaseCard';
import { CARD_PRESETS, presetFromParam } from '../presets';
import { cardSocials, type CardData, type CardPhoto, type CardLink } from '../useCardData';
import { postCardEvent } from './bridge';
import './embed.css';

type EmbedImage = { src: string };
type EmbedData = {
  odinId: string;
  firstName?: string;
  surName?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  photo?: EmbedImage;
  header?: EmbedImage;
  links?: CardLink[];
  socials?: { type: string; username: string }[];
};
type RenderRequest = { design: string; data: EmbedData };
type HomebaseCardApi = { render: (request: RenderRequest) => void; exportPng: () => void };

declare global {
  interface Window {
    homebaseCard?: HomebaseCardApi;
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const postError = (error: unknown) => postCardEvent({ type: 'error', message: message(error) });

// The owner is looking at their own card: no chat block, and nothing here may reach the network
const ownerClient = (odinId: string) =>
  ({
    isOwner: () => true,
    isAuthenticated: () => true,
    getHostIdentity: () => odinId,
    getLoggedInIdentity: () => odinId,
  }) as unknown as DotYouClient;

const image = (value: EmbedImage | undefined, field: string): CardPhoto | undefined => {
  if (!value?.src) return undefined;
  if (/^(data|blob):/i.test(value.src)) return { src: value.src };
  postError(`${field}.src is not a data: URL, dropped`);
  return undefined;
};

const toCardData = (data: EmbedData): CardData => {
  if (!data?.odinId) throw new Error('data.odinId is required');
  return {
    odinId: data.odinId,
    firstName: data.firstName,
    surName: data.surName,
    displayName: data.displayName,
    headline: data.headline,
    bio: data.bio,
    photo: image(data.photo, 'photo'),
    header: image(data.header, 'header'),
    links: data.links ?? [],
    socials: cardSocials(
      (data.socials ?? []).map((social, priority) => toSocialLink({ ...social, priority }))
    ),
    posts: [],
  };
};

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
const card = () => container.firstElementChild as HTMLElement | null;

let owner = '';
let renders = 0;
let painted: Promise<unknown> = Promise.resolve();

// Chrome settles decode() and rAF only on a frame, and a WebView that draws none (off screen,
// headless virtual time) never gets one: wait for it, but not forever
const untilFrame = (work: Promise<unknown>, ms: number) =>
  Promise.race([work, new Promise((resolve) => setTimeout(resolve, ms))]);
const nextFrame = () => untilFrame(new Promise((resolve) => requestAnimationFrame(resolve)), 100);

const whenPainted = async (element: HTMLElement) => {
  await document.fonts.ready;
  await untilFrame(
    Promise.all(
      Array.from(element.querySelectorAll('img')).map((img) =>
        img.decode().catch(() => postError(`image ${img.src.slice(0, 40)}… failed to decode`))
      )
    ),
    500
  );
  await nextFrame();
};

const render = (request: RenderRequest) => {
  const started = performance.now();
  const id = ++renders;
  try {
    const layout: LayoutId | undefined = presetFromParam(request?.design ?? null);
    if (!layout) throw new Error(`unknown design "${request?.design}"`);
    const cardData = toCardData(request.data);
    owner = cardData.odinId;
    flushSync(() =>
      root.render(
        <DotYouClientContext.Provider value={ownerClient(cardData.odinId)}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <HomebaseCard
              design={CARD_PRESETS[layout]}
              data={cardData}
              className="flex min-h-full flex-col [&>*]:flex-grow"
            />
          </MemoryRouter>
        </DotYouClientContext.Provider>
      )
    );
    const element = card();
    if (!element) throw new Error('the card did not render');
    painted = whenPainted(element).then(() => {
      // a newer render() owns the next ready
      if (id === renders)
        postCardEvent({ type: 'ready', layout, ms: Math.round(performance.now() - started) });
    });
  } catch (error) {
    postError(error);
  }
};

// html-to-image's toCanvas, minus its unbounded decode() and rAF waits (see untilFrame)
const rasterize = async (element: HTMLElement) => {
  const { offsetWidth: width, offsetHeight: height } = element;
  const svg = await toSvg(element);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('the card snapshot did not load'));
    image.src = svg;
  });
  await nextFrame();
  const ratio = Math.max(2, 1080 / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d canvas');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const exportPng = () =>
  painted
    .then(async () => {
      const element = card();
      if (!element) throw new Error('exportPng before render');
      const canvas = await rasterize(element);
      postCardEvent({
        type: 'png',
        base64: canvas.toDataURL('image/png').slice('data:image/png;base64,'.length),
        width: canvas.width,
        height: canvas.height,
      });
    })
    .catch(postError);

// Taps go to the host; the page itself never navigates
container.addEventListener(
  'click',
  (event) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!anchor) return;
    event.preventDefault();
    try {
      const href = new URL(anchor.getAttribute('href') ?? '', `https://${owner}/`).href;
      postCardEvent({ type: 'link', href });
    } catch (error) {
      postError(error);
    }
  },
  true
);

window.addEventListener('error', (event) => postError(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => postError(event.reason));

// Start decoding every card font now, so the first render() only waits for what is still in flight
document.fonts.forEach((face) => {
  face.load().catch((error) => postError(`font ${face.family}: ${message(error)}`));
});

window.homebaseCard = { render, exportPng };
postCardEvent({ type: 'loaded' });
