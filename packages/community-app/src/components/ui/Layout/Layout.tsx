import { FC, ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Toaster, useDarkMode } from '@homebase-id/common-app';
import { websocketDrives } from '../../../hooks/auth/useAuth';
import { getTargetDriveFromCommunityId } from '../../../providers/CommunityDefinitionProvider';
import { TargetDrive } from '@homebase-id/js-lib/core';

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

export const Layout: FC<LayoutProps> = ({ children, noShadedBg }) => {
  const [searchParams] = useSearchParams();
  const uiSetting = searchParams.get('ui');
  const { communityKey } = useParams();
  const targetDrive = getTargetDriveFromCommunityId(communityKey || '');

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
      <Toaster
        drives={
          [...websocketDrives, communityKey ? targetDrive : undefined].filter(
            Boolean
          ) as TargetDrive[]
        }
      />
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
      <Toaster errorOnly={true} />
    </>
  );
};
