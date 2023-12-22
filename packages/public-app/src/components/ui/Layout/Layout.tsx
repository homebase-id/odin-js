import { FC, ReactNode, Suspense, lazy } from 'react';
import { useTheme } from '../../../hooks/theme/useTheme';
import { useAuth } from '../../../hooks/auth/useAuth';
import { ScrollRestoration } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useImage } from '@youfoundation/common-app';
import { GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { HomePageConfig } from '@youfoundation/js-lib/public';

const faviconSvg = (emoji: string) =>
  `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;

const Sidenav = lazy(() =>
  import('@youfoundation/common-app').then((commonApp) => ({ default: commonApp.Sidenav }))
);

interface LayoutProps {
  children?: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const { isOwner, logout } = useAuth();

  return (
    <NoLayout>
      <ScrollRestoration />
      <div
        className={`relative flex flex-row bg-page-background text-foreground ${
          isOwner ? 'pb-14 md:pb-0' : ''
        }`}
      >
        {isOwner ? (
          <Suspense fallback={<></>}>
            <Sidenav logout={logout} />
          </Suspense>
        ) : null}
        <div className={`flex min-h-screen w-auto flex-grow flex-col`}>{children}</div>
      </div>
    </NoLayout>
  );
};

export const NoLayout: FC<LayoutProps> = ({ children }) => {
  const { colors, favicon, imageFileId } = useTheme();

  const { data: imageData } = useImage({
    imageFileId,
    imageFileKey: favicon && 'fileKey' in favicon ? favicon.fileKey : undefined,
    imageDrive: GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId),
  }).fetch;

  const emojiFavicon = favicon && 'emoji' in favicon ? faviconSvg(favicon.emoji) : undefined;

  return (
    <>
      <style type="text/css">
        {`:root {
            ${Object.keys(colors.light)
              .map((key) => `--color-${key}: ${colors.light[key]};`)
              .join('')}
          }`}
        {`html.dark {
            ${Object.keys(colors.dark)
              .map((key) => `--color-${key}: ${colors.dark[key]};`)
              .join('')}
          }`}
        {`html.dark { background-color: rgba(var(--color-page-background)); }`}
      </style>
      <Helmet>
        {imageData || emojiFavicon ? (
          <>
            <link rel="shortcut icon" href={imageData?.url || emojiFavicon}></link>
          </>
        ) : (
          <>
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
            <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
          </>
        )}
      </Helmet>
      {children}
    </>
  );
};

export default Layout;
