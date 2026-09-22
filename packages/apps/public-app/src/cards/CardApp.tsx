import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { DotYouClientContext, toSocialLink } from '@homebase-id/common-app';
import type { DotYouClient } from '@homebase-id/js-lib/core';
import type { LayoutId } from './CardDesign';
import { CardPage } from './CardPage';
import { HomebaseCard } from './HomebaseCard';
import { CARD_PRESETS, presetFromParam } from './presets';
import { useMinWidth } from './useMinWidth';
import {
  cardSocials,
  type CardData,
  type CardLink,
  type CardPhoto,
  type CardPost,
} from './useCardData';

export type CardHost = 'app' | 'frame';

type CardEvent =
  | { type: 'loaded' }
  | { type: 'ready'; layout: LayoutId; ms: number }
  | { type: 'link'; href: string }
  | { type: 'png'; base64: string; width: number; height: number }
  | { type: 'error'; message: string };

type AppImage = { src: string };
type AppData = {
  odinId: string;
  firstName?: string;
  surName?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  photo?: AppImage;
  header?: AppImage;
  links?: CardLink[];
  socials?: { type: string; username: string }[];
  posts?: (Omit<CardPost, 'image'> & { image?: AppImage })[];
};
type RenderRequest = { design: string; data: AppData };

declare global {
  interface Window {
    homebaseCard?: { render: (request: RenderRequest) => void; exportPng: () => void };
    // Installed by the app hosts before any page script runs
    homebaseCardHost?: { post: (json: string) => void };
  }
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// The owner is looking at their own card: no chat block, and nothing here may reach the network
const ownerClient = (odinId: string) =>
  ({
    isOwner: () => true,
    isAuthenticated: () => true,
    getHostIdentity: () => odinId,
    getLoggedInIdentity: () => odinId,
  }) as unknown as DotYouClient;

const toCardData = (data: AppData, dropped: (reason: string) => void): CardData => {
  if (!data?.odinId) throw new Error('data.odinId is required');
  const image = (value: AppImage | undefined, field: string): CardPhoto | undefined => {
    if (!value?.src) return undefined;
    if (/^(data|blob):/i.test(value.src)) return { src: value.src };
    dropped(`${field}.src is not a data: URL, dropped`);
    return undefined;
  };
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
    posts: (data.posts ?? [])
      .slice(0, 12)
      .map((post, index) => ({ ...post, image: image(post.image, `posts[${index}].image`) })),
  };
};

// Chrome settles decode() and rAF only on a frame, and a WebView that draws none (off screen,
// headless virtual time) never gets one: wait for it, but not forever
const untilFrame = (work: Promise<unknown>, ms: number) =>
  Promise.race([work, new Promise((resolve) => setTimeout(resolve, ms))]);
const nextFrame = () => untilFrame(new Promise((resolve) => requestAnimationFrame(resolve)), 100);

const whenPainted = async (element: HTMLElement, onError: (error: unknown) => void) => {
  await document.fonts.ready;
  await untilFrame(
    Promise.all(
      Array.from(element.querySelectorAll('img')).map((img) =>
        img.decode().catch(() => onError(`image ${img.src.slice(0, 40)}… failed to decode`))
      )
    ),
    500
  );
  await nextFrame();
};

// html-to-image's toCanvas, minus its unbounded decode() and rAF waits (see untilFrame)
const rasterize = async (element: HTMLElement) => {
  const { toSvg } = await import('html-to-image');
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

// exportPng always shares the compact card; with the page layout on screen it is drawn here at a phone's size
const EXPORT_FRAME: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: -10000,
  width: 390,
  height: 844,
  pointerEvents: 'none',
};

// The router's own boundary would unmount the whole page, and with it the host API
class CardBoundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Rendered = { id: number; layout: LayoutId; data: CardData };

const CompactCard = ({ card }: { card: Rendered }) => (
  <HomebaseCard
    design={CARD_PRESETS[card.layout]}
    data={card.data}
    className="flex min-h-full flex-col [&>*]:flex-grow"
  />
);

