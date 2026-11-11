/**
 * Renders a Tiptap document in the schema of Journal's editor, as an article published from Journal
 * stores it, without an editor. Every node and mark is mapped by hand: nothing from the document is
 * rendered as HTML, and links only keep http(s) and mailto urls. KaTeX's own output is the one HTML
 * string set.
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
  createContext,
  Fragment,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { cleanTiptapDoc } from '@homebase-id/js-lib/public';
import { liveBlockKind, parseCodeInfo, svgDataUri } from './codeInfo';
import {
  editDataAttrs,
  editLayers,
  hasEdits,
  readEdits,
  type ImageEdits,
  type Size,
} from './imageEdits';
import {
  galleryRowBreaks,
  toGalleryLayout,
  watchGalleryAspect,
  type GalleryLayout,
} from './galleryLayout';
import { slugify, uniqueHeadingIds } from './headingSlugs';
import { Image } from '../../media/Image';
import { Mention } from '../renderer/Mention';
import type { RichTextRenderer } from '../renderer/RichTextRenderer';

/** The same options RichTextRenderer takes, so call sites can pass one object to either. */
export type ArticleDocOptions = NonNullable<Parameters<typeof RichTextRenderer>[0]['options']>;

type Node = JSONContent;
type Props = NodeProps<Node, ReactNode>;

const lowlight = createLowlight(common);
// As in Journal: a react block is highlighted as JavaScript (svg is already an alias of xml)
lowlight.registerAlias({ javascript: ['react'] });

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

type Heading = { node: Node; id: string; level: number; text: string };

/**
 * Heading ids (unique slugs) and footnote numbers (in reference order) of a document, walked depth
 * first in document order. Takes a sanitized document.
 */
