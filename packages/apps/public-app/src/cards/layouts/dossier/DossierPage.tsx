import { useId, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { t, useDotYouClientContext } from '@homebase-id/common-app';
import { Globe, ImageIcon, type IconProps } from '@homebase-id/common-app/icons';
import type { HomebaseFile } from '@homebase-id/js-lib/core';
import type { Article, PostContent } from '@homebase-id/js-lib/public';
import ProfileNav from '../../../components/Auth/ProfileNav/ProfileNav';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';
import type { LayoutProps } from '../../CardDesign';
import type { CardData } from '../../useCardData';
import { displayUrl, isUsableLink } from '../../parts/Blocks';
import { CardPortrait, portraitImage } from '../../parts/Portrait';
import { POSTS_HREF, postDate, postImage, usePostHref } from '../../parts/posts';
import { CardSocials } from '../../parts/Socials';
import { CardName } from '../../parts/Type';
import {
  DossierContact,
  dossierFocus,
  hairline,
  LocationLine,
  ownerName,
  SectionLabel,
} from './DossierParts';

// Reference: WebDossier.dc.html, drawn at 1120px; fluid between 768 and 1440

type Post = HomebaseFile<PostContent>;

const INDEX_ROWS = 7;

const gutter = 'mx-auto w-full max-w-[1120px] px-10 lg:px-16';
const ink = 'text-[color:var(--card-ink)]';
const muted = 'text-[color:var(--card-muted)]';
const tracked = 'uppercase tracking-[0.18em]';

const initials = ({ firstName, surName, odinId }: CardData) => {
  const letters = [firstName, surName]
    .map((part) => part?.trim().charAt(0))
    .filter((letter): letter is string => !!letter);
  return (letters.length ? letters : [odinId.charAt(0)])
    .map((letter) => `${letter.toUpperCase()}.`)
    .join('');
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const DossierPage = ({ design, data }: LayoutProps) => (
  <div className="flex min-h-[inherit] flex-col">
    <TopBar data={data} />
    <main className="pb-24">
      <div
        className={`${gutter} grid grid-cols-[minmax(0,43fr)_minmax(0,49fr)] gap-x-10 pt-[52px] lg:gap-x-[72px]`}
      >
        <Identity design={design} data={data} />
        <div className="flex flex-col gap-[34px] pt-1">
          <DossierContact design={design} data={data} size="page" />
          <Elsewhere design={design} data={data} />
        </div>
      </div>
      <PostIndex data={data} />
    </main>
  </div>
);

const TopBar = ({ data }: { data: CardData }) => {
  const client = useDotYouClientContext();
  const [firstLink] = data.links.filter((link) => link.target);
  const navLink = `block max-w-[14rem] truncate text-[12px] ${tracked} ${muted} hover:text-[color:var(--card-ink)] ${dossierFocus}`;

  return (
    <header className={`border-b ${hairline}`}>
      <div className={`${gutter} flex h-14 items-center justify-between gap-8`}>
        <span aria-hidden className={`whitespace-nowrap text-[12px] ${tracked} ${muted}`}>
          {initials(data)} / {t('File')} 001
        </span>
        <div className="flex min-w-0 items-center gap-8">
          <nav aria-label={t('Sections')} className="min-w-0">
            <ul className="flex items-center gap-8">
              {data.posts.length ? (
                <li>
                  <Link to={POSTS_HREF} className={navLink}>
                    {t('Index')}
                  </Link>
                </li>
              ) : null}
              {firstLink ? (
                <li className="min-w-0">
                  <a
                    href={firstLink.target}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={navLink}
                  >
                    {firstLink.text}
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
          {client.isOwner() ? null : client.isAuthenticated() ? (
            // ProfileNav's dropdown is styled for the app chrome, not the card palette
            <div className="text-foreground">
              <ProfileNav />
            </div>
          ) : (
            <SignIn />
          )}
        </div>
      </div>
    </header>
  );
};

const SignIn = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className={`flex-shrink-0 whitespace-nowrap bg-[var(--card-accent)] px-3 py-1.5 text-[12px] ${tracked} text-[color:var(--card-ground)] ${dossierFocus}`}
      >
        {t('Sign in')}
      </button>
      <LoginDialog
        title={t('Sign in')}
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        returnPath={window.location.pathname}
      />
    </>
  );
};

const Identity = ({ design, data }: LayoutProps) => {
  const [portrait] = design.portraits;
  return (
    <div className="min-w-0">
      {portrait ? (
        <CardPortrait
          portrait={portrait}
          image={portraitImage(portrait, data)}
          alt={ownerName(data)}
          className="mb-7 h-[190px] w-[190px]"
        />
      ) : null}
      <CardName
        design={design}
        data={data}
        className={`break-words text-[length:clamp(44px,5.7vw,64px)] leading-[0.94] tracking-[-0.04em] ${ink}`}
      />
      <LocationLine data={data} className="pt-4 !text-[13px] !tracking-[0.16em]" />
      {data.bio ? (
        <p className={`max-w-[380px] text-pretty pt-[22px] text-[14px] leading-[23px] ${muted}`}>
          {data.bio}
        </p>
      ) : null}
    </div>
  );
};

type ElsewhereItem = { id: string; href: string; label: string; url: string; icon: FC<IconProps> };

const Elsewhere = ({ design, data }: LayoutProps) => {
  const id = useId();
  // Same blocks, same order as the card's ELSEWHERE rows
  const items = design.blocks.flatMap((block): ElsewhereItem[] => {
    if (block.kind === 'moments')
      return data.posts.some((post) => !!postImage(post))
        ? [
            {
              id: 'moments',
              href: POSTS_HREF,
              label: t('Moments'),
              url: `${data.odinId}${POSTS_HREF}`,
              icon: ImageIcon,
            },
          ]
        : [];
    if (block.kind === 'links')
      return data.links.filter(isUsableLink).map((link) => ({
        id: link.id,
        href: link.target,
        label: link.text,
        url: displayUrl(link.target),
        icon: Globe,
      }));
    return [];
  });
  const hasSocials = data.socials.some((social) => !!social.link);
  if (!items.length && !hasSocials) return null;

  return (
    <section aria-labelledby={id}>
      <SectionLabel id={id} className="pb-3">
        {t('Elsewhere')}
      </SectionLabel>
      {items.length ? (
        // One grid for all rows, so the URLs line up behind the longest label (110px at least)
        <ul
          className={`grid grid-cols-[18px_fit-content(45%)_minmax(0,1fr)] gap-x-3.5 border-b ${hairline}`}
        >
          {items.map(({ id: key, ...item }) => (
            <li key={key} className="col-span-3 grid grid-cols-subgrid">
              <ElsewhereRow {...item} />
            </li>
          ))}
        </ul>
      ) : null}
      <CardSocials
        variant={design.socials}
        data={data}
        className="pt-[18px] !text-[13px] tracking-[0.04em]"
      />
    </section>
  );
};

const ElsewhereRow = ({ href, label, url, icon: Icon }: Omit<ElsewhereItem, 'id'>) => {
  const className = `group col-span-3 grid grid-cols-subgrid items-center border-t ${hairline} py-3.5 ${dossierFocus}`;
  const content = (
    <>
      <span
        aria-hidden
        className="flex h-[18px] w-[18px] items-center justify-center text-[color:var(--card-accent)]"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span
        className={`min-w-[110px] truncate text-[15px] ${ink} group-hover:text-[color:var(--card-accent)]`}
      >
        {label}
      </span>
      <span className={`truncate text-[13px] ${muted}`}>{url}</span>
    </>
  );

  return href.startsWith('/') ? (
    <Link to={href} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  );
};

const cell = 'py-[15px] align-baseline';
const headCell = `py-2.5 align-baseline text-[11px] font-normal ${tracked} ${muted}`;

const PostIndex = ({ data }: { data: CardData }) => {
  const id = useId();
  const postHref = usePostHref();
  const total = data.posts.length;
  if (!total) return null;
  const shown = data.posts.slice(0, INDEX_ROWS);

  return (
    <section aria-labelledby={id} className={`${gutter} pt-[62px]`}>
      <div className="flex items-baseline justify-between gap-6 pb-3.5">
        <h2
          id={id}
          className={`font-[family-name:var(--card-display)] text-[30px] uppercase tracking-[-0.03em] ${ink}`}
        >
          {t('Index')}
        </h2>
        <p className={`text-[11px] ${tracked} ${muted}`}>{t('Showing {0}', shown.length)}</p>
      </div>
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[84px]" />
          <col className="w-[170px]" />
          <col />
          <col className="w-[90px]" />
        </colgroup>
        <thead>
          <tr className={`border-t ${hairline}`}>
            <th scope="col" className={`${headCell} pr-5`}>
              <span aria-hidden>N&#176;</span>
              <span className="sr-only">{t('Number')}</span>
            </th>
            <th scope="col" className={`${headCell} pr-5`}>
              {t('Date')}
            </th>
            <th scope="col" className={`${headCell} pr-5`}>
              {t('Title')}
            </th>
            <th scope="col" className={`${headCell} text-right`}>
              {t('Read')}
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((post, index) => (
            <PostRow key={post.fileId} post={post} number={index + 1} href={postHref(post)} />
          ))}
        </tbody>
      </table>
    </section>
  );
};

const PostRow = ({ post, number, href }: { post: Post; number: number; href: string }) => {
  const content = post.fileMetadata.appData.content;
  const date = isoDate(postDate(post));
  // Only articles carry a reading time; other posts leave the READ cell empty rather than
  // printing their internal type ("tweet", "media")
  const minutes =
    content.type === 'Article' ? (content as Article).readingTimeStats?.minutes : undefined;

  return (
    <tr className={`border-t ${hairline} last:border-b`}>
      <td className={`${cell} pr-5 text-[12px] ${muted}`}>{pad(number, 3)}</td>
      <td className={`${cell} pr-5 text-[12px] tracking-[0.06em] ${muted}`}>
        <time dateTime={date}>{date}</time>
      </td>
      <td className={`${cell} pr-5 text-[17px] leading-[23px]`}>
        <Link
          to={href}
          className={`line-clamp-2 ${ink} hover:text-[color:var(--card-accent)] ${dossierFocus}`}
        >
          {content.caption?.trim() || t('Untitled')}
        </Link>
      </td>
      <td className={`${cell} text-right text-[12px] ${muted}`}>
        {minutes ? (
          <span className="uppercase">
            {Math.ceil(minutes)} {t('min')}
          </span>
        ) : null}
      </td>
    </tr>
  );
};
