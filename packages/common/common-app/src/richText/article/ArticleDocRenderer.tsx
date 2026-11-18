/**
 * Renders a Tiptap document in the schema of Journal's editor, as an article published from Journal
 * stores it, without an editor. Every node and mark is mapped by hand: nothing from the document is
 * rendered as HTML, and links only keep http(s) and mailto urls. KaTeX's own output is the one HTML
 * string set. Journal's live blocks run in `LiveBlock` (@2002bishwajeet/live-blocks), whose html
 * and react blocks are sandboxed frames.
 *
 * The document comes from a stored post and is not trusted to be well formed: it is cleaned by
 * `sanitizeArticleDoc` before anything reads it. The node and mark mappings are made once, here, so
 * a parent's re-render never remounts the article (which would close open toggles); what they need
 * from the article (heading ids, footnote numbers, the post's options) comes through a context.
 */
import type { JSONContent } from '@tiptap/core';
import {
  renderJSONContentToReactElement,
  type NodeProps,
} from '@tiptap/static-renderer/json/react';
import katex from 'katex';
import { common, createLowlight } from 'lowlight';
import {
  Children,
  Component,
  createContext,
  Fragment,
  lazy,
  ReactNode,
  Suspense,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { flushSync } from 'react-dom';
import { cleanTiptapDoc, codeLanguage } from '@homebase-id/js-lib/public';
import {
  liveBlockKind,
  parseCodeInfo,
  svgDataUri,
  type LiveBlockKind,
} from '@2002bishwajeet/live-blocks/core';
import { LANGUAGE_ALIASES } from './codeInfo';
import { toCalloutVariant, type CalloutVariant } from './calloutVariants';
import {
  editDataAttrs,
  editedSize,
  editLayers,
  hasEdits,
  readEdits,
  type ImageEdits,
  type Size,
} from './imageEdits';
import {
  columnsAt,
  galleryColumns,
  galleryRowBreaks,
  scrollToSlide,
  slideIndex,
  toGalleryLayout,
  watchGalleryAspect,
  type GalleryLayout,
} from './galleryLayout';
import { articleHeadings, MIN_TOC_HEADINGS, type ArticleHeading } from './headingSlugs';
import { t } from '../../helpers/i18n/dictionary';
import { Image } from '../../media/Image';
import { Chevron } from '../../ui/Icons/Chevron';
import { Mention } from '../renderer/Mention';
import type { RichTextRenderer } from '../renderer/RichTextRenderer';

/** The same options RichTextRenderer takes, so call sites can pass one object to either. */
export type ArticleDocOptions = NonNullable<Parameters<typeof RichTextRenderer>[0]['options']>;

type Node = JSONContent;
type Props = NodeProps<Node, ReactNode>;

const lowlight = createLowlight(common);
// As in Journal: a react block is highlighted as JavaScript (svg is already an alias of xml)
lowlight.registerAlias(LANGUAGE_ALIASES);

const SAFE_HREF = /^(https?:|mailto:)/i;
const SAFE_SRC = /^(https?:|data:image\/(png|jpe?g|gif|webp|avif);)/i;

/** The url when it is http(s) or mailto, else undefined. */
const safeHref = (url: unknown): string | undefined =>
  typeof url === 'string' && SAFE_HREF.test(url.trim()) ? url.trim() : undefined;

/** A lookup that never matches prototype keys such as 'constructor'. */
const own = <T,>(map: Record<string, T>, key: unknown): T | undefined =>
  typeof key === 'string' && Object.hasOwn(map, key) ? map[key] : undefined;
const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The text of every text node under `node`, in document order, joined with nothing (step 1 of `slugify`). */
const textOf = (node: Node): string =>
  node.type === 'text' ? (node.text ?? '') : (node.content ?? []).map(textOf).join('');

const idSafe = (id: unknown) => String(id ?? '').replace(/[^\w-]/g, '');

/**
 * Heading ids (unique slugs), footnote numbers (in reference order) and image positions of a
 * document, walked depth first in document order. Takes a sanitized document.
 */
const indexDoc = (doc: Node) => {
  const footnotes = new Map<string, number>();
  const images = new Map<Node, number>();
  const walk = (node: Node) => {
    if (node.type === 'footnoteReference') {
      const id = idSafe(node.attrs?.id);
      if (!footnotes.has(id)) footnotes.set(id, footnotes.size + 1);
    }
    if (node.type === 'image') images.set(node, images.size);
    node.content?.forEach(walk);
  };
  walk(doc);
  const headings = articleHeadings(doc);
  return {
    headings,
    headingIds: new Map(headings.map((heading) => [heading.node, heading.id])),
    footnotes,
    images,
  };
};

const TEXT_ALIGN = ['left', 'center', 'right', 'justify'];
const blockStyle = (node: Node) => {
  const align = node.attrs?.textAlign;
  const indent = Number(node.attrs?.indent) || 0;
  if (!TEXT_ALIGN.includes(align) && !indent) return undefined;
  return {
    textAlign: TEXT_ALIGN.includes(align) ? align : undefined,
    paddingLeft: indent ? `${indent * 2}rem` : undefined,
  };
};

// Journal's sizes (its `.prose` rules in src/index.css): h5 and h6 sit below the body size
const HEADING_CLASSES: Record<number, string> = {
  1: 'text-[2.5rem] leading-tight font-semibold mt-8 mb-4 first:mt-0',
  2: 'text-[1.75rem] leading-snug font-semibold mt-7 mb-3 first:mt-0',
  3: 'text-xl font-semibold mt-6 mb-2 first:mt-0',
  4: 'text-lg font-semibold mt-5 mb-2 first:mt-0',
  5: 'text-[0.9375rem] tracking-[0.01em] font-semibold mt-4 mb-2 first:mt-0',
  6: 'text-[0.8125rem] uppercase tracking-[0.05em] font-semibold text-[color:var(--article-on-surface-variant)] mt-4 mb-2 first:mt-0',
};

/*
 * Notion's paper palette (the --article-* variables of articleProse.css, light and dark) for the
 * blocks that draw a surface: surface variant behind code blocks and table headers, surface
 * container behind inline code, outline variant for borders and table lines, on-surface variant for
 * muted text. Links keep the app's colours.
 */
const MUTED_BG = 'bg-[var(--article-surface-variant)]';
const INLINE_CODE_BG = 'bg-[var(--article-surface-container)]';
const BODY_TEXT = 'text-[color:var(--article-on-surface)]';
const BORDER = 'border-[color:var(--article-outline-variant)]';
const MUTED_TEXT = 'text-[color:var(--article-on-surface-variant)]';

// Journal's variants (its calloutVariants.ts) as Notion tints them: a soft background per variant,
// body text on it, the icon in the variant's accent, no bar. Not the shared CALLOUT_CLASSES in
// calloutVariants.ts: those use theme tokens (collaborative, …) the feed lacks.
const CALLOUT_CLASSES: Record<CalloutVariant, string> = {
  info: 'bg-[var(--article-primary-container)]',
  warning: 'bg-[var(--article-warning-container)]',
  tip: 'bg-[var(--article-secondary-container)]',
  error: 'bg-[var(--article-error-container)]',
};
const CALLOUT_LABELS: Record<CalloutVariant, string> = {
  info: 'Info',
  warning: 'Warning',
  tip: 'Tip',
  error: 'Error',
};
// The editor's icons (lucide's info, triangle-alert, lightbulb and circle-x) in the variant's accent
const CALLOUT_ICON_CLASSES: Record<CalloutVariant, string> = {
  info: 'text-[color:var(--article-primary)]',
  warning: 'text-[color:var(--article-warning)]',
  tip: 'text-[color:var(--article-secondary)]',
  error: 'text-[color:var(--article-error)]',
};
const CALLOUT_ICON_PATHS: Record<CalloutVariant, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  warning: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  tip: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
};
const CalloutIcon = ({ variant }: { variant: CalloutVariant }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`mt-[1.1rem] h-4 w-4 shrink-0 ${CALLOUT_ICON_CLASSES[variant]}`}
  >
    {CALLOUT_ICON_PATHS[variant]}
  </svg>
);