const indexDoc = (doc: Node) => {
  const found: Omit<Heading, 'id'>[] = [];
  const footnotes = new Map<string, number>();
  const walk = (node: Node) => {
    if (node.type === 'heading') {
      const text = textOf(node).trim();
      found.push({ node, text, level: Math.min(6, Math.max(1, Number(node.attrs?.level) || 1)) });
    }
    if (node.type === 'footnoteReference') {
      const id = idSafe(node.attrs?.id);
      if (!footnotes.has(id)) footnotes.set(id, footnotes.size + 1);
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  const ids = uniqueHeadingIds(found.map((heading) => slugify(heading.text)));
  const headings: Heading[] = found.map((heading, i) => ({ ...heading, id: ids[i] }));
  return {
    headings,
    headingIds: new Map(headings.map((heading) => [heading.node, heading.id])),
    footnotes,
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
  6: 'text-[0.8125rem] uppercase tracking-[0.05em] font-semibold text-foreground/60 mt-4 mb-2 first:mt-0',
};

// Journal's variants: info and tip in neutral tones, warning in gold, error in red
const CALLOUT_CLASSES: Record<string, string> = {
  info: 'border-primary/40 bg-foreground/5 dark:border-indigo-300/50',
  warning: 'border-amber-400 bg-amber-400/10',
  tip: 'border-foreground/40 bg-foreground/[0.03]',
  error: 'border-red-500 bg-red-500/10',
};
const CALLOUT_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  tip: 'Tip',
  error: 'Error',
};
// The editor's icons (lucide's info, triangle-alert, lightbulb and circle-x) in its colours
const CALLOUT_ICON_CLASSES: Record<string, string> = {
  info: 'text-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  tip: 'text-foreground/60',
  error: 'text-red-600 dark:text-red-400',
};
const CALLOUT_ICON_PATHS: Record<string, ReactNode> = {
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
const CalloutIcon = ({ variant }: { variant: string }) => (
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

// highlight.js token classes, coloured for light and dark mode
const HLJS_CLASSES: Record<string, string> = {
  'hljs-keyword': 'text-purple-700 dark:text-purple-400',
  'hljs-built_in': 'text-sky-700 dark:text-sky-400',
  'hljs-type': 'text-sky-700 dark:text-sky-400',
  'hljs-literal': 'text-orange-700 dark:text-orange-400',
  'hljs-number': 'text-orange-700 dark:text-orange-400',
  'hljs-string': 'text-emerald-700 dark:text-emerald-400',
  'hljs-regexp': 'text-emerald-700 dark:text-emerald-400',
  'hljs-comment': 'text-slate-500 italic',
  'hljs-title': 'text-blue-700 dark:text-blue-400',
  'hljs-attr': 'text-amber-700 dark:text-amber-400',
  'hljs-attribute': 'text-amber-700 dark:text-amber-400',
  'hljs-variable': 'text-rose-700 dark:text-rose-400',
  'hljs-tag': 'text-rose-700 dark:text-rose-400',
  'hljs-name': 'text-rose-700 dark:text-rose-400',
  'hljs-meta': 'text-slate-500',
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
  const className = node.properties?.className
    ?.map((name) => own(HLJS_CLASSES, name))
    .filter(Boolean)
    .join(' ');
  return (
    <span key={key} className={className || undefined}>
      {children}
    </span>
  );
};

const PRE_CLASS =
  'overflow-x-auto rounded-lg border border-foreground/15 bg-slate-100 p-4 text-sm leading-relaxed dark:bg-slate-800';

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
    <pre className={PRE_CLASS}>
      <code className="font-mono text-foreground" data-language={language}>
        {highlighted}
      </code>
    </pre>
  );
};

const LIVE_BLOCK_LABELS: Record<string, string> = {
  mermaid: 'Diagram — shown as code',
  svg: 'Drawing — shown as code',
  html: 'Interactive block — shown as code',
  react: 'Interactive block — shown as code',
};

/**
 * A code block. Its `language` is the fence's whole info string as Journal keeps it
 * (`html id=k3f9 wide`): only its first word is read, and only as a bare word. Journal's live
 * blocks can't run here (yet): an svg drawing shows as an image, which never runs its scripts,
 * and the rest show as their code under a label saying so.
 */
const CodeBlock = ({ node }: Props) => {
  const code = textOf(node);
  const info = node.attrs?.language;
  const language =
    parseCodeInfo(info)
      .language?.toLowerCase()
      .replace(/[^a-z0-9_+#.-]/g, '') || undefined;
  const live = liveBlockKind(info);

  if (live === 'svg' && code.trim())
    return (
      <figure data-live-block="svg" className="my-4">
        {/* Svg art is mostly dark on transparent: in dark mode it sits on light paper */}
        <div className="flex justify-center rounded-lg dark:bg-slate-100 dark:p-2">
          <img src={svgDataUri(code)} alt="" className="max-h-[32rem] max-w-full" />
        </div>
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-foreground/60">View source</summary>
          <div className="mt-2">
            <Code code={code} language="xml" />
          </div>
        </details>
      </figure>
    );

  return (
    <div className="my-4" data-live-block={live ?? undefined}>
      {live ? <p className="mb-1 text-xs text-foreground/60">{LIVE_BLOCK_LABELS[live]}</p> : null}
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
  options?: ArticleDocOptions;
  odinId?: string;
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
    frame.addEventListener('load', onLoad, true);
    return () => frame.removeEventListener('load', onLoad, true);
  }, []);

  const layers = natural && editLayers(natural, edits);
  return (
    <div
      ref={frameRef}
      data-edited-image=""
      className={`w-full ${className ?? ''}`}
      style={layers ? layers.frame : { visibility: 'hidden' }}
    >
      <div style={layers?.stage}>
        <div style={layers?.image}>{children}</div>
      </div>
    </div>
  );
};

/** How an image sits in each gallery layout, as on Journal's share page. */
const GALLERY_IMAGE_CLASSES: Record<GalleryLayout, string> = {
  row: 'block w-full',
  grid: 'block aspect-square w-full object-cover',
  masonry: 'block w-full',
  carousel: 'block max-h-72 max-w-full object-contain',
};

const ImageNode = ({ node, parent }: Props) => {
  const { options, odinId } = useContext(ArticleDocContext);
  const attrs = node.attrs ?? {};
  const alt = str(attrs.alt);
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
      : `block rounded-lg ${width ? 'w-full' : 'max-w-full'}`;

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
        fit={layout === 'grid' && !edited ? 'cover' : undefined}
        className={imgClass}
      />
    );
  } else if (typeof attrs.src === 'string' && SAFE_SRC.test(attrs.src)) {
    img = <img src={attrs.src} alt={alt ?? ''} loading="lazy" className={imgClass} />;
  } else {
    // A source this page can't load, such as a Journal attachment the publish didn't rewrite
    img = (
      <span className="block rounded-lg border border-dashed border-foreground/25 px-3 py-6 text-center text-sm text-foreground/50">
        Image not available
      </span>
    );
  }

  // In a paragraph with text it must stay phrasing content: spans, not a figure
  const inText = parent?.type === 'paragraph' && !isFigureParagraph(parent);
  const Box = inText ? 'span' : 'figure';
  const Caption = inText ? 'span' : 'figcaption';
  return (
    <Box
      className={
        layout
          ? 'm-0 block min-w-0'
          : `my-6 block max-w-full min-[600px]:[width:var(--image-width,auto)] ${own(ALIGN_CLASSES, attrs.align) ?? ''} ${
              attrs.align === 'center' && !width ? 'min-[600px]:w-fit' : ''
            }`
      }
      style={!layout && width ? ({ '--image-width': `${width}px` } as CSSProperties) : undefined}
      // For the gallery's aspect ratios: the edited image's, read off these
      {...Object.fromEntries(editDataAttrs(edits))}
    >
      {edited ? (
        <EditedImage edits={edits} className={layout ? undefined : 'rounded-lg'}>
          {img}
        </EditedImage>
      ) : (
        img
      )}
      {caption ? (
        <Caption className="mt-1.5 block text-center text-sm text-foreground/60">{caption}</Caption>
      ) : null}
    </Box>
  );
};

/** A paragraph holding only images: a block of figures, which can't sit in a <p>. */
const isFigureParagraph = (node: Node) =>
  !!node.content?.length &&
  node.content.every((child) => child.type === 'image' || child.type === 'hardBreak');

const Carousel = ({ slides }: { slides: ReactNode[] }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (el) setCurrent(Math.round(el.scrollLeft / (el.clientWidth || 1)));
  }, []);
  const show = (index: number) => {
    const el = scroller.current;
    const to = Math.max(0, Math.min(slides.length - 1, index));
    el?.scrollTo?.({ left: to * el.clientWidth, behavior: 'smooth' });
  };
  const button =
    'flex h-7 w-7 items-center justify-center rounded-full border border-foreground/20 leading-none disabled:opacity-40 hover:bg-foreground/5';
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

