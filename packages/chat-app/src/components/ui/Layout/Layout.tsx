import { FC, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster, useDarkMode } from '@homebase-id/common-app';
import { websocketDrives } from '../../../hooks/auth/useAuth';

interface LayoutProps {
  children?: ReactNode;
  noShadedBg?: boolean;
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

export const Layout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');

  if (uiSetting === 'minimal' || uiSetting === 'focus')
    return <MinimalLayout>{children}</MinimalLayout>;

  return (
    <>
      <SharedStyleTag />
      <div
        className={`relative flex min-h-[100dvh] w-full flex-col ${
          noShadedBg ? NOT_SHADED_BG : SHADED_BG
        }`}
      >
        {children}
      </div>
      <Toaster drives={websocketDrives} />
    </>
  );
};

export const MinimalLayout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  useDarkMode();
  return (
    <>
      <SharedStyleTag />
      <div className={`relative min-h-[100dvh] ${noShadedBg ? NOT_SHADED_BG : SHADED_BG}`}>
        {children}
      </div>
      <Toaster drives={websocketDrives} errorOnly={true} />
    </>
  );
};
