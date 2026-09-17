import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_ROOT_PATH, t, useDotYouClientContext } from '@homebase-id/common-app';
import type { LayoutProps } from '../../CardDesign';
import type { CardData } from '../../useCardData';
import LoginDialog from '../../../components/Dialog/LoginDialog/LoginDialog';
import ProfileNav from '../../../components/Auth/ProfileNav/ProfileNav';
import { BoardProfile } from './BoardProfile';
import { BoardPosts } from './BoardPosts';
import { FOCUS } from './styles';
const SECTION_LINK = `block text-[14px] font-semibold text-[color:color-mix(in_srgb,var(--card-ink)_82%,transparent)] hover:text-[color:var(--card-ink)] ${FOCUS}`;

// Drawn for the 1120px page and pinned to the centre, so it keeps its place around the column
// at any width; the page wrapper clips what falls outside.
const BoardPageArt = () => (
  <svg
    aria-hidden
    viewBox="0 0 1120 1276"
    fill="none"
    className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[1276px] w-[1120px] -translate-x-1/2 overflow-visible text-[color:var(--card-ink)]"
  >
    <g stroke="currentColor" strokeOpacity="0.11" strokeWidth="2">
      <circle cx="120" cy="170" r="150" />
      <circle cx="120" cy="170" r="220" />
      <circle cx="120" cy="170" r="290" />
      <circle cx="1010" cy="500" r="140" />
      <circle cx="1010" cy="500" r="210" />
      <circle cx="160" cy="1120" r="120" />
      <circle cx="160" cy="1120" r="190" />
    </g>
    <g fill="currentColor" className="text-[color:var(--card-accent)]">
      <circle cx="930" cy="150" r="90" fillOpacity="0.18" />
      <circle cx="990" cy="1060" r="120" fillOpacity="0.12" />
    </g>
    <circle cx="150" cy="620" r="110" fill="currentColor" fillOpacity="0.1" />
    <g fill="currentColor" fillOpacity="0.12">
      <circle cx="820" cy="260" r="4" />
      <circle cx="850" cy="286" r="4" />
      <circle cx="880" cy="260" r="4" />
      <circle cx="850" cy="234" r="4" />
      <circle cx="790" cy="286" r="4" />
      <circle cx="910" cy="286" r="4" />
    </g>
  </svg>
);

const BoardAccount = () => {
  const client = useDotYouClientContext();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // The owner already has the sidenav
  if (client.isOwner()) return null;

  // ProfileNav's menu is drawn in app colours, not the card's
  if (client.isAuthenticated())
    return (
      <div className="text-foreground">
        <ProfileNav />
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsLoginOpen(true)}
        className={`rounded-full bg-[var(--card-surface)] px-[18px] py-2 text-[13px] font-semibold text-[color:var(--card-surface-ink)] shadow-[0_3px_0_rgba(0,0,0,0.2)] active:translate-y-0.5 active:shadow-[0_1px_0_rgba(0,0,0,0.2)] ${FOCUS}`}
      >
        {t('Sign in')}
      </button>
      <LoginDialog
        title={t('Sign in')}
        isOpen={isLoginOpen}
        onCancel={() => setIsLoginOpen(false)}
        returnPath={window.location.pathname}
      />
    </>
  );
};

const BoardTopBar = ({ data }: { data: CardData }) => {
  const [firstLink] = data.links;
  return (
    <header className="absolute right-8 top-[22px] z-10 flex items-center gap-6">
      <nav aria-label={t('Sections')} className="flex items-center gap-5">
        <Link to={`${HOME_ROOT_PATH}posts`} className={SECTION_LINK}>
          {t('Posts')}
        </Link>
        {firstLink?.text ? (
          <a
            href={firstLink.target}
            target="_blank"
            rel="noopener noreferrer"
            className={`max-w-[16ch] truncate ${SECTION_LINK}`}
          >
            {firstLink.text}
          </a>
        ) : null}
      </nav>
      <BoardAccount />
    </header>
  );
};

export const BoardPage = ({ design, data }: LayoutProps) => (
  <div className="relative min-h-[inherit] pb-20">
    <BoardPageArt />
    <BoardTopBar data={data} />
    <main>
      <div className="px-10 pt-[42px]">
        <div className="mx-auto flex w-full max-w-[460px] flex-col items-center">
          <BoardProfile design={design} data={data} size="page" />
        </div>
      </div>
      <BoardPosts data={data} />
    </main>
  </div>
);