/** Links: the theme colour, lighter in dark mode, where it is too dark to read on the background. */
const LINK_COLOR = 'text-primary dark:text-indigo-300';
/** Links in the text are underlined, as in Journal. */
const LINK_CLASS = `${LINK_COLOR} underline underline-offset-2 hover:opacity-70`;

// highlight.js token classes in the article's palette: GitHub's light and dark syntax colours, as
// Notion's code blocks have them
const COMMENT = 'italic text-[#9b9a97] dark:text-[#7d7d7d]';
const KEYWORD = 'text-[#d73a49] dark:text-[#ff7b72]';
const NAME = 'text-[#22863a] dark:text-[#7ee787]';
const LITERAL = 'text-[#005cc5] dark:text-[#79c0ff]';
const STRING = 'text-[#22863a] dark:text-[#7ee787]';
const VALUE = 'text-[#005cc5] dark:text-[#79c0ff]';
const TITLE = 'text-[#6f42c1] dark:text-[#d2a8ff]';
const BUILT_IN = 'text-[#e36209] dark:text-[#ffa657]';
const HLJS_CLASSES: Record<string, string> = {
  'hljs-comment': COMMENT,
  'hljs-quote': COMMENT,
  'hljs-doctag': KEYWORD,
  'hljs-keyword': KEYWORD,
  'hljs-formula': KEYWORD,
  'hljs-section': NAME,
  'hljs-name': NAME,
  'hljs-selector-tag': NAME,
  'hljs-deletion': NAME,
  'hljs-subst': NAME,
  'hljs-literal': LITERAL,
  'hljs-string': STRING,
  'hljs-regexp': STRING,
  'hljs-addition': STRING,
  'hljs-attribute': STRING,
  'hljs-attr': VALUE,
  'hljs-variable': VALUE,
  'hljs-template-variable': VALUE,
  'hljs-type': VALUE,
  'hljs-selector-class': VALUE,
  'hljs-selector-attr': VALUE,
  'hljs-selector-pseudo': VALUE,
  'hljs-number': LITERAL,
  'hljs-symbol': TITLE,
  'hljs-bullet': TITLE,
  'hljs-link': `${TITLE} underline`,
  'hljs-meta': TITLE,
  'hljs-selector-id': TITLE,
  'hljs-title': TITLE,
  'hljs-built_in': BUILT_IN,
  'hljs-emphasis': 'italic',
  'hljs-strong': 'font-bold',
};

type Hast = {
  type: string;
  value?: string;
  properties?: { className?: string[] };
  children?: Hast[];
};
const hastToReact = (node: Hast, key: number): ReactNode => {
  if (node.type === 'text') return node.value;
  const children = node.children?.map(hastToReact);
  if (node.type !== 'element') return <Fragment key={key}>{children}</Fragment>;
  const names = node.properties?.className;
  // A class name (`hljs-title class_`) takes the built-in colour, as in Journal
  const className =
    names?.includes('hljs-title') && names.includes('class_')
      ? BUILT_IN
      : names
          ?.map((name) => own(HLJS_CLASSES, name))
          .filter(Boolean)
          .join(' ');
  return (
    <span key={key} className={className || undefined}>
      {children}
    </span>
  );
};

