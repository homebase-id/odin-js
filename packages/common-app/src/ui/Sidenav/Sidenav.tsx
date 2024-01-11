import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import {
  CHAT_APP_ID,
  ChatBubble,
  Cloud,
  HOME_ROOT_PATH,
  House,
  MiniDarkModeToggle,
  Persons,
  Pin,
  ellipsisAtMaxChar,
  getVersion,
  t,
  useUnreadPushNotificationsCount,
} from '@youfoundation/common-app';
import { useDarkMode } from '@youfoundation/common-app';
import { useProfiles } from '@youfoundation/common-app';
import { BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { OwnerImage } from '@youfoundation/common-app';
import {
  Bars,
  Times,
  Feed,
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
import { hasDebugFlag } from '@youfoundation/js-lib/helpers';

const STORAGE_KEY = 'isOpen';

const navItemClassName = `my-1 py-2 px-2 flex`;
const navItemActiveClassname = `bg-indigo-200 dark:bg-indigo-700`;
const iconSize = 'h-6 w-6';
const iconClassName = `${iconSize} flex-shrink-0`;

const sidebarBg = 'bg-indigo-100 text-black dark:bg-indigo-900 dark:text-white';
const moreBg = 'bg-[#d4ddff] dark:bg-[#3730a3] text-black dark:text-white';

const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const Sidenav = ({
  logout,
  disablePinning,
  hideMobileDrawer,
}: {
  logout?: () => void;
  disablePinning?: boolean;
  hideMobileDrawer?: boolean;
}) => {
  const isMd = document.documentElement.clientWidth >= 768;
  const isXl = document.documentElement.clientWidth >= 1280;
  const isTightHeight = isMd && document.documentElement.clientHeight < 740;

  const storedState = localStorage.getItem(STORAGE_KEY);
  const canPin = !disablePinning && isXl;

  const [isPinned, setIsPinned] = useState(storedState ? storedState === '1' : false);
  const [isOpen, setIsOpen] = useState(false);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);

  const canTouch = isTouchDevice();

  useEffect(() => {
    // Only persist open/closed state on desktop
    if (canPin) localStorage.setItem(STORAGE_KEY, isPinned ? '1' : '0');
  }, [isPinned]);

  return (
    <>
      {hideMobileDrawer ? null : <MobileDrawer setIsOpen={setIsOpen} />}

      <aside
        className={`body-font fixed bottom-0 left-0 right-0 top-0 z-30 max-w-3xl flex-shrink-0 transition-all duration-300 md:sticky md:bottom-auto md:min-h-[100dvh] ${
          (canPin && isPinned) || isOpen
            ? 'translate-y-0 md:min-w-[20rem]'
            : 'w-full translate-y-[+100%] md:translate-y-0 md:w-[4.3rem] md:min-w-0'
        }`}
        onClick={() => {
          if (!isMd && isOpen) setIsOpen(false);
          setIsPeeking(false);
        }}
        onMouseEnter={() => setIsHoverOpen(true)}
        onMouseLeave={() => setIsHoverOpen(false)}
      >
        <div
          className={`${
            isOpen
              ? 'overflow-y-auto'
              : `${canTouch ? '' : 'md:hover:w-[20rem]'} ${isPeeking ? 'w-[20rem]' : 'w-full'}`
          } sticky top-0 h-full transition-all md:h-auto ${sidebarBg}`}
        >
          <div className="flex flex-col px-3 pb-5 pt-3 md:min-h-[100dvh] md:whitespace-nowrap">
            <div className="flex flex-shrink-0 flex-row items-center justify-between overflow-hidden">
              <IdentityNavItem />
              {canPin ? (
                <button
                  className={`${navItemClassName} ${
                    isPinned ? 'md:bg-indigo-200 md:dark:bg-indigo-700' : ''
                  }`}
                  onClick={() => setIsPinned(!isPinned)}
                >
                  <Pin className={'h-4 w-4 flex-shrink-0 hidden md:block'} />
                  <Times className={'h-4 w-4 flex-shrink-0 block md:hidden'} />
                </button>
              ) : isOpen || isPeeking ? (
                <button
                  className={`${navItemClassName} ${
                    isOpen ? 'md:bg-indigo-200 md:dark:bg-indigo-700 xl:hidden' : ''
                  }`}
                  onClick={() => {
                    setIsPeeking(false);
                    setIsOpen(false);
                  }}
                >
                  <Times className={'h-4 w-4 flex-shrink-0'} />
                </button>
              ) : null}
            </div>

            <div className="pb-3">
              <NavItem icon={House} label={'Dashboard'} to={'/owner'} end={true} />
              <NotificationBell />
            </div>

            <div className="py-3">
              <ProfilesNavItem isOpen={isPinned || isOpen || isHoverOpen || isPeeking} />
            </div>

            <div className="py-3">
              <NavItem icon={Feed} label={'Feed'} to={'/apps/feed'} end={true} />
              <ChatNavItem />
            </div>

            <div className={`py-3`}>
              <NavItem icon={AddressBook} label={'Connections'} to={'/owner/connections'} />
              {isTightHeight ? null : (
                <NavItem icon={Persons} label={'Following & Followers'} to={'/owner/follow'} />
              )}
              {isTightHeight ? null : (
                <NavItem
                  icon={Grid}
                  label={'Third party apps & services'}
                  to={'/owner/third-parties'}
                />
              )}
              {isTightHeight ? null : (
                <NavItem icon={Circles} label={'Circles'} to={'/owner/circles'} />
              )}
            </div>

            <MoreItems isOpen={isPinned || isOpen || isHoverOpen || isPeeking} logout={logout}>
              {isTightHeight ? (
                <>
                  <NavItem icon={Persons} label={'Following & Followers'} to={'/owner/follow'} />
                  <NavItem
                    icon={Grid}
                    label={'Third party apps & services'}
                    to={'/owner/third-parties'}
                  />
                  <NavItem icon={Circles} label={'Circles'} to={'/owner/circles'} />
                </>
              ) : null}
            </MoreItems>

            {!isTightHeight ? (
              <div>
                <p className={`${navItemClassName} opacity-40 leading-none`}>
                  <span className={`text-center text-2xl px-[0.18rem]`}>©</span>
                  <span
                    className={`my-auto ml-3 max-w-[15rem] overflow-hidden whitespace-pre-wrap ${
                      !(canPin && isPinned) && !isOpen && 'hidden'
                    }`}
                  >
                    2023 | v.
                    {getVersion()}
                  </span>
                </p>
              </div>
            ) : null}

            {canTouch ? (
              <button
                className={`${navItemClassName} hidden md:block xl:hidden`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPeeking(!isPeeking);
                }}
              >
                <Bars className={iconClassName} />
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
};

const isDebug = hasDebugFlag();

const MoreItems = ({
  isOpen: isNavOpen,
  logout,
  children,
}: {
  isOpen: boolean;
  logout?: () => void;
  children?: ReactNode;
}) => {
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
        {logout ? (
          <button onClick={() => logout()} className={`w-full ${navItemClassName}`}>
            <Person className={`${iconClassName}`} />
            <span className={`my-auto ml-3`}>Log out</span>
          </button>
        ) : null}
        <NavItem icon={Cog} label={'Settings'} to={'/owner/settings'} />
        {isDebug ? <NavItem icon={Scissors} label={'Demo Data'} to={'/owner/demo-data'} /> : null}
        <hr className="border-b dark:border-slate-500" />
        <NavItem icon={HardDrive} label={'Drives'} to={'/owner/drives'} />
        <hr className="border-b dark:border-slate-500" />
        <WalletLink />
        <hr className="border-b dark:border-slate-500" />
        <button className={navItemClassName} onClick={() => toggleDarkMode()}>
          <MiniDarkModeToggle className={`my-auto ${iconClassName}`} />
          <span className={`mx-3 my-auto`}>{isDarkMode ? t('Light mode') : t('Dark mode')}</span>
        </button>

        {children ? (
          <>
            <hr className="border-b dark:border-slate-500" />
            {children}
          </>
        ) : null}
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
  label?: string;

  unread?: boolean;
  end?: boolean;
}) => {
  const { pathname } = window.location;
  const isExternal = pathname.split('/')[1] !== to.split('/')[1] || to.split('/')[1] === 'apps';

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
      {label ? <span className={`my-auto ml-3 overflow-hidden`}>{label}</span> : null}
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
  label?: string;

  unread?: boolean;
}) => {
  return (
    <a className={`${navItemClassName} relative`} href={href}>
      {icon && icon({ className: iconClassName })}
      {unread ? <span className="absolute h-2 w-2 rounded-full bg-red-500" /> : null}
      {label ? <span className={`my-auto ml-3 overflow-hidden`}>{label}</span> : null}
    </a>
  );
};

const IdentityNavItem = () => {
  return (
    <a className={`relative flex py-2 pl-[0.2rem] pr-1`} href={HOME_ROOT_PATH}>
      <OwnerImage className={`h-9 w-9 flex-shrink-0 rounded-full`} size="custom" />
      <span className={`my-auto ml-3 overflow-hidden text-lg font-medium`}>
        {' '}
        {ellipsisAtMaxChar(window.location.hostname, 20)}
      </span>
    </a>
  );
};

const ProfilesNavItem = ({ isOpen: isNavOpen }: { isOpen: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: profiles, isFetching } = useProfiles().fetchProfiles;

  useEffect(() => {
    if (!isNavOpen && isOpen) setIsOpen(false);
  }, [isNavOpen]);

  // If no extra profiles we just show the defaults at the first level
  if (isFetching || !profiles || profiles.length <= 2) {
    const standardProfile = profiles?.find(
      (profile) => profile.profileId === BuiltInProfiles.StandardProfileId
    );

    return (
      <>
        <NavItem
          label={'Profile Settings'}
          icon={Person}
          to={`/owner/profile/${standardProfile?.slug || 'standard-info'}`}
        />
        <NavItem label={'Home Settings'} icon={Cloud} to={'/owner/profile/homepage'} />
      </>
    );
  }

  // If there are extra profiles we show everything on the second level
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
            ?.filter((profile) => ![BuiltInProfiles.WalletId].includes(profile.profileId))
            ?.slice(0, 5)
            ?.map((profile) => (
              <NavItem
                label={profile.name}
                to={`/owner/profile/${profile.slug}`}
                key={profile.slug}
              />
            ))}
          <NavItem label={'Home Settings'} to={'/owner/profile/homepage'} />
        </div>
      ) : null}
    </>
  );
};

