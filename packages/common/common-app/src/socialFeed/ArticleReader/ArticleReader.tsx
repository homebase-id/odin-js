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
  cleanTiptapDoc,
  getChannelDrive,
  parseReactionPreview,
  PostContent,
  ReactionContext,
} from '@homebase-id/js-lib/public';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
// Self-hosted, so reading an article sends nothing to a font service; the files load with the first
// article, as KaTeX's do in ArticleDoc
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '../../richText/article/articleProse.css';
import { articleHeadings, type ArticleHeading } from '../../richText/article/headingSlugs';
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
 * An article as a page of its own, for long reading: the cover, title, abstract and byline, the body
 * in the serif reading scale (articleProse.css), an "On this page" rail from 1280px, then the
 * reactions and the responses.
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

  useEscape(onBack);

  const cover = article.primaryMediaFile
    ? payloads?.find((payload) => payload.key === article.primaryMediaFile?.fileKey)
    : undefined;
  const minutes = Math.ceil(article.readingTimeStats?.minutes ?? 0);
  const channelLink = useChannelLink(odinId, channel);

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
        <article className="mx-auto w-full max-w-[680px] xl:col-start-2">
          {cover && postFile.fileId ? (
            <div className="article-wide mb-8 sm:mb-10">
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
            </div>
          ) : null}

          <h1 className="text-balance text-[30px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[44px] sm:leading-[1.12]">
            {article.caption}
          </h1>
          {article.abstract ? (
            <p className="article-serif mt-4 text-[19px] leading-[1.45] text-foreground/65 sm:text-[22px]">
              {article.abstract}
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
              id="responses"
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
            <OnThisPage headings={rail} proseRef={proseRef} />
          </aside>
        ) : null}
      </div>
    </div>
  );
};

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
          href="#responses"
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
const OnThisPage = ({
  headings,
  proseRef,
}: {
  headings: ArticleHeading[];
  proseRef: RefObject<HTMLElement>;
}) => {
  const active = useActiveHeading(headings, proseRef);
  const topLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <nav
      aria-label={t('On this page')}
      className="sticky top-24 ml-[8.25rem] max-h-[calc(100vh-8rem)] max-w-[15rem] overflow-y-auto border-l border-foreground/10 py-1 pl-4 text-sm"
    >
      <p className="mb-3 font-medium text-foreground/50">{t('On this page')}</p>
      <ol className="flex flex-col gap-2">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - topLevel) * 0.75}rem` }}
          >
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
 * The headings ArticleDocRenderer gives ids, from the document it shows. None for an article
 * without a `bodyDoc`: its Slate body renders headings without ids.
 */
const useArticleHeadings = (article: Pick<Article, 'body' | 'bodyDoc'>) => {
  const [headings, setHeadings] = useState<ArticleHeading[]>([]);
  useEffect(() => {
    if (!article.bodyDoc) {
      setHeadings([]);
      return;
    }
    let current = true;
    articleDocOf(article).then(
      (doc) => current && setHeadings(articleHeadings(cleanTiptapDoc(doc))),
      () => current && setHeadings([])
    );
    return () => {
      current = false;
    };
  }, [article.body, article.bodyDoc]);
  return headings;
};

/** The heading being read: the topmost one in a band below the bar, else the one scrolled past. */
const useActiveHeading = (headings: ArticleHeading[], container: RefObject<HTMLElement>) => {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const ids = headings.map((heading) => heading.id);
    const inBand = new Set<string>();

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            inBand.add(id);
          } else {
            inBand.delete(id);
            // Scrolled back above this heading: the section before it is the one being read
            if (entry.boundingClientRect.top > (entry.rootBounds?.bottom ?? 0))
              setActive((current) => (current === id ? ids[ids.indexOf(id) - 1] : current));
          }
        }
        const topmost = ids.find((id) => inBand.has(id));
        if (topmost) setActive(topmost);
      },
      // Below the 56px bar, down to 40% of the window
      { rootMargin: '-56px 0px -60% 0px' }
    );

    // The body renders once the viewer's chunk is in: observe the headings when they are there
    const observe = () => {
      const elements = ids.map((id) => document.getElementById(id));
      if (elements.some((element) => !element)) return false;
      elements.forEach((element) => intersection.observe(element as HTMLElement));
      return true;
    };
    const mutations = new MutationObserver(() => observe() && mutations.disconnect());
    if (!observe()) mutations.observe(root, { childList: true, subtree: true });

    return () => {
      intersection.disconnect();
      mutations.disconnect();
    };
  }, [headings, container]);

  return active;
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
  const href = (e.target as Element).closest?.('a[href^="#"]')?.getAttribute('href');
  const target = href && href.length > 1 ? document.getElementById(href.slice(1)) : null;
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
};
