import { FC, ReactNode, Suspense, lazy } from 'react';
import { useTheme } from '../../../hooks/theme/useTheme';
import { ScrollRestoration } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster, useDotYouClientContext, useRawImage } from '@homebase-id/common-app';
import { GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { HomePageConfig } from '@homebase-id/js-lib/public';

const faviconSvg = (emoji: string) =>
  `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`;

const Sidenav = lazy(() =>
  import('@homebase-id/common-app').then((commonApp) => ({ default: commonApp.Sidenav }))
);

const ROLE_OF_SITE_COLOR: Record<string, string> = {
  button: 'primary',
  'button-text': 'primary-contrast',
};

const mix = (foreground: string, background: string, amount: number) => {
  const bg = background.split(' ').map(Number);
  return foreground
    .split(' ')
    .map((c, i) => Math.round(Number(c) * amount + bg[i] * (1 - amount)))
    .join(' ');
};

// The roles an owner can't pick: the site's text mixed into its background by this much
const DERIVED_FROM_SITE_COLORS: Record<string, number> = {
  'muted-foreground': 0.6,
  outline: 0.45,
  'outline-variant': 0.2,
  'surface-container-lowest': 0,
  'surface-container-low': 0.04,
  'surface-container': 0.06,
  'surface-container-high': 0.08,
  'surface-container-highest': 0.12,
};

const siteColorVars = (row: Record<string, string>) =>
  Object.keys(row)
    .map((key) => `--color-${ROLE_OF_SITE_COLOR[key] ?? key}: ${row[key]};`)
    .concat(
      Object.keys(DERIVED_FROM_SITE_COLORS).map(
        (key) =>
          `--color-${key}: ${mix(row.foreground, row.background, DERIVED_FROM_SITE_COLORS[key])};`
      )
    )
    .join('');

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
