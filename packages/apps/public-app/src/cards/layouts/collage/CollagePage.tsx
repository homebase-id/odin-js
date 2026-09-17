import { useId, useState } from 'react';
import { Image, t, useDotYouClientContext } from '@homebase-id/common-app';
import type { HomebaseFile } from '@homebase-id/js-lib/core';
import type { PostContent } from '@homebase-id/js-lib/public';
import type { LayoutProps } from '../../CardDesign';
import type { CardData } from '../../useCardData';
import { CardGround } from '../../parts/Ground';
import { CardName } from '../../parts/Type';
import { CardBlock, useChatHref } from '../../parts/Blocks';
import { CardSocials } from '../../parts/Socials';
import { POSTS_HREF, postDate, postImage, usePostHref } from '../../parts/posts';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';
import ProfileNav from '../../../components/Auth/ProfileNav/ProfileNav';
import { collageFrames, Cutout, FOCUS, Print, signature, Tape } from './frames';

// Collage | name | contact column; a column drops out when it has nothing to show.
// Tracks are 282 / 362 / 300 at 1120 and scale down to 768.
const HERO_GRID = {
  both: 'grid-cols-[clamp(180px,28%,340px)_minmax(0,1fr)_clamp(230px,29.8%,300px)]',
  collage: 'grid-cols-[clamp(180px,28%,340px)_minmax(0,1fr)]',
  aside: 'grid-cols-[minmax(0,1fr)_clamp(230px,29.8%,300px)]',
  none: 'grid-cols-1',
};

// Same run of tilts as the reference board, repeated by index
const NOTE_TILTS = [-2, 1.5, -1, 2, -2.5, 1];

const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' });
const dayMonthYear = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const formatNoteDate = (date: Date) =>
  (date.getFullYear() === new Date().getFullYear() ? dayMonth : dayMonthYear).format(date);

const AuthControl = () => {
  const client = useDotYouClientContext();
  const [isLogin, setIsLogin] = useState(false);

  if (client.isOwner()) return null; // the owner has the Sidenav
  if (client.isAuthenticated())
    return (
      // ProfileNav's dropdown relies on the app's text colour, not the card ink
      <div className="text-foreground">
        <ProfileNav />
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsLogin(true)}
        className={`rounded-full bg-[var(--card-surface)] px-[18px] py-2 text-[13px] font-semibold text-[color:var(--card-surface-ink)] shadow-[0_2px_6px_rgba(0,0,0,0.18)] ${FOCUS}`}
      >
        {t('Sign in')}
      </button>
      <LoginDialog
        title={t('Sign in')}
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        returnPath={window.location.pathname}
      />
    </>
  );
};

const TopBar = ({ data }: { data: CardData }) => {
  const [firstLink] = data.links;
  return (
    <header className="absolute right-[30px] top-5 z-20 flex items-center gap-5">
      {data.posts.length || firstLink ? (
        <nav aria-label={t('Sections')} className="flex items-center gap-5 text-[13px] font-semibold">
          {data.posts.length ? (
            <a href={POSTS_HREF} className={`rounded-sm hover:underline ${FOCUS}`}>
              {t('Notes')}
            </a>
          ) : null}
          {firstLink ? (
            <a
              href={firstLink.target}
              target="_blank"
              rel="noopener noreferrer"
              className={`block max-w-[16ch] truncate rounded-sm hover:underline ${FOCUS}`}
            >
              {firstLink.text}
            </a>
          ) : null}
        </nav>
      ) : null}
      <AuthControl />
    </header>
  );
};

const Note = ({ post, href, tilt }: { post: HomebaseFile<PostContent>; href: string; tilt: number }) => {
  const image = postImage(post);
  const date = postDate(post);
  const { caption } = post.fileMetadata.appData.content;
  return (
    <li className="relative" style={{ transform: `rotate(${tilt}deg)` }}>
      <Tape className="-top-[9px] left-1/2 h-5 w-[70px] -translate-x-1/2" />
      <a
        href={href}
        className={`block h-full bg-[var(--card-surface)] p-3 pb-6 text-[color:var(--card-surface-ink)] shadow-[0_3px_9px_rgba(0,0,0,0.18)] ${FOCUS}`}
      >
        {image ? (
          <Image {...image} fileId={image.fileId} fileKey={image.fileKey} alt="" className="aspect-[260/118] w-full" fit="cover" />
        ) : (
          <div
            aria-hidden
            className="aspect-[260/118] w-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--card-muted) 18%, var(--card-surface))' }}
          />
        )}
        {caption ? (
          <p className="line-clamp-3 pt-2.5 font-[family-name:var(--card-display)] text-[26px] font-bold leading-[26px]">
            {caption}
          </p>
        ) : null}
        <time dateTime={date.toISOString()} className="block pt-1.5 text-[13px] font-medium text-[color:var(--card-muted)]">
          {formatNoteDate(date)}
        </time>
      </a>
    </li>
  );
};

