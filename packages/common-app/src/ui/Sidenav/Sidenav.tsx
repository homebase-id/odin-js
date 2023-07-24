import { FC, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { HOME_ROOT_PATH, MiniDarkModeToggle, getVersion, t } from '@youfoundation/common-app';
import { useDarkMode } from '@youfoundation/common-app';
import { useProfiles } from '@youfoundation/common-app';
import { BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { useNotifications, OwnerImage } from '@youfoundation/common-app';
import {
  Bars,
  Times,
  Feed,
  Article,
  Quote,
  AddressBook,
  Circles,
  useOutsideTrigger,
  Ellipsis,
  Person,
  Cog,
  Scissors,
  HardDrive,
  Grid,
  Wallet,
  IconProps,
  Heart,
  ArrowDown,
  Bell,
} from '@youfoundation/common-app';

const STORAGE_KEY = 'isOpen';

const navItemClassName = `my-1 py-2 px-2 flex`;
const navItemActiveClassname = `bg-indigo-200 dark:bg-indigo-700`;
const iconSize = 'h-6 w-6';
const iconClassName = `${iconSize} flex-shrink-0`;

const sidebarBg = 'bg-indigo-100 text-black dark:bg-indigo-900 dark:text-white';
const moreBg = 'bg-indigo-200 text-black dark:bg-indigo-800 dark:text-white';

export const Sidenav = ({ logout }: { logout: () => void }) => {
  const isDesktop = document.documentElement.clientWidth >= 1280;
  const storedState = localStorage.getItem(STORAGE_KEY);
  const overruledOpen = storedState ? storedState === '1' : undefined;
  const [isOpen, setIsOpen] = useState(overruledOpen ?? false);
  const [isHoverOpen, setIsHoverOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0');
  }, [isOpen]);

  return (
    <>
      <button
        className={`absolute left-0 top-0 z-10 p-4 xl:hidden ${sidebarBg}`}
        onClick={() => setIsOpen(true)}
      >
        <Bars className={`h-4 w-4`} />
      </button>
      <aside
        className={`body-font fixed bottom-0 left-0 right-0 top-0 z-40 h-screen max-w-3xl flex-shrink-0 transition-transform duration-300 xl:sticky xl:transition-all ${
          isOpen
            ? 'translate-x-0 xl:min-w-[18rem]'
            : 'w-full translate-x-[-100%] xl:w-[4.3rem] xl:min-w-0 xl:translate-x-0'
        }`}
        onClick={() => !isDesktop && isOpen && setIsOpen(false)}
        onMouseEnter={() => setIsHoverOpen(true)}
        onMouseLeave={() => setIsHoverOpen(false)}
      >
        {/* Extra surrounding div to keep contents sticky as you scroll within the aside */}
        <div
          className={`${
            isOpen ? 'overflow-y-auto xl:overflow-visible' : 'hover:sticky hover:w-[18rem]'
          } static top-0 h-full w-full transition-all xl:sticky xl:h-auto xl:whitespace-nowrap ${sidebarBg}`}
        >
          <div className="flex h-screen flex-col overflow-auto px-3 pb-5 pt-3">
            <div>
              <button className={navItemClassName} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <Times className={iconClassName} /> : <Bars className={iconClassName} />}
              </button>
            </div>
            <div className="py-3">
              <IdentityNavItem />
              <NavItem icon={Feed} label={'Feed'} to={'/owner/feed'} end={true} />
              <NotificationBell />
              {/* <NavItem icon={Grid} label={'Dashboard'} to={'/owner'} end={true} /> */}
            </div>

            <div className="py-3">
              <ProfilesNavItem isOpen={isOpen || isHoverOpen} />
            </div>

            <div className="py-3">
              <NavItem icon={Article} label={'Articles'} to="/owner/feed/articles" />
              <NavItem icon={Quote} label={'Channels'} to="/owner/feed/channels" />
            </div>

            <div className="py-3">
              <NavItem icon={AddressBook} label={'Contacts'} to={'/owner/connections'} />
              <NavItem icon={Circles} label={'Circles'} to={'/owner/circles'} />
            </div>

            <MoreItems isOpen={isOpen || isHoverOpen} logout={logout} />

            <div>
              <p className={`${navItemClassName} opacity-40`}>
                <span className={`text-center text-2xl`}>©</span>{' '}
                <span className={`my-auto ml-3 ${!isOpen && 'hidden'}`}>
                  2023 | v.
                  {getVersion()}
                </span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const MoreItems = ({ isOpen: isNavOpen, logout }: { isOpen: boolean; logout: () => void }) => {
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));
  const { toggleDarkMode, isDarkMode } = useDarkMode();

  useEffect(() => {
    if (!isNavOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isNavOpen]);

  return (
    <div className={`relative mt-auto`} ref={wrapperRef}>
      <a
        className={`${navItemClassName} relative cursor-pointer`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Ellipsis className={iconClassName} />
        <span className={`my-auto ml-3 overflow-hidden ${!isNavOpen && 'hidden'}`}>
          {t('More')}
        </span>
      </a>

      <div
        className={`absolute bottom-[100%] left-0 overflow-auto rounded-md border-gray-200 border-opacity-80 shadow-md dark:border-gray-500 dark:shadow-slate-700 ${moreBg} ${
          isOpen ? '' : 'hidden'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <button onClick={() => logout()} className={`w-full ${navItemClassName}`}>
          <Person className={`${iconClassName}`} />
          <span className={`my-auto ml-3`}>Log out</span>
        </button>
        <NavItem icon={Cog} label={'Settings'} to={'/owner/settings'} />
        <NavItem icon={Scissors} label={'Demo Data'} to={'/owner/demo-data'} />
        <hr className="border-b dark:border-slate-500" />
        <NavItem icon={HardDrive} label={'Drives'} to={'/owner/drives'} />
        <NavItem icon={Grid} label={'Apps'} to={'/owner/apps'} />
        <hr className="border-b dark:border-slate-500" />
        <NavItem label={t('Wallet')} to={`/owner/profile/wallet`} icon={Wallet} />
        <hr className="border-b dark:border-slate-500" />
        <button className={navItemClassName} onClick={() => toggleDarkMode()}>
          <MiniDarkModeToggle className={`my-auto ${iconClassName}`} />
          <span className={`mx-3 my-auto`}>{isDarkMode ? t('Light mode') : t('Dark mode')}</span>
        </button>
      </div>
    </div>
  );
};

const NavItem = ({
  icon,
  to,
  label,

  unread,
  end,
}: {
  icon?: FC<IconProps>;
  to: string;
  label: string;

  unread?: boolean;
  end?: boolean;
}) => {
  const { pathname } = window.location;
  const isExternal = pathname.split('/')[1] !== to.split('/')[1];

  if (isExternal) {
    return <ExternalNavItem icon={icon} href={to} label={label} unread={unread} />;
  }

  return (
    <NavLink
      className={({ isActive }) =>
        `${navItemClassName} ${isActive && navItemActiveClassname} relative`
      }
      to={to}
      end={end}
    >
      {icon && icon({ className: iconClassName })}
      {unread ? <span className="absolute h-2 w-2 rounded-full bg-red-500" /> : null}
      <span className={`my-auto ml-3 overflow-hidden`}>{label}</span>
    </NavLink>
  );
};

const ExternalNavItem = ({
  icon,
  href,
  label,

  unread,
}: {
  icon?: FC<IconProps>;
  href: string;
  label: string;

  unread?: boolean;
}) => {
  return (
    <a className={`${navItemClassName} relative`} href={href}>
      {icon && icon({ className: iconClassName })}
      {unread ? <span className="absolute h-2 w-2 rounded-full bg-red-500" /> : null}
      <span className={`my-auto ml-3 overflow-hidden`}>{label}</span>
    </a>
  );
};

const IdentityNavItem = () => {
  return (
    <a className={`relative flex py-2 pl-[0.2rem] pr-1`} href={HOME_ROOT_PATH}>
      <OwnerImage className={`h-9 w-9 flex-shrink-0 rounded-full`} size="custom" />
      <span className={`my-auto ml-3 overflow-hidden text-lg font-medium`}>
        {' '}
        {window.location.hostname}
      </span>
    </a>
  );
};

const ProfilesNavItem = ({ isOpen: isNavOpen }: { isOpen: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: profiles } = useProfiles(!isNavOpen).fetchProfiles;

  useEffect(() => {
    if (!isNavOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isNavOpen]);

  return (
    <>
      <NavLink
        className={({ isActive }) =>
          `${navItemClassName} ${isActive && navItemActiveClassname} relative`
        }
        to={'/owner/profile'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {Heart({ className: iconClassName })}
        <span className={`my-auto ml-3 flex w-full flex-row items-stretch overflow-hidden`}>
          <span>{'Social Presence'} </span>
          <button className={`${iconClassName} ml-auto opacity-80 `}>
            <ArrowDown className={`transition-transform ${isOpen ? '-rotate-90' : ''}`} />
          </button>
        </span>
      </NavLink>

      {isOpen ? (
        <div className="ml-1 pl-1">
          {/* <NavItem label={'Overview'} to={'/owner/profile'} end={true} /> */}
          {profiles
            ?.filter((profile) => profile.profileId !== BuiltInProfiles.WalletId)
            ?.slice(0, 5)
            ?.map((profile) => (
              <NavItem
                label={profile.name}
                to={`/owner/profile/${profile.slug}`}
                key={profile.slug}
              />
            ))}
          <NavItem label={'Homepage'} to={'/owner/profile/homepage'} />
          <NavItem label={'Following & Followers'} to={'/owner/follow'} />
        </div>
      ) : null}
    </>
  );
};

const NotificationBell = () => {
  const { notifications } = useNotifications();

  return (
    <NavItem
      label={t('Notifications')}
      to={'/owner/notifications'}
      icon={Bell}
      unread={!!notifications.length}
    />
  );
};
