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
import { renderJSONContentToReactElement, type NodeProps } from '@tiptap/static-renderer/json/react';
import katex from 'katex';
import { common, createLowlight } from 'lowlight';
import { createContext, Fragment, ReactNode, useContext, useMemo } from 'react';
import { cleanTiptapDoc } from '@homebase-id/js-lib/public';
import { slugify, uniqueHeadingIds } from './headingSlugs';
import { Image } from '../../media/Image';
import { Mention } from '../renderer/Mention';
import type { RichTextRenderer } from '../renderer/RichTextRenderer';

/** The same options RichTextRenderer takes, so call sites can pass one object to either. */
export type ArticleDocOptions = NonNullable<Parameters<typeof RichTextRenderer>[0]['options']>;

type Node = JSONContent;
type Props = NodeProps<Node, ReactNode>;

const lowlight = createLowlight(common);

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
  return { headings, headingIds: new Map(headings.map((heading) => [heading.node, heading.id])), footnotes };
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

const HEADING_CLASSES: Record<number, string> = {
  1: 'text-3xl font-semibold mt-8 mb-4',
  2: 'text-2xl font-semibold mt-8 mb-3',
  3: 'text-xl font-semibold mt-6 mb-3',
  4: 'text-lg font-semibold mt-6 mb-2',
  5: 'text-base font-semibold mt-4 mb-2',
  6: 'text-sm font-semibold uppercase tracking-wide mt-4 mb-2',
};

const CALLOUT_CLASSES: Record<string, string> = {
  info: 'border-sky-500 bg-sky-50 dark:bg-sky-950/40',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
  tip: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  error: 'border-red-500 bg-red-50 dark:bg-red-950/40',
};
const CALLOUT_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  tip: 'Tip',
  error: 'Error',
};
// The editor's icons (lucide's info, triangle-alert, lightbulb and circle-x) in its colours
const CALLOUT_ICON_CLASSES: Record<string, string> = {
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  tip: 'text-emerald-600 dark:text-emerald-400',
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
    className={`mt-1 h-4 w-4 shrink-0 ${CALLOUT_ICON_CLASSES[variant]}`}
  >
    {CALLOUT_ICON_PATHS[variant]}
  </svg>
);

/** Links: the theme colour, lighter in dark mode, where it is too dark to read on the background. */
const LINK_CLASS = 'text-primary dark:text-indigo-300 hover:underline';

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

const CodeBlock = ({ node }: Props) => {
  const code = textOf(node);
  const language = String(node.attrs?.language ?? '').trim().split(/\s+/)[0];
  let highlighted: ReactNode = code;
  if (language && lowlight.registered(language)) {
    try {
      highlighted = hastToReact(lowlight.highlight(language, code) as Hast, 0);
    } catch {
      // Plain text it is
    }
  }
  return (
    <pre className="my-4 overflow-x-auto rounded-lg border bg-slate-100 p-3 text-sm dark:bg-slate-800">
      <code className="font-mono text-foreground" data-language={language || undefined}>
        {highlighted}
      </code>
    </pre>
  );
};