const Notes = ({ posts }: { posts: HomebaseFile<PostContent>[] }) => {
  const headingId = useId();
  const postHref = usePostHref();
  return (
    <section aria-labelledby={headingId} className="px-[5.7%] pt-[18px]">
      <div className="flex items-end gap-5">
        <h2 id={headingId} className="font-[family-name:var(--card-display)] text-[64px] font-bold leading-[50px]">
          {t('Notes')}
        </h2>
        <div aria-hidden className="mb-3 h-0.5 flex-1 bg-[var(--card-ink)] opacity-[0.18]" />
        <a
          href={POSTS_HREF}
          className={`rounded-sm pb-1 font-[family-name:var(--card-label)] text-2xl text-[color:var(--card-muted)] hover:text-[color:var(--card-ink)] ${FOCUS}`}
        >
          {t('more in the drawer')} <span aria-hidden>&rarr;</span>
        </a>
      </div>
      <ul className="grid grid-cols-3 gap-x-[46px] gap-y-10 px-3 pt-[34px]">
        {posts.map((post, index) => (
          <Note
            key={post.fileId ?? post.fileMetadata.appData.content.id}
            post={post}
            href={postHref(post)}
            tilt={NOTE_TILTS[index % NOTE_TILTS.length]}
          />
        ))}
      </ul>
    </section>
  );
};

export const CollagePage = ({ design, data }: LayoutProps) => {
  const [print, cutout] = collageFrames({ design, data });
  const chatHref = useChatHref();
  const chatBlock = design.blocks.find((b) => b.kind === 'chat');
  const socials = data.socials.filter((s) => s.link);
  const hasCollage = !!(print || cutout);
  const hasAside = !!(chatBlock && chatHref) || socials.length > 0 || !!data.header;
  const grid = HERO_GRID[hasCollage ? (hasAside ? 'both' : 'collage') : hasAside ? 'aside' : 'none'];
  // The wordmark box shows the first social; the glyphs under the name carry the rest
  const restData = { ...data, socials: socials.slice(1) };

  return (
    <div className="relative min-h-[inherit]">
      <CardGround design={design} data={data} />
      <div className="relative mx-auto max-w-[1280px] pb-24">
        <TopBar data={data} />

        <main>
          <div className={`grid min-h-[560px] items-start gap-x-8 px-[5%] ${grid}`}>
            {hasCollage ? (
              <div className="flex flex-col items-start pb-6">
                {print ? (
                  <Print
                    {...print}
                    className="mt-11 w-[80%] px-[9px] pb-9 pt-[9px]"
                    tapeClassName="-top-3.5 left-1/2 h-6 w-[35%] -translate-x-1/2 -rotate-3"
                  />
                ) : null}
                {cutout ? (
                  <Cutout {...cutout} ring={7} className={`w-[61%] ${print ? '-mt-2 ml-[39%]' : 'ml-[10%] mt-11'}`} />
                ) : null}
              </div>
            ) : null}

            <div className="self-center py-10 [container-type:inline-size]">
              <CardName
                design={design}
                data={signature(data)}
                className="origin-left -rotate-2 text-[length:clamp(56px,34cqw,124px)] font-bold leading-[0.84] [overflow-wrap:anywhere]"
              />
              {data.headline ? (
                <p className="pl-2.5 pt-3 font-[family-name:var(--card-label)] text-[length:clamp(24px,11cqw,40px)] font-medium leading-none text-[color:var(--card-muted)]">
                  {data.headline}
                </p>
              ) : null}
              <CardSocials
                variant="glyphs"
                data={restData}
                className="!gap-4 pl-3 pt-[22px] text-[color:var(--card-muted)] [&_a:hover]:text-[color:var(--card-ink)] [&_a]:opacity-100 [&_svg]:h-[22px] [&_svg]:w-[22px]"
              />
            </div>

            {hasAside ? (
              <div className="flex flex-col gap-3.5 pb-6 pt-[124px]">
                {chatBlock && chatHref ? (
                  <div className="rotate-[1.5deg] [&>a]:flex [&>a]:h-16 [&>a]:gap-3.5 [&>a]:px-[22px] [&>a]:text-lg [&>a]:shadow-[0_3px_9px_rgba(0,0,0,0.28)] [&_svg]:h-[26px] [&_svg]:w-[26px]">
                    <CardBlock block={chatBlock} data={data} chatHref={chatHref} />
                  </div>
                ) : null}
                <CardSocials variant="wordmark" data={data} className="rotate-[-1deg] text-[19px] [&_svg]:h-10 [&_svg]:w-10" />
                {/* The reference captions its map with an address; the headline already sits under the name */}
                {data.header ? (
                  <div className="h-[170px] rotate-1 overflow-hidden rounded-2xl border-[5px] border-[color:var(--card-surface)] shadow-[0_3px_9px_rgba(0,0,0,0.18)]">
                    <Image {...data.header} fileId={data.header.fileId} fileKey={data.header.fileKey} alt="" className="h-full w-full" fit="cover" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {data.posts.length ? <Notes posts={data.posts.slice(0, 6)} /> : null}
        </main>
      </div>
    </div>
  );
};
