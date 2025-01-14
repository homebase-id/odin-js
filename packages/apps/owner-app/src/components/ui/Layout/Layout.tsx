import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDarkMode, Toaster, Sidenav } from '@homebase-id/common-app';
import { CriticalOwnerAlerts } from '../../OwnerAlerts/CriticalOwnerAlerts';
import { websocketDrives } from '../../../hooks/auth/useAuth';
import { useLiveOwnerProcessor } from '../../../hooks/useLiveOwnerProcessor';

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
    --color-button: 99 101 241;
    --color-button-text: 255 255 255;
  }`}
    {`html.dark {
    --color-page-background: 17 24 39;
    --color-background: 0 0 0;
    --color-foreground: 250 250 250;
    --color-button: 99 101 141;
    --color-button-text: 255 255 255;
  }`}
    {`html.dark { background-color: rgba(var(--color-page-background)); }`}
  </style>
);

const SHADED_BG = 'bg-page-background text-foreground';
const NOT_SHADED_BG = 'bg-white dark:bg-black text-foreground';

export const Layout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useLiveOwnerProcessor();

  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');

  if (uiSetting === 'none') return <NoLayout>{children}</NoLayout>;

  if (uiSetting === 'minimal' || uiSetting === 'focus')
    return <MinimalLayout>{children}</MinimalLayout>;

  return (
    <>
      <SharedStyleTag />
      <div
        className={`relative flex flex-row ${noShadedBg ? NOT_SHADED_BG : SHADED_BG} pb-14 md:pb-0`}
      >
        <Sidenav />
        <div className={`flex min-h-screen w-full flex-col`}>
          <div className={`min-h-full ${noPadding ? '' : 'px-2 py-4 sm:px-10 sm:py-8'}`}>
            {children}
          </div>
        </div>
        <Toaster drives={websocketDrives} />
        <CriticalOwnerAlerts />
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
      <Toaster drives={websocketDrives} errorOnly={true} />
      <CriticalOwnerAlerts />
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
      <Toaster drives={websocketDrives} errorOnly={true} />
      <CriticalOwnerAlerts />
    </>
  );
};