const GALLERY_CLASSES: Record<Exclude<GalleryLayout, 'carousel'>, string> = {
  // Each image grows by its aspect ratio (--ar, set once it loads), so a row's images share one height
  row: 'flex flex-wrap items-start gap-x-2 max-[480px]:gap-x-1 [&>figure]:[flex:var(--ar,1)_1_0%]',
  grid: 'grid grid-cols-3 gap-2 max-[480px]:grid-cols-2 max-[480px]:gap-1',
  masonry:
    'columns-3 gap-2 max-[480px]:columns-2 max-[480px]:gap-1 [&>figure]:mb-2 [&>figure]:break-inside-avoid max-[480px]:[&>figure]:mb-1',
};

/** An image gallery in one of Journal's layouts: row, grid, masonry or carousel. */
const GalleryNode = ({ node, children }: Props) => {
  const layout = toGalleryLayout(node.attrs?.layout);
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? watchGalleryAspect(ref.current) : undefined), []);

  if (layout === 'carousel') return <Carousel slides={items} />;

  let content: ReactNode[] = items;
  if (layout === 'row') {
    // Rows end at a break: the `wide` ones above 480px, the `narrow` ones (pairs) at or below it
    const breaks = new Map(galleryRowBreaks(items.length).map((b) => [b.index, b.modes]));
    content = items.flatMap((item, i) => {
      const modes = breaks.get(i);
      if (!modes) return [item];
      const show = `${modes.includes('wide') ? 'min-[481px]:block' : ''} ${modes.includes('narrow') ? 'max-[480px]:block' : ''}`;
      return [
        <span
          key={`break-${i}`}
          aria-hidden="true"
          className={`hidden h-2 max-[480px]:h-1 [flex:0_0_100%] ${show}`}
        />,
        item,
      ];
    });
  }
  return (
    <div ref={ref} data-gallery={layout} className={`my-6 ${GALLERY_CLASSES[layout]}`}>
      {content}
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
          className="text-foreground/50 no-underline"
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
    const Tag = isFigureParagraph(node) ? 'div' : 'p';
    return (
      <Tag className="my-3 flow-root leading-[1.7] first:mt-0 last:mb-0" style={blockStyle(node)}>
        {children}
      </Tag>
    );
  },
  heading: HeadingNode,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-[3px] border-foreground/20 pl-4 text-foreground/80">
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
          node.attrs?.checked ? '[&>p]:text-foreground/60 [&>p]:line-through' : ''
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
      className="border border-foreground/20 bg-foreground/5 px-3 py-2 align-top font-semibold text-foreground/85 [&>p+p]:mt-3 [&>p]:my-0"
    >
      {children}
    </th>
  ),
  tableCell: ({ node, children }) => (
    <td
      colSpan={Number(node.attrs?.colspan) || undefined}
      rowSpan={Number(node.attrs?.rowspan) || undefined}
      className="border border-foreground/20 px-3 py-2 align-top [&>p+p]:mt-3 [&>p]:my-0"
    >
      {children}
    </td>
  ),
  callout: ({ node, children }) => {
    const variant = own(CALLOUT_CLASSES, node.attrs?.variant)
      ? (node.attrs?.variant as string)
      : 'info';
    return (
      <aside
        role="note"
        aria-label={CALLOUT_LABELS[variant]}
        data-variant={variant}
        className={`my-4 flex gap-2 rounded-md border-l-4 px-3 ${CALLOUT_CLASSES[variant]}`}
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
            className="h-4 w-4 shrink-0 text-foreground/60 transition-transform group-open:rotate-90"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          {/* Without a title, a muted one, as the editor's placeholder shows it */}
          {summary || <span className="font-normal text-foreground/50">Details</span>}
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
        className="my-4 flex flex-col overflow-hidden rounded-lg border border-foreground/15 no-underline hover:bg-foreground/5 min-[481px]:flex-row"
      >
        {image && SAFE_SRC.test(image) ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-40 w-full shrink-0 object-cover min-[481px]:h-auto min-[481px]:w-40"
          />
        ) : null}
        <span className="block min-w-0 flex-1 p-3">
          <span className="block truncate font-medium text-foreground">{title || host}</span>
          {description ? (
            <span className="mt-0.5 block text-sm text-foreground/60 line-clamp-2">
              {description}
            </span>
          ) : null}
          {title ? (
            <span className="mt-1 block truncate text-xs text-foreground/60">{host}</span>
          ) : null}
        </span>
      </a>
    );
  },
  // A Journal note link the publish didn't rewrite: its label, as text, and never a journal: link
  noteLink: ({ node }) => str(node.attrs?.label) ?? null,
  horizontalRule: () => <hr className="my-8 border-foreground/20" />,
  hardBreak: () => <br />,
  mention: ({ node }) =>
    typeof node.attrs?.id === 'string' && node.attrs.id ? <Mention odinId={node.attrs.id} /> : null,
  inlineMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={false} />,
  blockMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={true} />,
  footnoteReference: FootnoteReferenceNode,
  footnotes: ({ children }) => (
    <section
      role="doc-endnotes"
      className="mt-10 border-t border-foreground/20 pt-2 text-[0.875em]"
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
    <code className="rounded-[0.3rem] bg-slate-100 px-[0.4rem] py-[0.2rem] font-mono text-[0.875rem] text-foreground dark:bg-slate-800">
      {children}
    </code>
  ),
  kbd: ({ children }) => (
    <kbd className="rounded-md border bg-slate-100 px-1 font-mono text-sm dark:bg-slate-800">
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
}: {
  doc: JSONContent;
  odinId?: string;
  options?: ArticleDocOptions;
  className?: string;
  /** Show a table of contents above documents with 3 or more headings */
  tableOfContents?: boolean;
}) => {
  const clean = useMemo(() => sanitizeArticleDoc(doc), [doc]);
  const { headings, headingIds, footnotes } = useMemo(() => indexDoc(clean), [clean]);
  // Only a new document renders new elements; new options reach the nodes through the context
  const body = useMemo(() => renderDoc(clean), [clean]);
  const context = useMemo(
    () => ({ headingIds, footnotes, options, odinId }),
    [headingIds, footnotes, options, odinId]
  );

  const toc = tableOfContents && headings.length >= 3 ? headings : undefined;
  const topLevel = toc ? Math.min(...toc.map((heading) => heading.level)) : 1;

  return (
    <ArticleDocContext.Provider value={context}>
      <div className={`break-words ${className ?? ''}`}>
        {toc ? (
          <nav
            aria-label="Table of contents"
            className="mb-6 rounded-lg border border-foreground/10 px-4 py-3 text-sm"
          >
            <p className="mb-2 font-semibold">Contents</p>
            <ol>
              {toc.map((heading) => (
                <li
                  key={heading.id}
                  style={{ paddingLeft: `${(heading.level - topLevel) * 1}rem` }}
                >
                  <a href={`#${heading.id}`} className={`${LINK_COLOR} hover:underline`}>
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {body}
      </div>
    </ArticleDocContext.Provider>
  );
};
