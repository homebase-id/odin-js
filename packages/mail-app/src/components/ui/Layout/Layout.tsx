import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster, useDarkMode } from '@youfoundation/common-app';
import { MailSidenav } from '../../Sidenav/MailSidenav';

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
  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');

  if (uiSetting === 'none') return <NoLayout>{children}</NoLayout>;
  if (uiSetting === 'minimal' || uiSetting === 'focus')
    return <MinimalLayout>{children}</MinimalLayout>;

  return (
    <>
      <SharedStyleTag />
      <div className={`relative flex flex-row ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        <MailSidenav />
        <div
          className={`relative flex min-h-screen w-full flex-col ${
            noShadedBg ? NOT_SHADED_BG : SHADED_BG
          }`}
        >
          {children}
        </div>
        <Toaster />
      </div>
    </>
  );
};

export const MinimalLayout: FC<LayoutProps> = ({ children, noShadedBg, noPadding }) => {
  useDarkMode();
  return (
    <>
      <SharedStyleTag />
      <div className={`relative min-h-[100dvh] ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        <div className={`${noPadding ? '' : 'px-5 py-4 sm:px-10 sm:py-8'}`}>{children}</div>
      </div>
      <Toaster />
    </>
  );
};

export const NoLayout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();
  return (
    <>
      <SharedStyleTag />
      <div className={`relative min-h-[100dvh] ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        {children}
      </div>
      <Toaster />
    </>
  );
};

export default Layout;