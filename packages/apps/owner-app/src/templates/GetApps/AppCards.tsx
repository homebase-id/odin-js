import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t, ActionLink, HomebaseApp, HomebaseFileSync } from '@homebase-id/common-app';
import { Download, IconProps } from '@homebase-id/common-app/icons';
import {
  APP_STORE_URL,
  FILE_SYNC_DESKTOP,
  GET_APPS_PATH,
  GOOGLE_PLAY_URL,
  HOMEBASE_DESKTOP,
  getAppPlatform,
} from './appDownloads';
import { DesktopDownload } from './DesktopDownload';

const STORES = {
  ios: { label: 'App Store', href: APP_STORE_URL },
  android: { label: 'Google Play', href: GOOGLE_PLAY_URL },
};

const SecondaryLink = ({ href, children }: { href: string; children: ReactNode }) =>
  href.startsWith('/') ? (
    <Link className="text-primary hover:underline" to={href}>
      {children}
    </Link>
  ) : (
    <a className="text-primary hover:underline" href={href}>
      {children}
    </a>
  );

export const HomebaseAppCard = () => {
  const platform = getAppPlatform();

  return (
    <AppCard
      icon={HomebaseApp}
      name={t('Homebase')}
      what={t('Chat, moments, friends and your vault, in one app.')}
      why={t(
        'Get a notification the moment someone messages you, and have your Homebase in your pocket, not just in a browser tab.'
      )}
    >
      {platform === 'desktop' ? (
        <>
          <DesktopDownload app={HOMEBASE_DESKTOP} />
          <p className="text-sm text-slate-400">
            {t('On your phone:')} <SecondaryLink href={APP_STORE_URL}>App Store</SecondaryLink>
            {' · '}
            <SecondaryLink href={GOOGLE_PLAY_URL}>Google Play</SecondaryLink>
          </p>
        </>
      ) : (
        <>
          <ActionLink href={STORES[platform].href} icon={Download} className="w-full sm:w-auto">
            {t('Get it on')} {STORES[platform].label}
          </ActionLink>
          <p className="text-sm text-slate-400">
            {t('Also for Mac, Windows and Linux:')}{' '}
            <SecondaryLink href={GET_APPS_PATH}>{t('open this on your computer')}</SecondaryLink>
          </p>
        </>
      )}
    </AppCard>
  );
};

export const FileSyncAppCard = ({ showSetupHint }: { showSetupHint?: boolean }) => {
  const isDesktop = getAppPlatform() === 'desktop';

  return (
    <AppCard
      icon={HomebaseFileSync}
      name={t('File sync')}
      what={t('A folder on your computer that stays in sync with your Homebase.')}
      why={t(
        'Like Dropbox, but the files live on your own Homebase. Save a file in the folder and it is there, on every computer you sync.'
      )}
    >
      {isDesktop ? (
        <>
          <DesktopDownload app={FILE_SYNC_DESKTOP} />
          {showSetupHint ? (
            <p className="text-sm text-slate-400">
              {t(
                'File sync has no window. After installing, open it, then choose "Log in to Homebase…" from its icon in the menu bar or taskbar.'
              )}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-400">
          {t('For Mac, Windows and Linux. Open your owner console on your computer to install it.')}
        </p>
      )}
    </AppCard>
  );
};

const AppCard = ({
  icon: Icon,
  name,
  what,
  why,
  children,
}: {
  icon: FC<IconProps>;
  name: string;
  what: string;
  why: string;
  children: ReactNode;
}) => (
  <div className="flex h-full flex-col gap-4 rounded-lg bg-background p-5">
    <div className="flex flex-row items-center gap-4">
      <Icon className="h-14 w-14 flex-shrink-0 rounded-[22%] shadow-sm" />
      <div>
        <p className="text-lg font-medium">{name}</p>
        <p className="leading-snug text-foreground/70">{what}</p>
      </div>
    </div>
    <p className="text-sm text-slate-400">{why}</p>
    <div className="mt-auto flex flex-col gap-2">{children}</div>
  </div>
);