const WalletLink = () => {
  const { data: profiles } = useProfiles().fetchProfiles;
  const walletProfile = profiles?.find((profile) => profile.profileId === BuiltInProfiles.WalletId);

  return (
    <NavItem
      label={t('Wallet')}
      to={`/owner/profile/${walletProfile?.slug || 'wallet'}`}
      icon={Wallet}
    />
  );
};

const NotificationBell = () => {
  const count = useUnreadPushNotificationsCount();
  return (
    <NavItem label={t('Notifications')} to={'/owner/notifications'} icon={Bell} unread={!!count} />
  );
};

const ChatNavItem = () => {
  const count = useUnreadPushNotificationsCount({ appId: CHAT_APP_ID });
  return <NavItem icon={ChatBubble} label={'Chat'} to="/apps/chat" unread={!!count} />;
};

const MobileDrawer = ({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) => {
  return (
    <div className={`fixed left-0 right-0 bottom-0 md:hidden z-20 px-4 py-1  ${sidebarBg}`}>
      <div className="flex flex-row justify-between">
        <NavItem icon={House} to={'/owner'} end={true} />
        <NavItem icon={Feed} to={'/apps/feed'} end={true} />
        <NavItem icon={ChatBubble} to="/apps/chat" />

        <button className={navItemClassName} onClick={() => setIsOpen(true)}>
          <Bars className={iconClassName} />
        </button>
      </div>
    </div>
  );
};
