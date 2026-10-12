import { useId } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@homebase-id/common-app';
import { CARD_FOCUS, type LayoutProps } from '../../CardDesign';
import type { CardData, CardPost } from '../../useCardData';
import { POSTS_HREF, postDate } from '../../parts/posts';
import { CardImg } from '../../parts/CardImg';
import { CardSignIn } from '../../parts/SignIn';
import { LinksIdentity, LinksList, hasLinks, isLinkable, linksVars } from './LinksParts';

const DATE = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const POSTS_SHOWN = 6;
const LOADED_CAP = 12;

const PostRow = ({ post }: { post: CardPost }) => {
  const date = postDate(post);
  const hasDate = !Number.isNaN(date.getTime());
  return (
    <Link
      to={post.href}
      className={`flex items-start gap-4 rounded-[var(--links-tile-radius)] bg-[var(--card-surface)] p-4 text-[color:var(--card-surface-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_9%,transparent)] ${CARD_FOCUS}`}
    >
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-[12px] text-[color:var(--card-muted)]" dir="ltr">
          {hasDate ? <time dateTime={date.toISOString()}>{DATE.format(date)}</time> : null}
          {hasDate && post.minutes ? ' · ' : null}
          {post.minutes ? t('{0} min', Math.ceil(post.minutes)) : null}
        </span>
        {post.title ? (
          <span
            dir="auto"
            className="mt-1 line-clamp-2 block text-[17px] font-semibold leading-6 [overflow-wrap:anywhere]"
          >
            {post.title}
          </span>
        ) : (
          <span className="sr-only">{t('Untitled')}</span>
        )}
        {post.excerpt ? (
          <span
            dir="auto"
            className="mt-1 line-clamp-2 block text-[14px] leading-5 text-[color:var(--card-muted)] [overflow-wrap:anywhere]"
          >
            {post.excerpt}
          </span>
        ) : null}
      </span>
      {post.image ? (
        <CardImg
          image={post.image}
          alt=""
          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--links-well-radius)]"
        />
      ) : null}
    </Link>
  );
};

const LinksPosts = ({ data, className }: { data: CardData; className?: string }) => {
  const headingId = useId();
  const { posts } = data;
  if (!posts.length) return null;
  const knownCount = posts.length < LOADED_CAP;
  return (
    <section aria-labelledby={headingId} className={`w-full ${className ?? ''}`}>
      <div className="flex items-baseline justify-between gap-4 pb-4">
        <h2
          id={headingId}
          className="font-[family-name:var(--card-display)] text-[22px] font-semibold"
        >
          {t('Latest posts')}
        </h2>
        <Link
          to={POSTS_HREF}
          aria-label={knownCount ? t('All {0} posts', posts.length) : t('All posts')}
          className={`whitespace-nowrap text-[14px] font-semibold text-[color:var(--card-accent)] ${CARD_FOCUS}`}
        >
          {knownCount ? t('All {0}', posts.length) : t('All posts')}
        </Link>
      </div>
      <ul className="flex flex-col gap-2.5">
        {posts.slice(0, POSTS_SHOWN).map((post) => (
          <li key={post.id}>
            <PostRow post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
};

// From 1024 the identity becomes a column beside the links. With no links there is nothing to
// set beside it, so the page stays one centred column
export const LinksPage = ({ design, data }: LayoutProps) => {
  const hasPosts = data.posts.length > 0;
  const split = hasLinks(data);
  // A long list would leave the identity column bare, so the posts move under it
  const postsBeside = data.links.filter(isLinkable).length > 5;
  return (
    <div style={linksVars(design)} className="relative min-h-[inherit] overflow-hidden pb-20">
      <header className="flex justify-end px-6 pt-5">
        <CardSignIn className="rounded-full bg-[color:var(--card-accent)] px-[18px] py-2 text-[13px] font-semibold text-[color:var(--card-surface)]" />
      </header>
      {split ? (
        <main className="mx-auto flex w-full max-w-[560px] flex-col gap-10 px-5 pt-6 lg:grid lg:max-w-[1120px] lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-12 lg:px-10 lg:pt-8 xl:max-w-[1240px]">
          <aside
            className={`lg:col-start-1 lg:row-start-1 lg:self-start ${postsBeside ? '' : 'lg:sticky lg:top-10'}`}
          >
            <LinksIdentity design={design} data={data} size="page" split />
          </aside>
          <div
            className={`min-w-0 lg:col-start-2 lg:row-start-1 lg:max-w-[640px] xl:max-w-none ${postsBeside ? 'lg:row-span-2' : ''}`}
          >
            <LinksList design={design} data={data} skipMoments={hasPosts} columns />
          </div>
          <LinksPosts
            data={data}
            className={`lg:row-start-2 lg:self-start ${postsBeside ? 'lg:col-start-1' : 'lg:col-start-2 lg:max-w-[640px] xl:max-w-none'}`}
          />
        </main>
      ) : (
        <main className="mx-auto flex w-full max-w-[640px] flex-col gap-10 px-5 pt-6 lg:pt-8">
          <LinksIdentity design={design} data={data} size="page" />
          <LinksList design={design} data={data} skipMoments={hasPosts} emptyNote={!hasPosts} />
          <LinksPosts data={data} />
        </main>
      )}
    </div>
  );
};