// Right padding keeps the end of the longest line clear of the Copy button
const PRE_CLASS = `overflow-x-auto rounded-lg border ${BORDER} ${MUTED_BG} p-4 pr-20 text-sm leading-relaxed`;

/** Copies a code block's text, as Journal's share page does: "Copied" for a moment after. */
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () =>
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      // The browser refused (no permission, or not a secure context): nothing was copied
      () => undefined
    );
  return (
    // A 44px target on a touch screen; the pill inside carries the look
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? t('Copied') : t('Copy code')}
      className="group/copy absolute right-1 top-1 flex h-9 min-w-9 select-none items-center justify-center px-1 outline-none [@media(pointer:coarse)]:h-11 print:hidden"
    >
      <span
        aria-live="polite"
        className={`rounded-full border ${BORDER} bg-[var(--article-surface)] px-2.5 py-0.5 text-xs font-medium ${MUTED_TEXT} group-hover/copy:text-[color:var(--article-on-surface)] group-focus-visible/copy:ring-2 group-focus-visible/copy:ring-[color:var(--article-primary)]`}
      >
        {copied ? t('Copied') : t('Copy')}
      </span>
    </button>
  );
};

/** Code, highlighted when its language is one lowlight knows. `language` is a bare word. */
const Code = ({ code, language }: { code: string; language?: string }) => {
  let highlighted: ReactNode = code;
  if (language && lowlight.registered(language)) {
    try {
      highlighted = hastToReact(lowlight.highlight(language, code) as Hast, 0);
    } catch {
      // Plain text it is
    }
  }
  return (
    <div className="relative">
      <pre className={PRE_CLASS}>
        <code className="font-mono text-foreground" data-language={language}>
          {highlighted}
        </code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
};

const LIVE_BLOCK_LABELS: Record<string, string> = {
  mermaid: 'Diagram — shown as code',
  svg: 'Drawing — shown as code',
  html: 'Interactive block — shown as code',
  react: 'Interactive block — shown as code',
};

/** The live-block runtime, in a chunk of its own: only an article with a live block loads it. */
const LiveBlock = lazy(() =>
  import('@2002bishwajeet/live-blocks').then((module) => ({ default: module.LiveBlock }))
);

/** Falls back to `fallback` when a live block throws, loading its chunk or rendering. Tries again when `resetKey` changes. */
class LiveBlockBoundary extends Component<
  { resetKey: unknown; fallback: ReactNode; children: ReactNode },
  { failed: boolean; resetKey: unknown }
> {
  state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { resetKey: unknown }, state: { resetKey: unknown }) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: unknown) {
    console.error('[ArticleDocRenderer] A live block failed; showing its code instead', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A code block. Its `language` is the fence's whole info string as Journal keeps it
 * (`html id=k3f9 wide`): only its first word is read, and only as a bare word. A Journal live
 * block runs in LiveBlock, as Journal's share page shows it. A block's saved state lives in the
 * note's Yjs doc, not in the Tiptap document an article carries, so it starts from none; LiveBlock
 * follows the `dark` class on <html> (what useDarkMode sets) for its colour scheme, and asks before
 * opening a link. While its chunk loads, or when it throws, the block shows as below.
 */
const CodeBlock = ({ node }: Props) => {
  const code = textOf(node);
  const info = str(node.attrs?.language) ?? null;
  const language = codeLanguage(info) || undefined;
  const live = liveBlockKind(language ?? null);
  const shown = <StaticCodeBlock code={code} language={language} live={live} />;
  if (!live || !code.trim()) return shown;

  return (
    <LiveBlockBoundary resetKey={code} fallback={shown}>
      <Suspense fallback={shown}>
        <LiveBlock kind={live} source={code} wide={parseCodeInfo(info).wide} />
      </Suspense>
    </LiveBlockBoundary>
  );
};

/**
 * A code block without its live block: an svg drawing as an image, which never runs its scripts,
 * and the other live blocks as their code under a label saying so.
 */
const StaticCodeBlock = ({
  code,
  language,
  live,
}: {
  code: string;
  language?: string;
  live: LiveBlockKind | null;
}) => {
  if (live === 'svg' && code.trim())
    return (
      <figure data-live-block="svg" className="my-4">
        {/* Svg art is mostly dark on transparent: in dark mode it sits on light paper */}
        <div className="flex justify-center rounded-lg dark:bg-slate-100 dark:p-2">
          <img src={svgDataUri(code)} alt="" className="max-h-[32rem] max-w-full" />
        </div>
        <details className="mt-1">
          <summary className={`cursor-pointer text-xs ${MUTED_TEXT}`}>View source</summary>
          {/* Plain text: highlighting source nobody opens would cost as much as the drawing */}
          <pre className={`mt-2 overflow-x-auto rounded-lg ${MUTED_BG} p-3 text-sm`}>
            <code>{code}</code>
          </pre>
        </details>
      </figure>
    );

  return (
    <div className="my-4" data-live-block={live ?? undefined}>
      {live ? <p className={`mb-1 text-xs ${MUTED_TEXT}`}>{LIVE_BLOCK_LABELS[live]}</p> : null}
      <Code code={code} language={language} />
    </div>
  );
};

const MathNode = ({ latex, display }: { latex: unknown; display: boolean }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(String(latex ?? ''), {
        displayMode: display,
        throwOnError: false,
        // untrusted input: bound sizes and macro expansion so a formula can't paint over the page
        maxSize: 20,
        maxExpand: 200,
      });
    } catch {
      return undefined;
    }
  }, [latex, display]);
  const Tag = display ? 'div' : 'span';
  if (html === undefined) return <Tag className="font-mono">{String(latex ?? '')}</Tag>;
  return (
    <Tag
      className={display ? 'my-4 overflow-x-auto' : undefined}
      // KaTeX output, not the document's: KaTeX escapes the latex and has `trust` off
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Journal's share page: the width and the float only from 600px; below it every image is a
// full-width block
const ALIGN_CLASSES: Record<string, string> = {
  left: 'min-[600px]:float-left min-[600px]:mr-4 min-[600px]:mb-2 min-[600px]:mt-0',
  right: 'min-[600px]:float-right min-[600px]:ml-4 min-[600px]:mb-2 min-[600px]:mt-0',
  center: 'min-[600px]:mx-auto',
};

/** What the node components need from the article being rendered. */
type ArticleDocContextValue = {
  headingIds: Map<Node, string>;
  footnotes: Map<string, number>;
  /** Each image's place in the document, for the full-screen viewer: a masonry gallery's columns reorder them */
  images?: Map<Node, number>;
  options?: ArticleDocOptions;
  odinId?: string;
  /** Images are buttons that open the reader's full-screen viewer (ArticleReader) */
  zoomImages?: boolean;
};
const ArticleDocContext = createContext<ArticleDocContextValue>({
  headingIds: new Map(),
  footnotes: new Map(),
});

/**
 * An image with its crop, rotate and flip applied in CSS only (Journal's EditedImage, with the
 * layers from imageEdits.ts). The natural size comes from whichever <img> loads inside; until then
 * the image lays out unedited and hidden, so it never flashes the original.
 */
const EditedImage = ({
  edits,
  className,
  children,
}: {
  edits: ImageEdits;
  className?: string;
  children: ReactNode;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  // An image that fails to load shows as it is, rather than staying hidden for good
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // The largest wins: OdinImage shows a tiny blurred preview before the real image
    const measure = (img: HTMLImageElement) => {
      const { naturalWidth: width, naturalHeight: height } = img;
      if (width && height)
        setNatural((prev) => (prev && prev.width >= width ? prev : { width, height }));
    };
    frame.querySelectorAll('img').forEach((img) => img.complete && measure(img));
    // load doesn't bubble, but it does pass through the capture phase
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) measure(e.target);
    };
    const onError = () => setFailed(true);
    frame.addEventListener('load', onLoad, true);
    frame.addEventListener('error', onError, true);
    return () => {
      frame.removeEventListener('load', onLoad, true);
      frame.removeEventListener('error', onError, true);
    };
  }, []);

  const layers = natural && editLayers(natural, edits);
  return (
    <div
      ref={frameRef}
      data-edited-image=""
      className={className ?? 'w-full'}
      style={layers ? layers.frame : failed ? undefined : { visibility: 'hidden' }}
    >
      <div style={layers?.stage}>
        <div style={layers?.image}>{children}</div>
      </div>
    </div>
  );
};

