import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Article,
  ChannelDefinition,
  getChannelDrive,
  parseReactionPreview,
  PostContent,
  ReactionContext,
} from '@homebase-id/js-lib/public';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
// Journal's Inter, self-hosted, so reading an article sends nothing to a font service; the files load
// with the first article, as KaTeX's do in ArticleDoc
import '@fontsource-variable/inter';
import '../../richText/article/articleProse.css';
import { MIN_TOC_HEADINGS } from '../../richText/article/headingSlugs';
import { ImageLightbox, type LightboxImage } from '../../dialogs/ImageLightbox/ImageLightbox';
import { abstractSubtitle } from './abstractSubtitle';
import {
  t,
  ArticleBody,
  AuthorImage,
  AuthorName,
  CommentList,
  PostContextMenu,
  PostInteracts,
  PostMeta,
  PrimaryMedia,
  ToGroupBlock,
  useCanReact,
  type CanReactInfo,
  useChannelLink,
  useCommentCount,
  useEmojiSummary,
} from '../../..';
import { ArrowLeft, Bubble, Heart } from '../../ui/Icons';

/**
 * `#responses`, in the address or on the 💬 link, is the responses. A heading can have that id too
 * ("Responses"), so the section's own is one no heading slug can be: slugs have no '_'.
 */
const RESPONSES_HASH = 'responses';
/** The article's palette (articleProse.css) for the reader's own muted text and hairlines */
const MUTED = 'text-[color:var(--article-on-surface-variant)]';
const HAIRLINE = 'border-[color:var(--article-outline-variant)]';
const RESPONSES_ID = 'reader_responses';

/**
 * An article as a page of its own, for long reading: the cover, title, abstract and byline, the body
 * in Journal's type scale (articleProse.css), an "On this page" rail from 1280px, then the reactions
 * and the responses. The cover and every image in the body open full screen.
 */
