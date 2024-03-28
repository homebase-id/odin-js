import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sidenav, Toaster, useDarkMode } from '@youfoundation/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';

interface LayoutProps {
  children?: ReactNode;
  noShadedBg?: boolean;
  noPadding?: boolean;
}

const SharedStyleTag = () => (
  <style type="text/css">
    {`:root {
    --color-page-background: 246 248 250;
    --color-background: 255 255 255;
    --color-foreground: 22 22 22;
  }`}
    {`html.dark {
    --color-page-background: 17 24 39;
    --color-background: 0 0 0;
    --color-foreground: 250 250 250;
  }`}
    {`html.dark { background-color: rgba(var(--color-page-background)); }`}
  </style>
);

const SHADED_BG = 'bg-page-background text-foreground';
const NOT_SHADED_BG = 'bg-white dark:bg-black';

const Layout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();

  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');
  const { logout } = useAuth();
  const isReactNative = window.localStorage.getItem('client_type') === 'react-native';

  if (uiSetting === 'none') {
    return <NoLayout>{children}</NoLayout>;
  }

  if (uiSetting === 'minimal' || uiSetting === 'focus') {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return (
    <>
      <SharedStyleTag />
      <div
        className={`relative flex flex-row ${noShadedBg ? NOT_SHADED_BG : SHADED_BG} pb-14 md:pb-0`}
      >
        {!isReactNative ? <Sidenav logout={logout} disablePinning={true} /> : null}
        <div
          className={`relative flex min-h-screen w-full flex-col ${
            noShadedBg ? NOT_SHADED_BG : SHADED_BG
          }`}
        >
          <div className="min-h-full px-2 py-4 sm:px-10 sm:py-8">{children}</div>
        </div>
        <Toaster errorOnly={true} />
      </div>
    </>
  );
};

export const MinimalLayout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useDarkMode();
  return (
    <>
      <SharedStyleTag />
      <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        <div className={`${noPadding ? '' : 'px-5 py-4 sm:px-10 sm:py-8'}`}>{children}</div>
      </div>
      <Toaster errorOnly={true} />
    </>
  );
};

export const NoLayout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();
  return (
    <>
      <SharedStyleTag />
      <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        {children}
      </div>
      <Toaster errorOnly={true} />
    </>
  );
};

export default Layout;