/**
 * How an image sits in each gallery layout: whole, at its own aspect ratio, never cropped, with
 * Journal's rounded corners.
 */
const GALLERY_IMAGE_CLASSES: Record<GalleryLayout, string> = {
  row: 'block w-full rounded-lg',
  grid: 'block w-full rounded-lg',
  masonry: 'block w-full rounded-lg',
  carousel: 'mx-auto block max-h-72 max-w-full rounded-lg object-contain',
};

/** An edited image's frame per gallery layout: bounded as the plain image would be. */
const EDITED_FRAME_CLASSES: Record<GalleryLayout, string> = {
  row: 'w-full overflow-hidden rounded-lg',
  grid: 'w-full overflow-hidden rounded-lg',
  masonry: 'w-full overflow-hidden rounded-lg',
  carousel: 'mx-auto h-72 w-auto max-w-full overflow-hidden rounded-lg',
};

/**
 * An image's aspect ratio before it loads, with its crop and rotation: from its preview thumbnail's
 * size, else the size the document gives it; undefined without either (an image by url), whose
 * ratio is read once it loads (`--ar`, watchGalleryAspect).
 */
const imageAspect = (attrs: Record<string, unknown>, options?: ArticleDocOptions) => {
  const fileKey = str(attrs.fileKey);
  const preview = fileKey
    ? options?.previewThumbnails?.find((payload) => payload.key === fileKey)?.previewThumbnail
    : undefined;
  const width = Number(preview?.pixelWidth ?? attrs.width);
  const height = Number(preview?.pixelHeight ?? attrs.height);
  if (!(width > 0 && height > 0)) return undefined;
  const edited = editedSize({ width, height }, readEdits(attrs));
  return edited.width / edited.height;
};