export const ArticleReader = ({
  odinId,
  channel,
  postFile,
  isOwner,
  isAuthenticated,
  onBack,
  login,
}: {
  odinId?: string;
  channel?: HomebaseFile<ChannelDefinition> | NewHomebaseFile<ChannelDefinition>;
  postFile: HomebaseFile<PostContent>;
  isOwner: boolean;
  isAuthenticated: boolean;
  /** Back to where the reader came from, from the ← button and Escape; no button without it */
  onBack?: () => void;
  login?: () => void;
}) => {
  const article = postFile.fileMetadata.appData.content as Article;
  const authorOdinId = postFile.fileMetadata.originalAuthor || odinId;
  const reactionOdinId = odinId || window.location.hostname;
  const { globalTransitId, isEncrypted, payloads, updated } = postFile.fileMetadata;

  const reactionContext = useMemo<ReactionContext | undefined>(
    () =>
      globalTransitId && postFile.fileId
        ? {
            odinId: reactionOdinId,
            channelId: article.channelId,
            target: { globalTransitId, fileId: postFile.fileId, isEncrypted: isEncrypted || false },
          }
        : undefined,
    [reactionOdinId, article.channelId, globalTransitId, postFile.fileId, isEncrypted]
  );
  const { data: canReact } = useCanReact({
    odinId: reactionOdinId,
    channelId: article.channelId,
    postContent: article,
    isEnabled: !!reactionContext,
    isAuthenticated,
    isOwner,
  });

  // One object while the post is the same: the viewer's nodes read it from a context
  const bodyOptions = useMemo(
    () =>
      postFile.fileId
        ? {
            imageDrive: getChannelDrive(article.channelId),
            defaultFileId: postFile.fileId,
            defaultGlobalTransitId: globalTransitId,
            lastModified: updated,
            previewThumbnails: payloads,
          }
        : undefined,
    [article.channelId, postFile.fileId, globalTransitId, updated, payloads]
  );

  const proseRef = useRef<HTMLDivElement>(null);
  const headings = useRenderedHeadings(proseRef);
  const rail = headings.length >= MIN_TOC_HEADINGS ? headings : undefined;
  const articleRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState<{ images: LightboxImage[]; index: number }>();

  useEscape(onBack);
  useArrivalHash(proseRef);
  // The live blocks' theme, read off <html> (articleProse.css): the article's palette while the reader is open
  useEffect(() => {
    document.documentElement.setAttribute('data-article-reader', '');
    return () => document.documentElement.removeAttribute('data-article-reader');
  }, []);

  const cover = article.primaryMediaFile
    ? payloads?.find((payload) => payload.key === article.primaryMediaFile?.fileKey)
    : undefined;
  const minutes = Math.ceil(article.readingTimeStats?.minutes ?? 0);
  const channelLink = useChannelLink(odinId, channel);
  const subtitle = abstractSubtitle(article.abstract, article.body);

  /** Opens the clicked image full screen, among all of the article's in document order. */
  const openImage = (e: MouseEvent<HTMLElement>) => {
    const trigger = (e.target as Element).closest?.('[data-zoom-image]');
    if (!(trigger instanceof HTMLElement) || !articleRef.current) return;
    // Masonry columns put images out of document order on the page: the body's carry their place
    // (the cover has none and comes first)
    const order = (el: HTMLElement) => Number(el.dataset.zoomOrder ?? -1);
    const triggers = Array.from(
      articleRef.current.querySelectorAll<HTMLElement>('[data-zoom-image]')
    ).sort((a, b) => order(a) - order(b));
    const targetDrive = getChannelDrive(article.channelId);
    const images = triggers.map(({ dataset }): LightboxImage => {
      const { fileKey, fileId, globalTransitId, src, alt } = dataset;
      return fileKey && fileId
        ? {
            targetDrive,
            fileKey,
            fileId,
            globalTransitId,
            odinId,
            lastModified: updated,
            previewThumbnail: payloads?.find((payload) => payload.key === fileKey)
              ?.previewThumbnail,
            alt,
          }
        : { src: src ?? '', alt };
    });
    // Where focus goes back to when the viewer closes (a click doesn't focus a button in Safari)
    trigger.focus({ preventScroll: true });
    setZoom({ images, index: triggers.indexOf(trigger) });
  };

  return (
    // The page in the article's palette (articleProse.css), edge to edge
    <div className="article-page min-h-screen" onClick={jumpInPlace}>
      <ReaderBar onBack={onBack}>
        <PostContextMenu
          odinId={odinId}
          authorOdinId={authorOdinId}
          postFile={postFile}
          channel={channel}
        />
      </ReaderBar>

      <div
        className={`px-5 pb-24 pt-6 sm:pt-10 ${
          rail ? 'xl:grid xl:grid-cols-[minmax(6.25rem,1fr)_680px_minmax(22rem,1fr)]' : ''
        }`}
      >
        <article
          ref={articleRef}
          className="mx-auto w-full max-w-[680px] xl:col-start-2"
          onClick={openImage}
        >
          {cover && postFile.fileId ? (
            <div className="article-wide mb-8 sm:mb-10">
              <CoverZoom
                image={cover.contentType?.startsWith('image/')}
                fileKey={cover.key}
                fileId={article.primaryMediaFile?.fileId || postFile.fileId}
                globalTransitId={globalTransitId}
              >
                <PrimaryMedia
                  odinId={odinId}
                  file={cover}
                  fileId={article.primaryMediaFile?.fileId || postFile.fileId}
                  globalTransitId={globalTransitId}
                  lastModified={updated}
                  channelId={article.channelId}
                  previewThumbnail={cover.previewThumbnail}
                  probablyEncrypted={isEncrypted}
                  fit="cover"
                  className="aspect-[2/1] w-full rounded-xl"
                />
              </CoverZoom>
            </div>
          ) : null}

          <h1 className="article-font text-balance text-[30px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[44px] sm:leading-[1.12]">
            {article.caption}
          </h1>
          {subtitle ? (
            <p className={`article-font mt-4 text-[20px] leading-[1.5] ${MUTED}`}>{subtitle}</p>
          ) : null}

          <div className="mt-8 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0">
              <AuthorImage odinId={authorOdinId} className="h-10 w-10" size="custom" />
            </div>
            <div className="min-w-0 grow">
              <p className="font-medium leading-snug">
                <AuthorName odinId={authorOdinId} />
                <ToGroupBlock
                  channel={channel}
                  odinId={odinId}
                  authorOdinId={postFile.fileMetadata.originalAuthor}
                  className={`ml-1 font-normal ${MUTED}`}
                />
              </p>
              <div
                className={`mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${MUTED}`}
              >
                <div className="flex flex-wrap items-center">
                  <PostMeta
                    postFile={postFile}
                    channel={channel}
                    odinId={odinId}
                    authorOdinId={authorOdinId}
                    size="text-sm"
                    excludeContextMenu={true}
                  />
                  {minutes ? (
                    <>
                      <span aria-hidden="true" className="px-1.5">
                        ·
                      </span>
                      <span>
                        {minutes} {t('min read')}
                      </span>
                    </>
                  ) : null}
                </div>
                {reactionContext ? (
                  <ArticleCounts
                    context={reactionContext}
                    postFile={postFile}
                    className="ml-auto"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <hr className={`my-8 ${HAIRLINE}`} />

          <div ref={proseRef} className="article-prose" data-toc-rail={rail ? '' : undefined}>
            <ArticleBody
              odinId={odinId}
              article={article}
              tableOfContents={true}
              options={bodyOptions}
              zoomImages={true}
            />
          </div>

          <hr className={`mb-4 mt-12 ${HAIRLINE}`} />
          <PostInteracts
            odinId={reactionOdinId}
            postFile={postFile}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
            excludeComments={true}
            login={login}
          />

          <div className="mt-6 flex items-center gap-4">
            <div className="h-12 w-12 shrink-0">
              <AuthorImage odinId={authorOdinId} className="h-12 w-12" size="custom" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">
                <AuthorName odinId={authorOdinId} />
              </p>
              {channelLink && channel ? (
                <a
                  href={channelLink}
                  className={`text-sm ${MUTED} hover:text-foreground hover:underline`}
                >
                  {t('More from')} {channel.fileMetadata.appData.content.name}
                </a>
              ) : null}
            </div>
          </div>

          {reactionContext ? (
            <Responses
              context={reactionContext}
              postFile={postFile}
              canReact={canReact}
              login={login}
            />
          ) : null}
        </article>

        {rail ? (
          <aside className="hidden xl:col-start-3 xl:row-start-1 xl:block">
            <OnThisPage headings={rail} />
          </aside>
        ) : null}
      </div>

      {zoom ? (
        <ImageLightbox
          images={zoom.images}
          startIndex={zoom.index}
          onClose={() => setZoom(undefined)}
        />
      ) : null}
    </div>
  );
};

/** The cover as a button that opens it full screen, as the body's images are (`data-zoom-image`). */
const CoverZoom = ({
  image,
  fileKey,
  fileId,
  globalTransitId,
  children,
}: {
  /** Only an image opens: a video cover plays where it is */
  image?: boolean;
  fileKey: string;
  fileId: string;
  globalTransitId?: string;
  children: ReactNode;
}) =>
  image ? (
    <button
      type="button"
      data-zoom-image=""
      data-file-key={fileKey}
      data-file-id={fileId}
      data-global-transit-id={globalTransitId}
      aria-label={t('View cover image full screen')}
      className="block w-full cursor-zoom-in rounded-xl"
    >
      {children}
    </button>
  ) : (
    <>{children}</>
  );

/** The sticky bar: back on the left, the post's menu on the right; a hairline once scrolled. */
const ReaderBar = ({ onBack, children }: { onBack?: () => void; children: ReactNode }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 border-b bg-[color-mix(in_srgb,var(--article-surface)_90%,transparent)] backdrop-blur-md motion-safe:transition-colors motion-safe:duration-200 ${
        scrolled ? HAIRLINE : 'border-transparent'
      }`}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t('Back')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition duration-150 ease-out hover:bg-foreground/5 hover:text-foreground active:scale-[0.97]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span />
        )}
        {children}
      </div>
    </header>
  );
};

/** Whether the post takes comments (its reactAccess allows them). */
const takesComments = ({ reactAccess }: PostContent) =>
  reactAccess === undefined || reactAccess === true || reactAccess === 'comment';

/** Reactions and responses, by the byline; the 💬 jumps to the responses. */
const ArticleCounts = ({
  context,
  postFile,
  className,
}: {
  context: ReactionContext;
  postFile: HomebaseFile<PostContent>;
  className?: string;
}) => {
  const preview = useMemo(
    () => parseReactionPreview(postFile.fileMetadata.reactionPreview),
    [postFile.fileMetadata.reactionPreview]
  );
  const { data: emojis } = useEmojiSummary({ context, reactionPreview: preview.reactions }).fetch;
  const comments = useCommentCount(context, preview.comments);

  const reactions = emojis?.totalCount || 0;

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      {reactions ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">
            <Heart className="h-4 w-4" />
          </span>
          {reactions}
          <span className="sr-only">{t('reactions')}</span>
        </span>
      ) : null}
      {takesComments(postFile.fileMetadata.appData.content) || comments ? (
        <a
          href={`#${RESPONSES_HASH}`}
          className="inline-flex items-center gap-1.5 rounded-md hover:text-foreground"
        >
          <span aria-hidden="true">
            <Bubble className="h-4 w-4" />
          </span>
          {comments || null}
          <span className="sr-only">{t('Responses')}</span>
        </a>
      ) : null}
    </div>
  );
};