const MathNode = ({ latex, display }: { latex: unknown; display: boolean }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(String(latex ?? ''), { displayMode: display, throwOnError: false });
    } catch {
      return undefined;
    }
  }, [latex, display]);
  const Tag = display ? 'div' : 'span';
  if (html === undefined)
    return <Tag className="font-mono">{String(latex ?? '')}</Tag>;
  return (
    <Tag
      className={display ? 'my-4 overflow-x-auto' : undefined}
      // KaTeX output, not the document's: KaTeX escapes the latex and has `trust` off
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const ALIGN_CLASSES: Record<string, string> = {
  left: 'float-left mr-4 mb-2',
  right: 'float-right ml-4 mb-2',
  center: 'mx-auto',
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

const ImageNode = ({ node, parent }: Props) => {
  const { options, odinId } = useContext(ArticleDocContext);
  const attrs = node.attrs ?? {};
  const alt = str(attrs.alt);
  // null shows the alt text, "" no caption, anything else replaces the alt text
  const caption = attrs.caption === null || attrs.caption === undefined ? alt : str(attrs.caption);
  const inGallery = parent?.type === 'gallery';
  const width = Number(attrs.width) || undefined;
  const fileKey = str(attrs.fileKey);
  const fileId = str(attrs.fileId);

  let img: ReactNode = null;
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
        fit={inGallery ? 'cover' : undefined}
        className={inGallery ? 'h-full w-full' : 'max-w-full'}
      />
    );
  } else if (typeof attrs.src === 'string' && SAFE_SRC.test(attrs.src)) {
    img = (
      <img
        src={attrs.src}
        alt={alt ?? ''}
        loading="lazy"
        className={inGallery ? 'h-full w-full object-cover' : 'max-w-full'}
      />
    );
  } else return null;

  return (
    <figure
      className={
        inGallery
          ? 'm-0 overflow-hidden rounded-md'
          : `my-4 max-w-full ${own(ALIGN_CLASSES, attrs.align) ?? ''}`
      }
      style={!inGallery && width ? { width: `${width}px` } : undefined}
    >
      {img}
      {caption ? (
        <figcaption className="mt-1 text-center text-sm text-foreground/60">{caption}</figcaption>
      ) : null}
    </figure>
  );
};

const HeadingNode = ({ node, children }: Props) => {
  const { headingIds } = useContext(ArticleDocContext);
  const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
  const Tag = `h${level}` as 'h1';
  return (
    <Tag id={headingIds.get(node)} className={HEADING_CLASSES[level]} style={blockStyle(node)}>
      {children}
    </Tag>
  );
};

const FootnoteReferenceNode = ({ node }: Props) => {
  const { footnotes } = useContext(ArticleDocContext);
  const id = idSafe(node.attrs?.id);
  return (
    <sup id={`fnref-${id}`}>
      <a href={`#fn-${id}`} role="doc-noteref" className={LINK_CLASS}>
        [{footnotes.get(id)}]
      </a>
    </sup>
  );
};

const FootnoteNode = ({ node, children }: Props) => {
  const { footnotes } = useContext(ArticleDocContext);
  const id = idSafe(node.attrs?.id);
  return (
    <li id={`fn-${id}`} value={footnotes.get(id)} className="my-1 [&>p]:mb-1 [&>p]:inline">
      {children}{' '}
      {footnotes.has(id) ? (
        <a href={`#fnref-${id}`} role="doc-backlink" aria-label="Back to reference" className="text-primary dark:text-indigo-300">
          {'↩︎'}
        </a>
      ) : null}
    </li>
  );
};

