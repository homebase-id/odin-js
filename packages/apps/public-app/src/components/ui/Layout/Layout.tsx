import { FC, ReactNode, Suspense, lazy } from 'react';
import { useTheme } from '../../../hooks/theme/useTheme';
import { ScrollRestoration } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster, useOdinClientContext, useRawImage } from '@homebase-id/common-app';
import { GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { HomePageConfig } from '@homebase-id/js-lib/public';

const faviconSvg = (emoji: string) =>
  `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;

const Sidenav = lazy(() =>
  import('@homebase-id/common-app').then((commonApp) => ({ default: commonApp.Sidenav }))
);

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const isOwner = useOdinClientContext().isOwner();

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
            <Sidenav />
          </Suspense>
        ) : null}
        <div className={`flex min-h-screen w-full flex-grow flex-col`}>{children}</div>
      </div>
    </NoLayout>
  );
};

export const NoLayout: FC<LayoutProps> = ({ children }) => {
  const isOwner = useOdinClientContext().isOwner();
  const { colors, favicon, imageFileId } = useTheme();

  const { data: imageData } = useRawImage({
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
          </>
        )}
      </Helmet>
      {children}
      <Toaster errorOnly={!isOwner} />
    </>
  );
};