/**
 * The responses: "Responses (n)", with the count the 💬 by the byline shows, the composer, then the
 * threads. None at all on a post that takes no comments and has none.
 */
const Responses = ({
  context,
  postFile,
  canReact,
  login,
}: {
  context: ReactionContext;
  postFile: HomebaseFile<PostContent>;
  canReact?: CanReactInfo;
  login?: () => void;
}) => {
  const preview = useMemo(
    () => parseReactionPreview(postFile.fileMetadata.reactionPreview),
    [postFile.fileMetadata.reactionPreview]
  );
  const count = useCommentCount(context, preview.comments);
  if (!takesComments(postFile.fileMetadata.appData.content) && !count) return null;

  return (
    <section
      id={RESPONSES_ID}
      aria-labelledby={`${RESPONSES_ID}_title`}
      className="mt-12 scroll-mt-20"
    >
      <h2 id={`${RESPONSES_ID}_title`} className="text-[22px] font-[650] leading-[1.35]">
        {t('Responses')}
        {count ? <span className="font-normal text-foreground/60"> ({count})</span> : null}
      </h2>
      {/* The composer, then the threads, 24px apart; a thread's replies keep their 8px */}
      <div className="mt-5 flex flex-col gap-6">
        <Suspense fallback={null}>
          <CommentList
            context={context}
            canReact={canReact}
            login={login}
            composerFirst
            threadClassName="grid grid-flow-row gap-2"
          />
        </Suspense>
      </div>
    </section>
  );
};

