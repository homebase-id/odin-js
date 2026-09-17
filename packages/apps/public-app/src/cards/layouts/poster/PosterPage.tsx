import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Image, t, useDotYouClientContext } from '@homebase-id/common-app';
import type { HomebaseFile } from '@homebase-id/js-lib/core';
import type { Article, PostContent } from '@homebase-id/js-lib/public';
import { CARD_FOCUS as FOCUS, type LayoutProps } from '../../CardDesign';
import type { CardData } from '../../useCardData';
import { CardBlocks, isUsableLink } from '../../parts/Blocks';
import { CardLabel, CardName } from '../../parts/Type';
import { CardSocials } from '../../parts/Socials';
import { POSTS_HREF, postDate, postImage, usePostHref } from '../../parts/posts';
import { CardSignIn } from '../../parts/SignIn';

type Post = HomebaseFile<PostContent>;

const FOCUS_ON_PAPER =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--card-ground)]';
const GUTTER = 'px-[clamp(32px,5.72vw,64px)]'; // 64px at 1120
const INNER = 'mx-auto w-full max-w-[1312px]'; // stops stretching past 1440

// The writing section is paper. Its greys are the ground mixed into the paper (4.5:1 or better)
const PAPER = {
  '--paper': '#F3EFE8',
  '--paper-body': 'color-mix(in srgb, var(--card-ground) 72%, var(--paper))',
  '--paper-muted': 'color-mix(in srgb, var(--card-ground) 62%, var(--paper))',
  '--paper-rule': 'color-mix(in srgb, var(--card-ground) 18%, transparent)',
} as CSSProperties;

const HERO_SCRIM = [
  'linear-gradient(to right, var(--card-ground), color-mix(in srgb, var(--card-ground) 45%, transparent) 30%, transparent 60%)',
  // top keeps the nav legible on bright photos; bottom carries the socials
  'linear-gradient(to bottom, color-mix(in srgb, var(--card-ground) 80%, transparent), transparent 30%, transparent 55%, color-mix(in srgb, var(--card-ground) 72%, transparent))',
].join(', ');

// CardBlocks laid out as one row: a shared top hairline, vertical hairlines between
const ROW =
  '!flex-row flex-wrap !gap-0 [&>a]:border-r [&>a]:px-7 [&>a]:pb-0 [&>a]:pt-[13px] [&>a]:text-[21px] [&>a]:leading-7 [&>a:first-child]:pl-0 [&>a:last-child]:border-r-0 [&>a:last-child]:pr-0';
const GLYPHS = '!gap-[18px] pb-[3px] [&_svg]:h-5 [&_svg]:w-5';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const postText = (post: Post) => {
  const content = post.fileMetadata.appData.content;
  const article = content.type === 'Article' ? (content as Article) : undefined;
  return {
    title: content.caption || t('Untitled'),
    // Only articles carry a summary; for other posts the caption already is the title
    summary: article?.abstract || undefined,
    minutes: Math.ceil(article?.readingTimeStats?.minutes ?? 0),
  };
};

const SignIn = () => (
  <CardSignIn className="rounded-full border border-[color:color-mix(in_srgb,var(--card-ink)_55%,transparent)] px-4 py-1.5 text-sm font-medium text-[color:var(--card-ink)] hover:bg-[color:color-mix(in_srgb,var(--card-ink)_12%,transparent)]" />
);

const TopBar = ({ data }: { data: CardData }) => {
  const first = data.links.find(isUsableLink);
  // Full ink rather than the reference's 85%: the nav sits on the photo
  const link = `text-sm text-[color:var(--card-ink)] underline-offset-4 hover:underline ${FOCUS}`;
  return (
    <header className="absolute right-8 top-6 z-10 font-sans">
      <nav aria-label={t('Sections')} className="flex items-center gap-[26px]">
        <Link to={POSTS_HREF} className={link}>
          {t('Writing')}
        </Link>
        {first ? (
          <a
            href={first.target}
            target="_blank"
            rel="noopener noreferrer"
            className={`max-w-[14rem] truncate ${link}`}
          >
            {first.text}
          </a>
        ) : null}
        <SignIn />
      </nav>
    </header>
  );
};

// The photo holds the right side and fades left into the ground
const HeroGround = ({ design, data }: LayoutProps) => {
  const photo = design.ground.photo ? data.photo : undefined;
  if (!photo) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[44%] right-0 -z-10">
      <Image
        {...photo}
        fileId={photo.fileId}
        fileKey={photo.fileKey}
        alt=""
        fit="cover"
        className="h-full w-full [&_img]:object-[50%_30%]"
      />
      <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
    </div>
  );
};

const Hero = ({ design, data, grow }: LayoutProps & { grow: boolean }) => (
  <section
    className={`relative isolate flex min-h-[clamp(480px,50vw,600px)] flex-col justify-end overflow-hidden pb-10 pt-24 ${GUTTER} ${
      grow ? 'flex-1' : ''
    }`}
  >
    <HeroGround design={design} data={data} />
    <div className={INNER}>
      {data.headline ? (
        <CardLabel className="!text-[12px] !tracking-[0.24em]">{data.headline}</CardLabel>
      ) : null}
      <CardName
        design={design}
        data={data}
        className="break-words pt-3.5 text-[length:clamp(76px,10vw,118px)] font-light leading-[0.93] tracking-[-0.03em]"
      />
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pt-[22px]">
        <CardBlocks design={design} data={data} className={ROW} />
        <CardSocials variant={design.socials} data={data} className={`ml-auto ${GLYPHS}`} />
      </div>
    </div>
  </section>
);

