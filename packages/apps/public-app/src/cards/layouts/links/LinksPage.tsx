import { useId } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@homebase-id/common-app';
import { CARD_FOCUS, type LayoutProps } from '../../CardDesign';
import type { CardData, CardPost } from '../../useCardData';
import { POSTS_HREF, postDate } from '../../parts/posts';
import { CardImg } from '../../parts/CardImg';
import { CardSignIn } from '../../parts/SignIn';
import { LINKS_VARS, LinksProfile } from './LinksParts';

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
      className={`flex items-start gap-4 rounded-[18px] bg-[var(--card-surface)] p-4 text-[color:var(--card-surface-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_9%,transparent)] ${CARD_FOCUS}`}
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
          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl"
        />
      ) : null}
    </Link>
  );
};

const LinksPosts = ({ data }: { data: CardData }) => {
  const headingId = useId();
  const { posts } = data;
  if (!posts.length) return null;
  const knownCount = posts.length < LOADED_CAP;
  return (
    <section aria-labelledby={headingId} className="mx-auto w-full max-w-[560px] px-5 pt-12">
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

export const LinksPage = ({ design, data }: LayoutProps) => (
  <div style={LINKS_VARS} className="relative min-h-[inherit] pb-20">
    <header className="flex justify-end px-6 pt-5">
      <CardSignIn className="rounded-full bg-[color:var(--card-accent)] px-[18px] py-2 text-[13px] font-semibold text-[color:var(--card-surface)]" />
    </header>
    <main>
      <div className="mx-auto w-full max-w-[560px] px-5 pt-6">
        <LinksProfile design={design} data={data} size="page" />
      </div>
      <LinksPosts data={data} />
    </main>
  </div>
);
