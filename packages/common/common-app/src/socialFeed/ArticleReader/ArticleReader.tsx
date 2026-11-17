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
  articleDocOf,
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
import type { ArticleHeading } from '../../richText/article/headingSlugs';
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
  useChannelLink,
  useCommentSummary,
  useEmojiSummary,
} from '../../..';
import { ArrowLeft, Bubble, Heart } from '../../ui/Icons';

/** Rail and inline box both list the headings from this many on, as ArticleDocRenderer does. */
const MIN_TOC_HEADINGS = 3;

/**
 * `#responses`, in the address or on the 💬 link, is the responses. A heading can have that id too
 * ("Responses"), so the section's own is one no heading slug can be: slugs have no '_'.
 */
const RESPONSES_HASH = 'responses';
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

  const headings = useArticleHeadings(article);
  const rail = headings.length >= MIN_TOC_HEADINGS ? headings : undefined;
  const proseRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState<{ images: LightboxImage[]; index: number }>();

  useEscape(onBack);
  useArrivalHash(proseRef);

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
    const triggers = Array.from(
      articleRef.current.querySelectorAll<HTMLElement>('[data-zoom-image]')
    );
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
    <div className="min-h-screen bg-background text-foreground" onClick={jumpInPlace}>
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
            <p className="article-font mt-4 text-[20px] leading-[1.5] text-foreground/65">
              {subtitle}
            </p>
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
                  className="ml-1 font-normal text-foreground/60"
                />
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
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

          <hr className="my-8 border-foreground/10" />

          <div
            ref={proseRef}
            className="article-prose text-foreground/90"
            data-toc-rail={rail ? '' : undefined}
          >
            <ArticleBody
              odinId={odinId}
              article={article}
              tableOfContents={true}
              options={bodyOptions}
              zoomImages={true}
            />
          </div>

          <hr className="mb-4 mt-12 border-foreground/10" />
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
                  className="text-sm text-foreground/60 hover:text-foreground hover:underline"
                >
                  {t('More from')} {channel.fileMetadata.appData.content.name}
                </a>
              ) : null}
            </div>
          </div>

          {reactionContext ? (
            <section
              id={RESPONSES_ID}
              aria-label={t('Responses')}
              className="mt-12 grid scroll-mt-20 grid-flow-row gap-2"
            >
              <Suspense fallback={null}>
                <CommentList context={reactionContext} canReact={canReact} login={login} />
              </Suspense>
            </section>
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
      className={`sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md motion-safe:transition-colors motion-safe:duration-200 ${
        scrolled ? 'border-foreground/10' : 'border-transparent'
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
  const { reactAccess } = postFile.fileMetadata.appData.content;
  const preview = useMemo(
    () => parseReactionPreview(postFile.fileMetadata.reactionPreview),
    [postFile.fileMetadata.reactionPreview]
  );
  const { data: emojis } = useEmojiSummary({ context, reactionPreview: preview.reactions }).fetch;
  const { data: comments } = useCommentSummary({
    authorOdinId: context.odinId,
    channelId: context.channelId,
    postGlobalTransitId: context.target.globalTransitId,
    reactionPreview: preview.comments,
  }).fetch;

  const reactions = emojis?.totalCount || 0;
  const canComment = reactAccess === undefined || reactAccess === true || reactAccess === 'comment';

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
      {canComment || comments ? (
        <a
          href={`#${RESPONSES_HASH}`}
          data-responses=""
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

/** The sticky "On this page" rail, with the heading being read in the foreground. */
const OnThisPage = ({ headings }: { headings: ArticleHeading[] }) => {
  const active = useActiveHeading(headings);
  const topLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <nav
      aria-label={t('On this page')}
      className="sticky top-24 ml-[8.25rem] max-h-[calc(100vh-8rem)] max-w-[15rem] overflow-y-auto border-l border-foreground/10 py-1 pl-4 text-sm"
    >
      <p className="mb-3 font-medium text-foreground/50">{t('On this page')}</p>
      <ol className="flex flex-col gap-2">
        {headings.map((heading) => (
          <li key={heading.id} style={{ paddingLeft: `${(heading.level - topLevel) * 0.75}rem` }}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === active ? 'location' : undefined}
              className={`block leading-snug transition-colors ${
                heading.id === active
                  ? 'text-foreground'
                  : 'text-foreground/50 hover:text-foreground/80'
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
 * The headings ArticleDocRenderer gives ids, from the document it shows, sanitized as it does: from
 * its own chunk, which ArticleBody loads for the same article. None for an article without a
 * `bodyDoc`: its Slate body renders headings without ids.
 */
const useArticleHeadings = (article: Pick<Article, 'body' | 'bodyDoc'>) => {
  const [headings, setHeadings] = useState<ArticleHeading[]>([]);
  useEffect(() => {
    if (!article.bodyDoc) {
      setHeadings([]);
      return;
    }
    let current = true;
    Promise.all([articleDocOf(article), import('../../richText/article/ArticleDocRenderer')]).then(
      ([doc, { articleDocHeadings }]) => current && setHeadings(articleDocHeadings(doc)),
      () => current && setHeadings([])
    );
    return () => {
      current = false;
    };
  }, [article.body, article.bodyDoc]);
  return headings;
};

/** The heading being read: the last one scrolled above a line just below the bar. */
const useActiveHeading = (headings: ArticleHeading[]) => {
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
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    const stop = () => {
      resize.disconnect();
      clearTimeout(timer);
      events.forEach((type) => window.removeEventListener(type, stop));
    };
    const timer = setTimeout(stop, 10_000);
    events.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    resize.observe(element);
    return stop;
  }, [body]);
};

/** Escape goes back, unless it is a field's (typing a response) or a dialog's. */
const useEscape = (onBack: (() => void) | undefined) => {
  useEffect(() => {
    if (!onBack) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest?.('input, textarea, select') ||
        document.querySelector('[aria-modal="true"]')
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
  const href = link?.getAttribute('href');
  const id = link?.hasAttribute('data-responses') ? RESPONSES_ID : href?.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
