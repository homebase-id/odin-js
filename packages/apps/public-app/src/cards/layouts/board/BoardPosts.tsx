import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Image, t } from '@homebase-id/common-app';
import type { HomebaseFile } from '@homebase-id/js-lib/core';
import type { Article, PostContent } from '@homebase-id/js-lib/public';
import type { CardData } from '../../useCardData';
import { POSTS_HREF, postDate, postImage, usePostHref } from '../../parts/posts';
import { FOCUS } from './styles';

type Post = HomebaseFile<PostContent>;

const GRID_SIZE = 6;
// useCardData keeps the first 12 posts, so a shorter list is the full count
const LOADED_CAP = 12;

const THIS_YEAR = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const formatDate = (date: Date) =>
  (date.getFullYear() === new Date().getFullYear() ? THIS_YEAR : OTHER_YEAR).format(date);

const BoardPostCard = ({ post, href }: { post: Post; href: string }) => {
  const content = post.fileMetadata.appData.content;
  const image = postImage(post);
  const date = postDate(post);
  // toISOString and Intl both throw on an invalid date
  const hasDate = !Number.isNaN(date.getTime());
  const minutes =
    content.type === 'Article' ? (content as Article).readingTimeStats?.minutes : undefined;

  return (
    <Link
      to={href}
      className={`block h-full overflow-hidden rounded-[10px] bg-[var(--card-surface)] text-[color:var(--card-surface-ink)] shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-[0_2px_0_rgba(0,0,0,0.2)] ${FOCUS}`}
    >
      {/* the accent shows when a post has no picture, and while one loads */}
      <div className="relative aspect-[2/1] bg-[var(--card-accent)]">
        {image ? (
          <Image
            {...image}
            fileId={image.fileId}
            fileKey={image.fileKey}
            alt=""
            fit="cover"
            className="absolute inset-0 h-full w-full"
          />
        ) : null}
      </div>
      <div className="px-[15px] pb-4 pt-[13px]">
        <p className="text-[13px] font-medium text-[color:color-mix(in_srgb,var(--card-surface-ink)_70%,var(--card-surface))]">
          {hasDate ? <time dateTime={date.toISOString()}>{formatDate(date)}</time> : null}
          {hasDate && minutes ? ' · ' : null}
          {minutes ? t('{0} min', Math.ceil(minutes)) : null}
        </p>
        {content.caption ? (
          <h3 className="mt-[5px] line-clamp-3 text-pretty text-[17px] font-semibold leading-[22px]">
            {content.caption}
          </h3>
        ) : null}
      </div>
    </Link>
  );
};

export const BoardPosts = ({ data }: { data: CardData }) => {
  const headingId = useId();
  const postHref = usePostHref();
  const { posts } = data;
  if (!posts.length) return null;

  const knownCount = posts.length < LOADED_CAP;
  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto w-full max-w-[1120px] px-10 pt-[58px] lg:px-24"
    >
      <div className="flex items-center gap-[18px] pb-[22px]">
        <h2
          id={headingId}
          className="font-[family-name:var(--card-display)] text-[24px] font-semibold"
        >
          {t('Latest posts')}
        </h2>
        <span
          aria-hidden
          className="h-0.5 flex-1 rounded-[1px] bg-[color:color-mix(in_srgb,var(--card-ink)_22%,transparent)]"
        />
        <Link
          to={POSTS_HREF}
          aria-label={knownCount ? t('All {0} posts', posts.length) : t('All posts')}
          className={`whitespace-nowrap text-[14px] font-semibold text-[color:color-mix(in_srgb,var(--card-ink)_82%,transparent)] hover:text-[color:var(--card-ink)] ${FOCUS}`}
        >
          {knownCount ? t('All {0}', posts.length) : t('All posts')} <span aria-hidden>→</span>
        </Link>
      </div>
      {/* three columns at the 1120px design width; two once a column would drop under 260px */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 lg:gap-6">
        {posts.slice(0, GRID_SIZE).map((post) => (
          <li key={post.fileMetadata.appData.content.id}>
            <BoardPostCard post={post} href={postHref(post)} />
          </li>
        ))}
      </ul>
    </section>
  );
};