const nodeMapping: Record<string, (props: Props) => ReactNode> = {
  doc: ({ children }) => <>{children}</>,
  text: ({ node }) => node.text,
  paragraph: ({ node, children }) => {
    // A paragraph holding only images is a block of figures, which can't sit in a <p>
    const onlyImages =
      !!node.content?.length &&
      node.content.every((child) => child.type === 'image' || child.type === 'hardBreak');
    const Tag = onlyImages ? 'div' : 'p';
    return (
      <Tag className="mb-3 last:mb-0 flow-root" style={blockStyle(node)}>
        {children}
      </Tag>
    );
  },
  heading: HeadingNode,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-foreground/20 pl-4 text-foreground/80">
      {children}
    </blockquote>
  ),
  codeBlock: CodeBlock,
  bulletList: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
  orderedList: ({ node, children }) => (
    <ol className="my-3 list-decimal pl-6" start={Number(node.attrs?.start) || undefined}>
      {children}
    </ol>
  ),
  listItem: ({ children }) => <li className="my-1 [&>p]:mb-1">{children}</li>,
  taskList: ({ children }) => <ul className="my-3 pl-1">{children}</ul>,
  taskItem: ({ node, children }) => (
    <li className="my-1 flex items-start gap-2 [&>div>p]:mb-1">
      <input
        type="checkbox"
        checked={!!node.attrs?.checked}
        readOnly
        disabled
        className="mt-1.5"
        aria-label={node.attrs?.checked ? 'Done' : 'To do'}
      />
      <div className={node.attrs?.checked ? 'text-foreground/60 line-through' : undefined}>
        {children}
      </div>
    </li>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  ),
  tableRow: ({ children }) => <tr>{children}</tr>,
  tableHeader: ({ node, children }) => (
    <th
      colSpan={Number(node.attrs?.colspan) || undefined}
      rowSpan={Number(node.attrs?.rowspan) || undefined}
      className="border border-foreground/20 bg-foreground/5 px-3 py-2 font-semibold [&>p]:mb-0"
    >
      {children}
    </th>
  ),
  tableCell: ({ node, children }) => (
    <td
      colSpan={Number(node.attrs?.colspan) || undefined}
      rowSpan={Number(node.attrs?.rowspan) || undefined}
      className="border border-foreground/20 px-3 py-2 align-top [&>p]:mb-0"
    >
      {children}
    </td>
  ),
  callout: ({ node, children }) => {
    const variant = own(CALLOUT_CLASSES, node.attrs?.variant) ? (node.attrs?.variant as string) : 'info';
    return (
      <aside
        role="note"
        aria-label={CALLOUT_LABELS[variant]}
        data-variant={variant}
        className={`my-4 flex gap-2 rounded-md border-l-4 px-4 py-3 ${CALLOUT_CLASSES[variant]}`}
      >
        <CalloutIcon variant={variant} />
        <div className="min-w-0 flex-1">{children}</div>
      </aside>
    );
  },
  toggle: ({ node, children }) => {
    const summary = String(node.attrs?.summary ?? '').trim();
    return (
      <details className="my-3 rounded-md border border-foreground/10 px-4 py-2">
        <summary className="cursor-pointer font-medium">
          {/* Without a title, a muted one, as the editor's placeholder shows it */}
          {summary || <span className="font-normal text-foreground/50">Details</span>}
        </summary>
        <div className="mt-2">{children}</div>
      </details>
    );
  },
  image: ImageNode,
  gallery: ({ node, children }) => {
    const count = node.content?.length ?? 0;
    const layout = str(node.attrs?.layout);
    return (
      <div
        data-gallery={layout}
        className={
          layout === 'grid' || layout === 'masonry'
            ? `my-4 grid grid-cols-2 gap-2 [&>figure]:aspect-square ${count >= 3 ? 'sm:grid-cols-3' : ''}`
            : `my-4 grid gap-2 [&>figure]:aspect-[4/3] ${count >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`
        }
      >
        {children}
      </div>
    );
  },
  linkPreview: ({ node }) => {
    const url = safeHref(node.attrs?.url);
    if (!url) return null;
    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      // Show the url as it is
    }
    const description = str(node.attrs?.description);
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="my-4 block rounded-lg border border-foreground/15 px-4 py-3 no-underline hover:bg-foreground/5"
      >
        <span className="block font-semibold text-foreground">{str(node.attrs?.title) || host}</span>
        {description ? (
          <span className="mt-1 block text-sm text-foreground/70 line-clamp-2">{description}</span>
        ) : null}
        <span className="mt-1 block text-xs text-foreground/50">{host}</span>
      </a>
    );
  },
  horizontalRule: () => <hr className="my-6 border-foreground/20" />,
  hardBreak: () => <br />,
  mention: ({ node }) =>
    typeof node.attrs?.id === 'string' && node.attrs.id ? <Mention odinId={node.attrs.id} /> : null,
  inlineMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={false} />,
  blockMath: ({ node }) => <MathNode latex={node.attrs?.latex} display={true} />,
  footnoteReference: FootnoteReferenceNode,
  footnotes: ({ children }) => (
    <section role="doc-endnotes" className="mt-8 border-t border-foreground/20 pt-4 text-sm">
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
    <code className="rounded-md border bg-slate-100 p-[2px_3px_1px] font-mono text-sm text-red-500 dark:bg-slate-800 dark:text-orange-400">
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
          <nav aria-label="Table of contents" className="mb-6 rounded-lg border border-foreground/10 px-4 py-3 text-sm">
            <p className="mb-2 font-semibold">Contents</p>
            <ol>
              {toc.map((heading) => (
                <li key={heading.id} style={{ paddingLeft: `${(heading.level - topLevel) * 1}rem` }}>
                  <a href={`#${heading.id}`} className={LINK_CLASS}>
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