const ImageNode = ({ node, parent }: Props) => {
  const { options, odinId, zoomImages, images } = useContext(ArticleDocContext);
  const attrs = node.attrs ?? {};
  const alt = str(attrs.alt);
  const src = typeof attrs.src === 'string' && SAFE_SRC.test(attrs.src) ? attrs.src : undefined;
  // null shows the alt text, "" no caption, anything else replaces the alt text
  const caption = attrs.caption === null || attrs.caption === undefined ? alt : str(attrs.caption);
  const layout = parent?.type === 'gallery' ? toGalleryLayout(parent.attrs?.layout) : undefined;
  const width = Number(attrs.width) > 0 ? Number(attrs.width) : undefined;
  const fileKey = str(attrs.fileKey);
  const fileId = str(attrs.fileId);
  const edits = readEdits(attrs);
  const edited = hasEdits(edits);
  // Filling its box: an edited frame, or the width the author gave it
  const imgClass = edited
    ? 'block h-full w-full'
    : layout
      ? GALLERY_IMAGE_CLASSES[layout]
      : `block rounded-lg ${width ? 'w-full' : 'max-w-full'} ${attrs.align === 'center' ? 'mx-auto' : ''}`;

  let img: ReactNode;
  if (fileKey) {
    if (!options) return null;
    const previewThumbnail = options.previewThumbnails?.find(
      (payload) => payload.key === fileKey
    )?.previewThumbnail;
    img = (
      <Image
        targetDrive={options.imageDrive}
        fileId={fileId || options.defaultFileId}
        globalTransitId={fileId ? undefined : options.defaultGlobalTransitId}
        lastModified={options.lastModified}
        fileKey={fileKey}
        previewThumbnail={previewThumbnail}
        odinId={odinId}
        alt={alt}
        className={imgClass}
        // Fetched once it comes within a screen of the viewport; the tiny preview shows at once
        deferUntilNear
      />
    );
  } else if (src) {
    img = (
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={imgClass}
      />
    );
  } else {
    // A source this page can't load, such as a Journal attachment the publish didn't rewrite
    img = (
      <span
        className={`block rounded-lg border border-dashed ${BORDER} px-3 py-6 text-center text-sm ${MUTED_TEXT}`}
      >
        Image not available
      </span>
    );
  }

  const frameClass = layout ? EDITED_FRAME_CLASSES[layout] : 'w-full rounded-lg';
  // An image by url without a size takes its own ratio once it loads (--ar, square until then)
  const aspect = layout === 'grid' ? (imageAspect(attrs, options) ?? 'var(--ar, 1)') : undefined;
  // A grid with set columns has rows of its own, which its images fill
  const gridColumns = layout === 'grid' ? galleryColumns(parent?.attrs?.columns) : undefined;
  const shown =
    edited && fileKey ? (
      // Keyed by the source, so a reused instance never keeps another image's size
      <EditedImage key={fileKey} edits={edits} className={frameClass}>
        {img}
      </EditedImage>
    ) : edited && src ? (
      <EditedImage key={src} edits={edits} className={frameClass}>
        {img}
      </EditedImage>
    ) : (
      img
    );
  return (
    <figure
      className={
        layout
          ? 'm-0 block min-w-0'
          : `my-6 block max-w-full ${width ? 'min-[600px]:[width:var(--image-width)]' : ''} ${own(ALIGN_CLASSES, attrs.align) ?? ''} ${
              attrs.align === 'center' && !width ? 'min-[600px]:w-fit' : ''
            }`
      }
      style={
        aspect && gridColumns
          ? // A share of its row by its aspect ratio, so the row's images share one height
            { flex: `${aspect} 1 0%` }
          : aspect
            ? // A justified row: as wide as the row height at its aspect ratio, growing by it to fill the row
              { flex: `${aspect} 1 calc(${aspect} * var(--row-height))` }
            : !layout && width
              ? ({ '--image-width': `${width}px` } as CSSProperties)
              : undefined
      }
      // For the gallery's aspect ratios: the edited image's, read off these
      {...Object.fromEntries(editDataAttrs(edits))}
    >
      {zoomImages && (fileKey || src) ? (
        // Opens the reader's full-screen viewer, which finds the image by these attributes
        <button
          type="button"
          data-zoom-image=""
          data-file-key={fileKey}
          data-file-id={fileKey ? fileId || options?.defaultFileId : undefined}
          data-global-transit-id={fileKey && !fileId ? options?.defaultGlobalTransitId : undefined}
          data-src={fileKey ? undefined : src}
          data-alt={alt || undefined}
          data-zoom-order={images?.get(node)}
          aria-label={alt ? `${alt}: ${t('view full screen')}` : t('View image full screen')}
          className="block w-full cursor-zoom-in rounded-lg text-left"
        >
          {shown}
        </button>
      ) : (
        shown
      )}
      {caption ? (
        <figcaption className={`mt-1.5 block text-center text-sm ${MUTED_TEXT}`}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

/** A paragraph with an image: a <div>, since an image is a <figure>, which can't sit in a <p> (as the server render). */
const hasImage = (node: Node) => !!node.content?.some((child) => child.type === 'image');

const Carousel = ({ slides }: { slides: ReactNode[] }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const onScroll = () => {
    if (scroller.current) setCurrent(slideIndex(scroller.current, slides.length));
  };
  const show = (index: number) => {
    if (scroller.current) scrollToSlide(scroller.current, index, slides.length);
  };
  // 44px on a touch screen
  const button = `flex h-7 w-7 items-center justify-center rounded-full border ${BORDER} leading-none disabled:opacity-40 hover:bg-foreground/5 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11`;
  return (
    <div
      className="my-6"
      role="group"
      aria-roledescription="carousel"
      aria-label="Image gallery"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        show(current + (e.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        data-gallery="carousel"
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&>*]:flex [&>*]:h-80 [&>*]:shrink-0 [&>*]:grow-0 [&>*]:basis-full [&>*]:snap-center [&>*]:flex-col [&>*]:items-center [&>*]:justify-center"
      >
        {slides}
      </div>
      {slides.length > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous image"
            className={button}
            disabled={current === 0}
            onClick={() => show(current - 1)}
          >
            ‹
          </button>
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show image ${i + 1} of ${slides.length}`}
                aria-current={i === current || undefined}
                className={`h-2 w-2 rounded-full bg-foreground ${i === current ? 'opacity-80' : 'opacity-30'}`}
                onClick={() => show(i)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next image"
            className={button}
            disabled={current >= slides.length - 1}
            onClick={() => show(current + 1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
};

const GALLERY_CLASSES: Record<'row' | 'grid', string> = {
  // Each image grows by its aspect ratio (--ar, set once it loads), so a row's images share one height
  row: 'flex flex-wrap items-start gap-x-2 [&>figure]:[flex:var(--ar,1)_1_0%]',
  // Justified rows (each image's flex is set by ImageNode), read left to right; on a phone, three
  // portrait screenshots to a row
  grid: 'flex flex-wrap items-start gap-2 [--row-height:220px] max-[480px]:[--row-height:190px]',
};

const NARROW = '(max-width: 480px)';
const subscribeNarrow = (onChange: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(NARROW);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isNarrow = () => typeof window.matchMedia === 'function' && window.matchMedia(NARROW).matches;

/** An image gallery in one of Journal's layouts: row, grid, masonry or carousel. */
const GalleryNode = ({ node, children }: Props) => {
  const { options } = useContext(ArticleDocContext);
  const layout = toGalleryLayout(node.attrs?.layout);
  // The author's images per row or columns (Journal's `columns`); a carousel has none
  const columns = galleryColumns(node.attrs?.columns);
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  // A row reads the aspect ratios (--ar), and so does a grid, for its images by url without a size
  useEffect(
    () =>
      (layout === 'row' || layout === 'grid') && ref.current
        ? watchGalleryAspect(ref.current)
        : undefined,
    [layout]
  );

  if (layout === 'carousel') return <Carousel slides={items} />;

  if (layout === 'masonry') {
    // Columns of whole images, dealt round-robin so the top row reads 1, 2, 3
    const count = columnsAt(columns ?? 3, narrow);
    return (
      <div data-gallery="masonry" className="my-6 flex items-start gap-2">
        {Array.from({ length: count }, (_, column) => (
          <div key={column} className="flex min-w-0 flex-1 flex-col gap-2">
            {items.filter((_, i) => i % count === column)}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'grid' && columns) {
    // Rows of exactly `perRow` images, each sharing its row by aspect ratio (set by ImageNode)
    const perRow = columnsAt(columns, narrow);
    const images = node.content ?? [];
    const aspects = images.map((image) => imageAspect(image.attrs ?? {}, options) ?? 1);
    const meanAspect = aspects.reduce((sum, a) => sum + a, 0) / (aspects.length || 1);
    const rows = Array.from({ length: Math.ceil(items.length / perRow) }, (_, row) =>
      items.slice(row * perRow, (row + 1) * perRow)
    );
    return (
      <div ref={ref} data-gallery="grid" className="my-6 flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            {row}
            {/* A short last row keeps room for the images it lacks, so they stay the size of the rest */}
            {row.length < perRow ? (
              <span
                aria-hidden="true"
                className="h-0"
                style={{ flex: `${(perRow - row.length) * meanAspect} 1 0%` }}
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  let content: ReactNode[] = items;
  if (layout === 'row') {
    // Rows end at a break: the `wide` ones above 480px, the `narrow` ones (pairs) at or below it
    const breaks = new Map(galleryRowBreaks(items.length, columns).map((b) => [b.index, b.modes]));
    content = items.flatMap((item, i) => {
      const modes = breaks.get(i);
      if (!modes) return [item];
      const show = `${modes.includes('wide') ? 'min-[481px]:block' : ''} ${modes.includes('narrow') ? 'max-[480px]:block' : ''}`;
      return [
        <span
          key={`break-${i}`}
          aria-hidden="true"
          className={`hidden h-2 [flex:0_0_100%] ${show}`}
        />,
        item,
      ];
    });
  }
  return (
    <div ref={ref} data-gallery={layout} className={`my-6 ${GALLERY_CLASSES[layout]}`}>
      {content}
      {/* Takes the last row's spare room, so its images keep the row height */}
      {layout === 'grid' ? <span aria-hidden="true" className="h-0 [flex:10000_1_0px]" /> : null}
    </div>
  );
};

const HeadingNode = ({ node, children }: Props) => {
  const { headingIds } = useContext(ArticleDocContext);
  const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
  const Tag = `h${level}` as 'h1';
  return (
    <Tag
      id={headingIds.get(node)}
      className={`scroll-mt-20 ${HEADING_CLASSES[level]}`}
      style={blockStyle(node)}
    >
      {children}
    </Tag>
  );
};

const FootnoteReferenceNode = ({ node }: Props) => {
  const { footnotes } = useContext(ArticleDocContext);
  const id = idSafe(node.attrs?.id);
  return (
    <sup id={`fnref-${id}`} className="scroll-mt-20">
      <a
        href={`#fn-${id}`}
        role="doc-noteref"
        className={`${LINK_COLOR} font-semibold no-underline`}
      >
        [{footnotes.get(id)}]
      </a>
    </sup>
  );
};

const FootnoteNode = ({ node, children }: Props) => {
  const { footnotes } = useContext(ArticleDocContext);
  const id = idSafe(node.attrs?.id);
  return (
    <li
      id={`fn-${id}`}
      value={footnotes.get(id)}
      className="my-1 scroll-mt-20 [&>p]:my-1 [&>p]:inline"
    >
      {children}{' '}
      {footnotes.has(id) ? (
        <a
          href={`#fnref-${id}`}
          role="doc-backlink"
          aria-label="Back to reference"
          className={`${MUTED_TEXT} no-underline`}
        >
          {'↩︎'}
        </a>
      ) : null}
    </li>
  );
};

/** Nested bullet lists go circle, then square; a task list keeps no marker. */
const BULLET_CLASS =
  'my-4 list-disc pl-6 [&_ul:not([data-type])]:list-[circle] [&_ul_ul:not([data-type])]:list-[square]';

const nodeMapping: Record<string, (props: Props) => ReactNode> = {
  doc: ({ children }) => <>{children}</>,
  text: ({ node }) => node.text,
  paragraph: ({ node, children }) => {
    const Tag = hasImage(node) ? 'div' : 'p';
    return (
      <Tag className="my-3 flow-root leading-[1.7] first:mt-0 last:mb-0" style={blockStyle(node)}>
        {children}
      </Tag>
    );
  },
  heading: HeadingNode,
  blockquote: ({ children }) => (
    <blockquote
      className={`my-6 border-l-[3px] border-[color:var(--article-on-surface)] pl-4 text-foreground/80`}
    >
      {children}
    </blockquote>
  ),
  codeBlock: CodeBlock,
  bulletList: ({ children }) => <ul className={BULLET_CLASS}>{children}</ul>,
  orderedList: ({ node, children }) => (
    <ol className="my-4 list-decimal pl-6" start={Number(node.attrs?.start) || undefined}>
      {children}
    </ol>
  ),
  listItem: ({ children }) => <li className="my-1 [&>p]:my-0">{children}</li>,
  taskList: ({ parent, children }) => (
    <ul
      data-type="taskList"
      className={`list-none ${parent?.type === 'taskItem' ? 'mt-1 pl-6' : 'my-4 pl-0'}`}
    >
      {children}
    </ul>
  ),
  taskItem: ({ node, children }) => (
    <li className="my-1 flex items-start gap-2">
      <input
        type="checkbox"
        checked={!!node.attrs?.checked}
        readOnly
        disabled
        className="mt-[0.3rem] h-[1.1rem] w-[1.1rem] shrink-0 accent-primary"
        aria-label={node.attrs?.checked ? 'Done' : 'To do'}
      />
      {/* Only the item's own text is struck through, not the items nested in it */}
      <div
        className={`min-w-0 flex-1 [&>p]:my-0 ${
          node.attrs?.checked
            ? '[&>p]:text-[color:var(--article-on-surface-variant)] [&>p]:line-through'
            : ''
        }`}
      >
        {children}
      </div>
    </li>
  ),
  table: ({ children }) => (
    <div className="my-4 max-w-full overflow-x-auto">
      <table className="w-auto border-collapse text-left">
        <tbody>{children}</tbody>
      </table>
    </div>
  ),
  tableRow: ({ children }) => <tr>{children}</tr>,
  tableHeader: ({ node, children }) => (
    <th
      colSpan={Number(node.attrs?.colspan) || undefined}
      rowSpan={Number(node.attrs?.rowspan) || undefined}
      className={`border ${BORDER} ${MUTED_BG} px-3 py-2 align-top font-semibold text-foreground/85 [&>p+p]:mt-3 [&>p]:my-0`}
    >
      {children}
    </th>
  ),
  tableCell: ({ node, children }) => (
    <td
      colSpan={Number(node.attrs?.colspan) || undefined}
      rowSpan={Number(node.attrs?.rowspan) || undefined}
      className={`border ${BORDER} px-3 py-2 align-top [&>p+p]:mt-3 [&>p]:my-0`}
    >
      {children}
    </td>
  ),
  callout: ({ node, children }) => {
    const variant = toCalloutVariant(node.attrs?.variant);
    return (
      <aside
        role="note"
        aria-label={CALLOUT_LABELS[variant]}
        data-variant={variant}
        className={`my-4 flex gap-2 rounded-md px-3 ${BODY_TEXT} ${CALLOUT_CLASSES[variant]}`}
      >
        <CalloutIcon variant={variant} />
        <div className="min-w-0 flex-1 py-3">{children}</div>
      </aside>
    );
  },
  toggle: ({ node, children }) => {
    const summary = String(node.attrs?.summary ?? '').trim();
    return (
      <details className="group my-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded font-medium [&::-webkit-details-marker]:hidden">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 ${MUTED_TEXT} transition-transform group-open:rotate-90`}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          {/* Without a title, a muted one, as the editor's placeholder shows it */}
          {summary || <span className={`font-normal ${MUTED_TEXT}`}>Details</span>}
        </summary>
        <div className="mt-1 pl-5">{children}</div>
      </details>
    );
  },
  image: ImageNode,
  gallery: GalleryNode,
  linkPreview: ({ node }) => {
    const url = safeHref(node.attrs?.url);
    if (!url) return null;
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      // Show the url as it is
    }
    const title = str(node.attrs?.title);
    const description = str(node.attrs?.description);
    const image = str(node.attrs?.image);
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`my-4 flex flex-col overflow-hidden rounded-lg border ${BORDER} no-underline hover:bg-foreground/5 min-[481px]:flex-row`}
      >
        {image && SAFE_SRC.test(image) ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-40 w-full shrink-0 object-cover min-[481px]:h-auto min-[481px]:w-40"
          />
        ) : null}
        <span className="block min-w-0 flex-1 p-3">
          <span className="block truncate font-medium text-foreground">{title || host}</span>
          {description ? (
            <span className={`mt-0.5 block text-sm ${MUTED_TEXT} line-clamp-2`}>
              {description}
            </span>
          ) : null}
          {title ? (
            <span className={`mt-1 block truncate text-xs ${MUTED_TEXT}`}>{host}</span>
          ) : null}
        </span>
      </a>
    );
  },
  horizontalRule: () => <hr className={`my-8 ${BORDER}`} />,
  hardBreak: () => <br />,
  mention: ({ node }) =>
    typeof node.attrs?.id === 'string' && node.attrs.id ? <Mention odinId={node.attrs.id} /> : null,
  inlineMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={false} />,
  blockMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={true} />,
  footnoteReference: FootnoteReferenceNode,
  footnotes: ({ children }) => (
    <section
      role="doc-endnotes"
      className={`mt-10 border-t ${BORDER} pt-2 text-[0.875em]`}
    >
      <ol className="list-decimal pl-6">{children}</ol>
    </section>
  ),
  footnote: FootnoteNode,
};

const markMapping: Record<
  string,
  (props: { mark: { attrs?: Record<string, unknown> }; children?: ReactNode }) => ReactNode
> = {
  bold: ({ children }) => <strong className="font-bold">{children}</strong>,
  italic: ({ children }) => <em>{children}</em>,
  underline: ({ children }) => <u>{children}</u>,
  strike: ({ children }) => <del>{children}</del>,
  code: ({ children }) => (
    <code
      className={`rounded-[0.3rem] ${INLINE_CODE_BG} px-[0.4rem] py-[0.2rem] font-mono text-[0.875rem] text-[color:var(--article-inline-code)]`}
    >
      {children}
    </code>
  ),
  kbd: ({ children }) => (
    <kbd className={`rounded-md border ${BORDER} ${INLINE_CODE_BG} px-1 font-mono text-sm`}>
      {children}
    </kbd>
  ),
  superscript: ({ children }) => <sup>{children}</sup>,
  subscript: ({ children }) => <sub>{children}</sub>,
  link: ({ mark, children }) => {
    const href = safeHref(mark.attrs?.href);
    if (!href) return <>{children}</>;
    return (
      <a
        href={href}
        target={href.startsWith(window.location.origin) ? '_self' : '_blank'}
        rel="noopener noreferrer"
        className={`${LINK_CLASS} break-words`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    );
  },
};

/**
 * The document as this viewer can render it, from anything: only plain objects whose type is a
 * string and an own key of the node mapping (a node of another type is replaced by its content, so
 * its text stays), `content` and `marks` only when they are arrays, marks of known types only, and
 * `text` as a string. @tiptap/static-renderer has no checks of its own and looks types up with
 * `mapping[type]`, which would match 'constructor' and the other prototype keys.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const sanitizeArticleDoc = (doc: unknown): JSONContent =>
  cleanTiptapDoc(doc, {
    isKnownNode: (type) => Object.hasOwn(nodeMapping, type),
    isKnownMark: (type) => Object.hasOwn(markMapping, type),
  });

/** React elements for a sanitized document. A new renderer each time, so element keys start at 0. */
const renderDoc = (doc: JSONContent) =>
  renderJSONContentToReactElement<{ type: string; attrs?: Record<string, unknown> }, Node>({
    nodeMapping,
    markMapping,
    // Not reached for a sanitized document, which holds known types only
    unhandledNode: ({ children }) => <>{children}</>,
    unhandledMark: ({ children }) => <>{children}</>,
  })({ content: doc });

export const ArticleDocRenderer = ({
  doc,
  odinId,
  options,
  className,
  tableOfContents,
  zoomImages,
}: {
  doc: JSONContent;
  odinId?: string;
  options?: ArticleDocOptions;
  className?: string;
  /** Show a table of contents above documents with MIN_TOC_HEADINGS or more headings */
  tableOfContents?: boolean;
  /** Images are buttons, with what a full-screen viewer needs on them (`data-zoom-image`) */
  zoomImages?: boolean;
}) => {
  const clean = useMemo(() => sanitizeArticleDoc(doc), [doc]);
  const { headings, headingIds, footnotes, images } = useMemo(() => indexDoc(clean), [clean]);
  // Only a new document renders new elements; new options reach the nodes through the context
  const body = useMemo(() => renderDoc(clean), [clean]);
  const context = useMemo(
    () => ({ headingIds, footnotes, images, options, odinId, zoomImages }),
    [headingIds, footnotes, images, options, odinId, zoomImages]
  );

  return (
    <ArticleDocContext.Provider value={context}>
      <div className={`break-words ${className ?? ''}`}>
        {tableOfContents && headings.length >= MIN_TOC_HEADINGS ? (
          <TableOfContents headings={headings} />
        ) : null}
        {body}
      </div>
    </ArticleDocContext.Provider>
  );
};

/** The headings to jump to, above the body, in a box that starts closed. */
const TableOfContents = ({ headings }: { headings: ArticleHeading[] }) => {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const topLevel = Math.min(...headings.map((heading) => heading.level));
  return (
    <div data-article-toc="" className={`mb-8 rounded-lg border ${BORDER}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--article-primary)]"
      >
        {t('On this page')}
        <Chevron
          className={`h-3 w-3 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>
      <nav id={listId} aria-label="Table of contents" hidden={!open} className="px-3 pb-2">
        <ul>
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                // Closed before the reader scrolls, so the heading doesn't move up under it
                onClick={() => flushSync(() => setOpen(false))}
                className={`flex min-h-11 items-center border-l-2 border-transparent py-1 pr-2 text-sm leading-snug no-underline outline-none ${MUTED_TEXT} hover:text-[color:var(--article-on-surface)] focus-visible:ring-2 focus-visible:ring-[color:var(--article-primary)]`}
              >
                <span
                  className="pl-2"
                  style={{ marginLeft: `${(heading.level - topLevel) * 1}rem` }}
                >
                  {heading.text}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
