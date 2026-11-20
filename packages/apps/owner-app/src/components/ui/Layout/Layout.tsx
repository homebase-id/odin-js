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

const SHADED_BG = 'bg-page-background text-foreground';
const NOT_SHADED_BG = 'bg-surface-container-lowest text-foreground';

export const Layout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useLiveOwnerProcessor();

  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');

  if (uiSetting === 'none') return <NoLayout>{children}</NoLayout>;

  if (uiSetting === 'minimal' || uiSetting === 'focus')
    return <MinimalLayout>{children}</MinimalLayout>;

  return (
    <>
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
      <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        {children}
      </div>
      <Toaster drives={websocketDrives} errorOnly={true} />
      <CriticalOwnerAlerts />
    </>
  );
};