const PostDate = ({ post, minutes }: { post: Post; minutes?: number }) => {
  const date = postDate(post);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <p className="font-[family-name:var(--card-label)] text-[12px] uppercase tracking-[0.14em] text-[color:var(--paper-muted)]">
      <time dateTime={date.toISOString()}>{DATE_FORMAT.format(date)}</time>
      {minutes ? ` · ${t('{0} min', minutes)}` : null}
    </p>
  );
};

const FeaturedPost = ({ post, href }: { post: Post; href: string }) => {
  const image = postImage(post);
  const { title, summary, minutes } = postText(post);
  return (
    <article
      className={`group relative pt-7 ${
        image
          ? 'grid grid-cols-[minmax(0,440fr)_minmax(0,504fr)] items-start gap-12'
          : 'max-w-[42rem]'
      }`}
    >
      {image ? (
        <div className="aspect-[44/25] overflow-hidden bg-[var(--paper-rule)]">
          <Image
            {...image}
            fileId={image.fileId}
            fileKey={image.fileKey}
            alt=""
            fit="cover"
            className="h-full w-full"
          />
        </div>
      ) : null}
      <div className="pt-1.5">
        <PostDate post={post} minutes={minutes} />
        <h3 className="line-clamp-4 pt-3 font-[family-name:var(--card-display)] text-[length:clamp(30px,3.75vw,42px)] font-normal leading-[1.1] tracking-[-0.02em] transition-colors [text-wrap:pretty] group-hover:text-[color:var(--paper-body)]">
          {title}
        </h3>
        {summary ? (
          <p className="line-clamp-4 pt-3.5 text-[19px] font-light leading-[29px] text-[color:var(--paper-body)] [text-wrap:pretty]">
            {summary}
          </p>
        ) : null}
        {/* The whole article is the hit area; this link is its one tab stop */}
        <Link
          to={href}
          className={`mt-4 inline-block font-sans text-sm font-medium after:absolute after:inset-0 ${FOCUS_ON_PAPER}`}
        >
          {t('Read')}
          <span aria-hidden> &rarr;</span>
          <span className="sr-only">: {title}</span>
        </Link>
      </div>
    </article>
  );
};

const PostRow = ({ post, href }: { post: Post; href: string }) => {
  const { title, summary } = postText(post);
  return (
    <li className="group relative grid grid-cols-[180px_minmax(0,1fr)] gap-8 border-t border-[color:var(--paper-rule)] py-[22px] last:border-b">
      <div className="pt-1.5">
        <PostDate post={post} />
      </div>
      <div>
        <h3 className="font-[family-name:var(--card-display)] text-[27px] font-normal leading-8 tracking-[-0.01em]">
          <Link
            to={href}
            className={`line-clamp-2 transition-colors after:absolute after:inset-0 group-hover:text-[color:var(--paper-body)] ${FOCUS_ON_PAPER}`}
          >
            {title}
          </Link>
        </h3>
        {summary ? (
          <p className="line-clamp-2 pt-[5px] text-base font-light leading-6 text-[color:var(--paper-body)]">
            {summary}
          </p>
        ) : null}
      </div>
    </li>
  );
};

const Writing = ({ posts }: { posts: Post[] }) => {
  const hrefOf = usePostHref();
  const [featured, ...rest] = posts;
  const rows = rest.slice(0, 4);
  return (
    <section
      style={PAPER}
      className={`flex-1 bg-[var(--paper)] pb-16 pt-[60px] text-[color:var(--card-ground)] ${GUTTER}`}
    >
      <div className={INNER}>
        <div className="flex items-center gap-[18px]">
          <h2 className="font-[family-name:var(--card-label)] text-[12px] uppercase tracking-[0.24em] text-[color:var(--paper-muted)]">
            {t('Writing')}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-[var(--card-ground)] opacity-25" />
        </div>
        <FeaturedPost post={featured} href={hrefOf(featured)} />
        {rows.length ? (
          <ul className="pt-10">
            {rows.map((post) => (
              <PostRow key={post.fileId} post={post} href={hrefOf(post)} />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
};

const Footer = ({ data }: { data: CardData }) => {
  const isAuthenticated = useDotYouClientContext().isAuthenticated();
  const name = data.firstName || data.displayName || data.odinId;
  return (
    <footer
      className={`flex min-h-14 flex-wrap items-center justify-between gap-x-8 gap-y-1 bg-[var(--card-ground)] py-3 font-sans ${GUTTER}`}
    >
      <p className="font-[family-name:var(--card-label)] text-[11px] uppercase tracking-[0.12em] text-[color:color-mix(in_srgb,var(--card-ink)_55%,transparent)]">
        {data.odinId}
      </p>
      {isAuthenticated ? null : (
        <p className="text-[13px] text-[color:var(--card-muted)]">
          {t('Sign in to see what {0} shares with you.', name)}
        </p>
      )}
    </footer>
  );
};

export const PosterPage = ({ design, data }: LayoutProps) => {
  const hasPosts = data.posts.length > 0;
  return (
    <div className="relative flex min-h-[inherit] flex-col">
      <TopBar data={data} />
      <main className="flex flex-1 flex-col">
        <Hero design={design} data={data} grow={!hasPosts} />
        {hasPosts ? <Writing posts={data.posts} /> : null}
      </main>
      <Footer data={data} />
    </div>
  );
};