const CardApp = ({ host }: { host: CardHost }) => {
  // the website's own breakpoint (CardHome): the full page on wide screens, the card on phones
  const wide = useMinWidth(768);
  const [card, setCard] = useState<Rendered>();
  const [exporting, setExporting] = useState(false);
  const main = useRef<HTMLElement>(null);
  const snapshot = useRef<HTMLDivElement>(null);
  const failure = useRef<unknown>();
  const onScreenIsPage = useRef(wide);
  const onCardError = (error: unknown) => {
    failure.current = error;
  };

  useEffect(() => {
    onScreenIsPage.current = wide;
  }, [wide]);

  useEffect(() => {
    const post = (event: CardEvent) => {
      if (host === 'app') window.homebaseCardHost?.post(JSON.stringify(event));
      else window.parent.postMessage({ homebaseCard: event }, '*');
    };
    const postError = (error: unknown) => post({ type: 'error', message: message(error) });
    const rendered = () => main.current?.firstElementChild as HTMLElement | null | undefined;

    let owner = '';
    let renders = 0;
    let painted: Promise<unknown> = Promise.resolve();

    const render = (request: RenderRequest) => {
      const started = performance.now();
      const id = ++renders;
      try {
        const layout = presetFromParam(request?.design ?? null);
        if (!layout) throw new Error(`unknown design "${request?.design}"`);
        const data = toCardData(request.data, postError);
        owner = data.odinId;
        failure.current = undefined;
        flushSync(() => setCard({ id, layout, data }));
        const element = rendered();
        if (!element) throw failure.current ?? new Error('the card did not render');
        painted = whenPainted(element, postError).then(() => {
          // a newer render() owns the next ready
          if (id === renders)
            post({ type: 'ready', layout, ms: Math.round(performance.now() - started) });
        });
      } catch (error) {
        postError(error);
      }
    };

    const capture = async () => {
      const offScreen = onScreenIsPage.current;
      if (offScreen) {
        failure.current = undefined;
        flushSync(() => setExporting(true));
      }
      let canvas: HTMLCanvasElement;
      try {
        const element = (offScreen ? snapshot.current?.firstElementChild : rendered()) as
          | HTMLElement
          | null
          | undefined;
        if (!element) throw failure.current ?? new Error('exportPng before render');
        if (offScreen) await whenPainted(element, postError);
        canvas = await rasterize(element);
      } finally {
        if (offScreen) flushSync(() => setExporting(false));
      }
      post({
        type: 'png',
        base64: canvas.toDataURL('image/png').slice('data:image/png;base64,'.length),
        width: canvas.width,
        height: canvas.height,
      });
    };
    // one export at a time: they share the off-screen card
    const exportPng = () => {
      painted = painted.then(capture).catch(postError);
    };

    // Taps go to the host; the page itself never navigates
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]');
      if (!anchor) return;
      event.preventDefault();
      try {
        const href = new URL(anchor.getAttribute('href') ?? '', `https://${owner}/`).href;
        post({ type: 'link', href });
      } catch (error) {
        postError(error);
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.data?.homebaseCardCommand === 'render') render(event.data.request);
      else if (event.data?.homebaseCardCommand === 'exportPng') exportPng();
    };
    const onError = (event: ErrorEvent) => postError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => postError(event.reason);

    const container = main.current;
    container?.addEventListener('click', onClick, true);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    if (host === 'app') window.homebaseCard = { render, exportPng };
    else window.addEventListener('message', onMessage);

    // Start fetching every card font now, so the first render() only waits for what is still in flight
    document.fonts.forEach((face) => {
      face.load().catch((error) => postError(`font ${face.family}: ${message(error)}`));
    });

    post({ type: 'loaded' });
    return () => {
      container?.removeEventListener('click', onClick, true);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('message', onMessage);
      delete window.homebaseCard;
    };
  }, [host]);

  return (
    <>
      {/* No vh units: Android's WebView resolves them to 0 unless it is laid out MATCH_PARENT */}
      <style>{'html, body, #root { height: 100%; }'}</style>
      <main ref={main} className="h-full">
        {card ? (
          <DotYouClientContext.Provider value={ownerClient(card.data.odinId)}>
            <CardBoundary key={card.id} onError={onCardError}>
              {wide ? (
                <CardPage design={CARD_PRESETS[card.layout]} data={card.data} />
              ) : (
                <CompactCard card={card} />
              )}
            </CardBoundary>
          </DotYouClientContext.Provider>
        ) : null}
      </main>
      {card && exporting ? (
        <div ref={snapshot} aria-hidden style={EXPORT_FRAME}>
          <DotYouClientContext.Provider value={ownerClient(card.data.odinId)}>
            <CardBoundary onError={onCardError}>
              <CompactCard card={card} />
            </CardBoundary>
          </DotYouClientContext.Provider>
        </div>
      ) : null}
    </>
  );
};

export default CardApp;