/** A heading of the rendered body, as the rail lists it. */
type RailHeading = { id: string; level: number; text: string };

/** The sticky "On this page" rail, with the heading being read in the foreground and a bar beside it. */
const OnThisPage = ({ headings }: { headings: RailHeading[] }) => {
  const active = useActiveHeading(headings);
  const topLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <nav
      aria-label={t('On this page')}
      className="sticky top-20 ml-[8.25rem] max-h-[calc(100vh-7rem)] max-w-[15rem] overflow-y-auto py-1 text-sm"
    >
      <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${MUTED}`}>
        {t('On this page')}
      </p>
      <ol className={`border-l ${HAIRLINE}`}>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === active ? 'location' : undefined}
              // The page follows the link in place (jumpInPlace); the address names the heading, to share
              onClick={() =>
                window.history.replaceState(window.history.state, '', `#${heading.id}`)
              }
              style={{ paddingLeft: `${1 + (heading.level - topLevel) * 0.75}rem` }}
              className={`-ml-px block border-l-2 py-1 leading-snug transition-colors ${
                heading.id === active
                  ? 'border-foreground text-foreground'
                  : `border-transparent ${MUTED} hover:text-foreground`
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};

/**
 * The h2 to h4 headings with an id in the rendered body, as they are on the page: the viewer gives
 * a Journal body's headings ids, and a body it can't show (the Slate one it falls back to) has
 * none, so the rail never links to a heading that isn't there. Read again as the body renders.
 */
const useRenderedHeadings = (body: RefObject<HTMLElement | null>) => {
  const [headings, setHeadings] = useState<RailHeading[]>([]);
  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const read = () => {
      const found = Array.from(
        element.querySelectorAll<HTMLElement>('h2[id], h3[id], h4[id]'),
        (heading): RailHeading => ({
          id: heading.id,
          level: Number(heading.tagName[1]),
          text: heading.textContent?.trim() ?? '',
        })
      );
      setHeadings((previous) =>
        JSON.stringify(previous) === JSON.stringify(found) ? previous : found
      );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [body]);
  return headings;
};

/** The heading being read: the last one scrolled above a line just below the bar. */
const useActiveHeading = (headings: RailHeading[]) => {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: string | undefined;
      for (const { id } of headings) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        // ponytail: one layout read per heading per frame; fine for articles' tens of headings
        if (top !== undefined && top <= 96) current = id;
      }
      setActive(current);
    };
    const onScroll = () => (frame ||= requestAnimationFrame(update));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [headings]);

  return active;
};

/**
 * Arriving at a place in the article (`#responses`, a heading's `#id`): there once it is on the page,
 * and kept there while the body above it renders (the viewer's chunk, then its images), until the
 * reader scrolls, clicks or types, or 10 seconds pass.
 */
const useArrivalHash = (body: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const element = body.current;
    if (!hash || !element) return;
    let id = hash;
    try {
      id = hash === RESPONSES_HASH ? RESPONSES_ID : decodeURIComponent(hash);
    } catch {
      // A malformed escape ('%'): the hash as it is
    }

    // Fires once when observing starts, then each time the body changes height
    const resize = new ResizeObserver(() => document.getElementById(id)?.scrollIntoView());
    // The responses come in after the body; only once they do may there be room to reach them
    const responses = id === RESPONSES_ID ? document.getElementById(id) : null;
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    const stop = () => {
      resize.disconnect();
      clearTimeout(timer);
      events.forEach((type) => window.removeEventListener(type, stop));
    };
    const timer = setTimeout(stop, 10_000);
    events.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    resize.observe(element);
    if (responses) resize.observe(responses);
    return stop;
  }, [body]);
};

/**
 * Escape goes back, unless it is a field's (typing a response), a dialog's or the emoji picker's,
 * or a menu took it (preventDefault).
 */
const useEscape = (onBack: (() => void) | undefined) => {
  useEffect(() => {
    if (!onBack) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // The element itself, also inside a shadow root (the emoji picker's search field)
      const target = e.composedPath()[0] as HTMLElement | undefined;
      if (
        target?.isContentEditable ||
        target?.closest?.('input, textarea, select') ||
        document.querySelector('[aria-modal="true"], emoji-picker')
      )
        return;
      onBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack]);
};

/**
 * Follows `#id` links on the page (the tables of contents, footnotes, 💬) by scrolling, without a
 * history entry: one would drop the state that Back reads, and stack up a Back press per jump.
 */
const jumpInPlace = (e: MouseEvent<HTMLElement>) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  const link = (e.target as Element).closest?.('a[href^="#"]');
  const hash = link?.getAttribute('href')?.slice(1);
  const id = hash === RESPONSES_HASH ? RESPONSES_ID : hash;
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
