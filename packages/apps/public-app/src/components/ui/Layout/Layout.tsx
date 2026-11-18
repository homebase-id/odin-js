import { FC, ReactNode, Suspense, lazy, useEffect, useState } from 'react';
import { useTheme } from '../../../hooks/theme/useTheme';
import { ScrollRestoration } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster, useDotYouClientContext, useRawImage } from '@homebase-id/common-app';
import { GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { HomePageConfig } from '@homebase-id/js-lib/public';
import { RGB_TRIPLE, siteColorVars } from './siteColorVars';

const faviconSvg = (emoji: string) =>
  `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;

const Sidenav = lazy(() =>
  import('@homebase-id/common-app').then((commonApp) => ({ default: commonApp.Sidenav }))
);

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const isOwner = useDotYouClientContext().isOwner();

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
  const isOwner = useDotYouClientContext().isOwner();
  const { colors, favicon, imageFileId } = useTheme();

  const { data: imageData } = useRawImage({
    imageFileId,
    imageFileKey: favicon && 'fileKey' in favicon ? favicon.fileKey : undefined,
    imageDrive: GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId),
  }).fetch;

  const [pageBackground, setPageBackground] = useState<string>();
  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setPageBackground(getComputedStyle(root).getPropertyValue('--color-page-background').trim());
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [colors]);

  useEffect(() => {
    if (!RGB_TRIPLE.test(pageBackground ?? '')) return;
    // The static index.html pair is only the first-paint fallback; the browser would keep using it
    document.querySelectorAll('meta[name="theme-color"][media]').forEach((m) => m.remove());
  }, [pageBackground]);

  const emojiFavicon = favicon && 'emoji' in favicon ? faviconSvg(favicon.emoji) : undefined;

  return (
    <>
      {colors ? (
        <style type="text/css">
          {`:root { ${siteColorVars(colors.light)} }`}
          {`html.dark { ${siteColorVars(colors.dark)} }`}
        </style>
      ) : null}
      <Helmet>
        {RGB_TRIPLE.test(pageBackground ?? '') ? (
          <meta name="theme-color" content={`rgb(${pageBackground!.replace(/ /g, ',')})`} />
        ) : null}
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
