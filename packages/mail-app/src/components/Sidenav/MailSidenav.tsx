import { FC } from 'react';
import { NavLink, useMatch } from 'react-router-dom';
import {
  Archive,
  Envelope,
  IconProps,
  MAIL_APP_ID,
  PaperPlane,
  Pencil,
  Sidenav,
  Trash,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { useAuth } from '../../hooks/auth/useAuth';
import { useLiveMailProcessor } from '../../hooks/mail/useLiveMailProcessor';

const ROOT_PATH = '/apps/mail';

export const MailSidenav = () => {
  const { logout } = useAuth();

  // TODO: Check if we should move it up the render tree to have common coverage of detail views
  const isOnline = useLiveMailProcessor();
  useRemoveNotifications({ appId: MAIL_APP_ID });

  const rootChatMatch = useMatch({ path: ROOT_PATH });
  const isRoot = !!rootChatMatch;

  const isActive = isRoot;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} logout={logout} />
      <div
        className={`bottom-0 left-0 top-0 z-[11] ${isActive ? 'fixed right-0 flex w-full md:sticky md:right-auto md:w-[15rem]' : 'hidden md:sticky md:flex md:w-[15rem]'} flex-shrink-0 flex-col border-r border-gray-200/80 bg-background dark:border-gray-700/80`}
      >
        <div
          className={`sticky top-0 flex h-full max-h-[100dvh] flex-col gap-5 py-2 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-5 md:pb-5`}
        >
          <div className="flex flex-row items-center gap-2 px-5">
            <div className="flex flex-row items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full transition-colors ${
                  isOnline ? 'bg-green-400' : 'bg-red-400'
                }`}
                title={isOnline ? t('Connected') : t('Offline')}
              />

              <p className="text-2xl dark:text-white">Homebase Mail</p>
            </div>
          </div>
          <div className="flex flex-col px-5">
            <NavItem to={`${ROOT_PATH}/inbox`} icon={Envelope} label={t('Inbox')} />
            <NavItem to={`${ROOT_PATH}/sent`} icon={PaperPlane} label={t('Sent')} />
            <NavItem to={`${ROOT_PATH}/drafts`} icon={Pencil} label={t('Drafts')} />
          </div>
          <div className="mt-auto flex flex-col px-5">
            <NavItem to={`${ROOT_PATH}/trash`} icon={Trash} label={t('Trash')} />
            <NavItem to={`${ROOT_PATH}/archive`} icon={Archive} label={t('Archive')} />
          </div>
        </div>
      </div>
    </>
  );
};

const navItemClassName = `my-1 py-2 px-2 flex`;
const navItemActiveClassname = `bg-indigo-200 dark:bg-indigo-700`;

const iconSize = 'h-6 w-6';
const iconClassName = `${iconSize} opacity-80 flex-shrink-0`;
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
  return (
    <NavLink
      className={({ isActive }) =>
        `${isActive && navItemActiveClassname} relative ${navItemClassName}`
      }
      to={{ pathname: to, search: window.location.search }}
      end={end}
    >
      {icon && icon({ className: iconClassName })}
      {unread ? <span className="absolute h-2 w-2 rounded-full bg-red-500" /> : null}
      {label ? <span className={`my-auto ml-3 overflow-hidden`}>{label}</span> : null}
    </NavLink>
  );
};
