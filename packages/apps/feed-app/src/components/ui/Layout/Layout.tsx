import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sidenav, Toaster, useDarkMode } from '@homebase-id/common-app';
import { useWebsocketDrives } from '../../../hooks/auth/useWebsocketDrives';

interface LayoutProps {
  children?: ReactNode;
  noShadedBg?: boolean;
  noPadding?: boolean;
}

const SHADED_BG = 'bg-page-background text-foreground';
const NOT_SHADED_BG = 'bg-surface-container-lowest';

export const Layout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();

  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');
  const websocketDrives = useWebsocketDrives();
  const isReactNative = window.localStorage.getItem('client_type')?.startsWith('react-native');

  if (uiSetting === 'none') {
    return <NoLayout>{children}</NoLayout>;
  }

  if (uiSetting === 'minimal' || uiSetting === 'focus') {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return (
    <>
      <div
        className={`relative flex flex-row ${noShadedBg ? NOT_SHADED_BG : SHADED_BG} pb-14 md:pb-0`}
      >
        {!isReactNative ? <Sidenav disablePinning={true} /> : null}
        <div
          className={`relative flex min-h-screen w-full flex-col ${
            noShadedBg ? NOT_SHADED_BG : SHADED_BG
          }`}
        >
          <div className="min-h-full px-2 py-4 sm:px-10 sm:py-8">{children}</div>
        </div>
        {websocketDrives ? <Toaster drives={websocketDrives} /> : null}
      </div>
    </>
  );
};

export const MinimalLayout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useDarkMode();
  return (
    <>
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
      <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        {children}
      </div>
      <Toaster errorOnly={true} />
    </>
  );
};
