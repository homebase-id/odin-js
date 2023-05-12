import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDarkMode, Toaster } from '@youfoundation/common-app';
import Sidenav from './Sidenav/Sidenav';

interface LayoutProps {
  children?: ReactNode;
  noShadedBg?: boolean;
  noPadding?: boolean;
}

const SHADED_BG = 'bg-[rgb(246,_248,_250)] dark:bg-gray-900 dark:text-gray-400';
const NOT_SHADED_BG = 'bg-white dark:bg-black';

const Layout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');

  if (uiSetting === 'none') {
    return <NoLayout>{children}</NoLayout>;
  }

  if (uiSetting === 'minimal' || uiSetting === 'focus') {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  return (
    <div className={`relative flex flex-row ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
      <Sidenav />
      <div className={`flex min-h-screen w-full flex-col`}>
        <div className="min-h-full px-2 py-4 sm:px-10 sm:py-8">{children}</div>
      </div>
      <Toaster />
    </div>
  );
};

export const MinimalLayout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useDarkMode();
  return (
    <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
      <div className={`${noPadding ? '' : 'px-5 py-4 sm:px-10 sm:py-8'}`}>{children}</div>
    </div>
  );
};

export const NoLayout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();
  return (
    <div className={`relative min-h-screen ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
      {children}
    </div>
  );
};

export default Layout;
